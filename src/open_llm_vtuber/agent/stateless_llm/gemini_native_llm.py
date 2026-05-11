"""
Native Gemini LLM provider using google-genai SDK.

Implements StatelessLLMInterface so it plugs into BasicMemoryAgent
through stateless_llm_factory.

References:
    - SDK: pip install google-genai
    - Docs: https://ai.google.dev/gemini-api/docs/get-started/python
    - Models: gemini-2.5-flash (default), gemini-2.5-pro, gemini-2.0-flash
"""

from typing import AsyncIterator, List, Dict, Any
from loguru import logger

from google import genai
from google.genai import types as genai_types

from .stateless_llm_interface import StatelessLLMInterface
from ...mcpp.types import ToolCallObject


class AsyncLLM(StatelessLLMInterface):
    """Native Gemini wrapper that streams text + emits tool calls."""

    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        llm_api_key: str = "",
        temperature: float = 1.0,
        **_ignored,
    ):
        if not llm_api_key:
            raise ValueError("Gemini llm_api_key is required")

        self.model = model
        self.temperature = temperature
        self.client = genai.Client(api_key=llm_api_key)
        self.support_tools = True

        logger.info(f"Initialized Native Gemini LLM: {self.model}")

    @staticmethod
    def _openai_msgs_to_gemini_contents(
        messages: List[Dict[str, Any]],
    ) -> List[genai_types.Content]:
        """Convert OpenAI-style chat messages → Gemini Content[].

        - role "user" / "assistant" → "user" / "model"
        - role "system" is hoisted out by the caller (system_instruction)
        """
        contents: List[genai_types.Content] = []
        for m in messages:
            role = m.get("role")
            if role == "system":
                continue
            text = m.get("content") or ""
            if not isinstance(text, str):
                # multimodal content not yet supported here
                text = str(text)
            mapped_role = "model" if role == "assistant" else "user"
            contents.append(
                genai_types.Content(
                    role=mapped_role,
                    parts=[genai_types.Part.from_text(text=text)],
                )
            )
        return contents

    @staticmethod
    def _openai_tools_to_gemini(
        tools: List[Dict[str, Any]] | None,
    ) -> List[genai_types.Tool] | None:
        """Convert MCP/OpenAI function specs → Gemini FunctionDeclaration."""
        if not tools:
            return None
        decls: List[genai_types.FunctionDeclaration] = []
        for t in tools:
            # MCP tools come in OpenAI format: {"type":"function","function":{...}}
            fn = t.get("function") if "function" in t else t
            decls.append(
                genai_types.FunctionDeclaration(
                    name=fn.get("name"),
                    description=fn.get("description", ""),
                    parameters=fn.get("parameters"),
                )
            )
        return [genai_types.Tool(function_declarations=decls)]

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        system: str | None = None,
        tools: List[Dict[str, Any]] | None = None,
    ) -> AsyncIterator[str | List[ToolCallObject]]:
        # Extract any system message from history (BasicMemoryAgent passes it via `system`)
        sys_text = system
        if not sys_text:
            for m in messages:
                if m.get("role") == "system":
                    sys_text = m.get("content")
                    break

        gemini_tools = self._openai_tools_to_gemini(tools) if self.support_tools else None
        config = genai_types.GenerateContentConfig(
            temperature=self.temperature,
            system_instruction=sys_text or None,
            tools=gemini_tools,
        )
        contents = self._openai_msgs_to_gemini_contents(messages)

        try:
            stream = await self.client.aio.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=config,
            )

            accumulated_calls: list[dict] = []
            async for chunk in stream:
                # 1) tool / function calls
                fcs = getattr(chunk, "function_calls", None)
                if fcs:
                    for i, fc in enumerate(fcs):
                        accumulated_calls.append(
                            {
                                "index": i,
                                "id": getattr(fc, "id", None) or f"call_{i}",
                                "type": "function",
                                "function": {
                                    "name": fc.name,
                                    "arguments": (
                                        # FunctionCall.args is dict; ToolCallObject expects JSON string
                                        __import__("json").dumps(dict(fc.args or {}))
                                    ),
                                },
                            }
                        )
                    continue

                # 2) regular text
                text = getattr(chunk, "text", None)
                if text:
                    yield text

            # Emit collected tool calls at the very end of the stream
            if accumulated_calls:
                yield [ToolCallObject.from_dict(c) for c in accumulated_calls]

        except Exception as e:
            msg = str(e)
            if "function" in msg.lower() and "not supported" in msg.lower():
                self.support_tools = False
                logger.warning(f"{self.model} doesn't support tools — disabling.")
                yield "__API_NOT_SUPPORT_TOOLS__"
                return
            logger.error(f"Gemini LLM error: {e}")
            yield (
                "Error calling the Gemini chat endpoint. "
                "Check the API key, model name, and network. See logs for details."
            )
