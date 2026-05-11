"""
Gemini-backed translator for the TTS preprocessor.

Used when ``translator_config.translate_audio`` is true and the user wants the
spoken language to differ from the displayed text. Uses a light Gemini model
with a strict "translation only" prompt.
"""

from loguru import logger
from google import genai
from google.genai import types as genai_types

from .translate_interface import TranslateInterface


class GeminiTranslate(TranslateInterface):
    def __init__(
        self,
        api_key: str,
        target_lang: str,
        source_lang: str | None = None,
        model: str = "gemini-2.5-flash-lite",
    ):
        if not api_key:
            raise ValueError("Gemini translator requires api_key")
        self.client = genai.Client(api_key=api_key)
        self.target_lang = target_lang
        self.source_lang = source_lang
        self.model = model
        logger.info(
            f"Initialized Gemini Translator — model={model}, target={target_lang}, source={source_lang or 'auto'}"
        )

    def _build_prompt(self, text: str) -> str:
        if self.source_lang:
            head = f"Translate from {self.source_lang} to {self.target_lang}."
        else:
            head = f"Translate the following text to {self.target_lang}."
        return (
            f"{head} "
            "Output ONLY the translated text — no preamble, no quotes, "
            "no language tags, no commentary.\n\n"
            f"{text}"
        )

    def translate(self, text: str) -> str:
        if not text.strip():
            return text
        try:
            resp = self.client.models.generate_content(
                model=self.model,
                contents=self._build_prompt(text),
                config=genai_types.GenerateContentConfig(temperature=0.0),
            )
            out = (resp.text or "").strip()
            # Strip stray surrounding quotes
            if len(out) >= 2 and out[0] == out[-1] and out[0] in ('"', "'", "“", "”"):
                out = out[1:-1].strip()
            return out or text
        except Exception as e:
            logger.error(f"Gemini translate failed: {e}")
            return text
