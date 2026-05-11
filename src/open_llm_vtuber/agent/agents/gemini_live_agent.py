"""
Gemini Live agent — real-time bidirectional voice conversation.

Two operating modes:

1. Turn-based (chat()) — used by the normal BasicMemoryAgent path,
   accepts a BatchInput and yields one AudioOutput per turn.

2. Streaming (start_live_session/send_realtime_audio/stop_live_session) —
   used by the WebSocket handler's "Live Mode". Audio chunks flow in via
   send_realtime_audio(), and outgoing events (audio, transcripts,
   interruptions, turn boundaries) are pushed to a callback.

The streaming protocol mirrors the working pattern validated in
labs/gemini-live-voice-lab/server/index.ts.
"""

from __future__ import annotations

import asyncio
import wave
from pathlib import Path
from typing import AsyncIterator, Awaitable, Callable, Optional
from uuid import uuid4

from loguru import logger
from google import genai
from google.genai import types as genai_types

from .agent_interface import AgentInterface
from ..output_types import AudioOutput, Actions, DisplayText
from ..input_types import BatchInput


GEMINI_OUTPUT_SAMPLE_RATE = 24000
GEMINI_INPUT_SAMPLE_RATE = 16000

# Event callback signature: receives a dict like the lab's WS protocol.
LiveEventCallback = Callable[[dict], Awaitable[None]]


class GeminiLiveAgent(AgentInterface):
    """Gemini Live agent producing AudioOutput chunks (turn-based)
    and event streams (live mode)."""

    AGENT_TYPE = "gemini_live_agent"

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-live-2.5-flash-preview",
        voice_name: str = "Aoede",
        language_code: str = "ar-XA",
        system_instruction: Optional[str] = None,
        idle_timeout: int = 30,
    ):
        if not api_key:
            raise ValueError("Gemini Live requires api_key")

        self.model = model
        self.voice_name = voice_name
        self.language_code = language_code
        self.system_instruction = system_instruction
        self.idle_timeout = idle_timeout

        self.client = genai.Client(api_key=api_key)
        self._session_cm = None  # async context manager
        self._session = None  # the actual Session object
        self._connected = False

        # Buffers for the *current* model turn (PCM bytes + transcripts).
        self._current_pcm = bytearray()
        self._current_input_transcript = ""
        self._current_output_transcript = ""

        # Streaming mode bookkeeping
        self._listen_task: Optional[asyncio.Task] = None
        self._event_cb: Optional[LiveEventCallback] = None

        self.cache_dir = Path("./cache")
        self.cache_dir.mkdir(exist_ok=True)

        logger.info(
            f"Initialized Gemini Live agent — model={model}, voice={voice_name}, lang={language_code}"
        )

    # ----------------------------------------------------------------------
    # Session lifecycle
    # ----------------------------------------------------------------------
    def _build_config(self) -> genai_types.LiveConnectConfig:
        return genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name=self.voice_name
                    )
                ),
                language_code=self.language_code,
            ),
            system_instruction=(
                genai_types.Content(parts=[genai_types.Part(text=self.system_instruction)])
                if self.system_instruction
                else None
            ),
            input_audio_transcription=genai_types.AudioTranscriptionConfig(),
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
        )

    async def _ensure_connection(self):
        if self._connected and self._session is not None:
            return
        cm = self.client.aio.live.connect(model=self.model, config=self._build_config())
        self._session_cm = cm
        self._session = await cm.__aenter__()
        self._connected = True
        logger.info("Gemini Live connected")

    async def _close_connection(self):
        if self._session_cm is not None:
            try:
                await self._session_cm.__aexit__(None, None, None)
            except Exception as e:
                logger.warning(f"Error closing Gemini Live: {e}")
        self._session = None
        self._session_cm = None
        self._connected = False

    # ----------------------------------------------------------------------
    # Turn-based API (AgentInterface.chat)
    # ----------------------------------------------------------------------
    def _flush_turn_to_wav(self) -> Optional[str]:
        """Write the accumulated PCM into a wav file and return its path."""
        if not self._current_pcm:
            return None
        wav_path = self.cache_dir / f"gemini_live_{uuid4().hex}.wav"
        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(GEMINI_OUTPUT_SAMPLE_RATE)
            wf.writeframes(bytes(self._current_pcm))
        self._current_pcm = bytearray()
        return str(wav_path)

    async def chat(self, batch_input: BatchInput) -> AsyncIterator[AudioOutput]:
        """Send the user's text to Gemini Live and yield one AudioOutput per turn."""
        await self._ensure_connection()

        user_text = batch_input.texts[0].content if batch_input.texts else ""
        if user_text:
            await self._session.send_client_content(
                turns=genai_types.Content(
                    role="user", parts=[genai_types.Part(text=user_text)]
                ),
                turn_complete=True,
            )

        async for msg in self._session.receive():
            sc = msg.server_content
            if sc is None:
                continue
            if sc.model_turn is not None:
                for part in sc.model_turn.parts or []:
                    inline = getattr(part, "inline_data", None)
                    if inline and inline.data:
                        self._current_pcm.extend(inline.data)
            if sc.input_transcription and sc.input_transcription.text:
                self._current_input_transcript += sc.input_transcription.text
            if sc.output_transcription and sc.output_transcription.text:
                self._current_output_transcript += sc.output_transcription.text
            if sc.interrupted:
                self._current_pcm = bytearray()
                self._current_output_transcript = ""
                continue
            if sc.turn_complete:
                wav_path = self._flush_turn_to_wav()
                transcript = self._current_output_transcript or ""
                self._current_input_transcript = ""
                self._current_output_transcript = ""
                if wav_path:
                    yield AudioOutput(
                        audio_path=wav_path,
                        display_text=DisplayText(text=transcript),
                        transcript=transcript,
                        actions=Actions(),
                    )
                break

    # ----------------------------------------------------------------------
    # Streaming API (Live Mode in websocket_handler)
    # ----------------------------------------------------------------------
    async def start_live_session(self, on_event: LiveEventCallback) -> None:
        """Open the live session and start a background task that pushes
        every server event to ``on_event``.

        Events emitted:
            {"type": "ready"}
            {"type": "audio", "pcm": bytes}                  # 24kHz mono int16
            {"type": "input_transcript", "text": str}
            {"type": "output_transcript", "text": str}
            {"type": "interrupted"}
            {"type": "turn_complete"}
            {"type": "error", "message": str}
        """
        if self._listen_task is not None:
            logger.warning("Live session already active — ignoring start_live_session")
            return

        self._event_cb = on_event
        await self._ensure_connection()
        await on_event({"type": "ready"})
        self._listen_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self) -> None:
        try:
            async for msg in self._session.receive():
                if self._event_cb is None:
                    break
                sc = msg.server_content
                if sc is None:
                    continue

                # Audio chunks (forward raw PCM bytes; transport layer encodes)
                if sc.model_turn is not None:
                    for part in sc.model_turn.parts or []:
                        inline = getattr(part, "inline_data", None)
                        if inline and inline.data:
                            await self._event_cb(
                                {"type": "audio", "pcm": bytes(inline.data)}
                            )

                if sc.input_transcription and sc.input_transcription.text:
                    await self._event_cb(
                        {"type": "input_transcript", "text": sc.input_transcription.text}
                    )

                if sc.output_transcription and sc.output_transcription.text:
                    await self._event_cb(
                        {"type": "output_transcript", "text": sc.output_transcription.text}
                    )

                if sc.interrupted:
                    await self._event_cb({"type": "interrupted"})

                if sc.turn_complete:
                    await self._event_cb({"type": "turn_complete"})

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Gemini Live listen loop error: {e}")
            if self._event_cb is not None:
                try:
                    await self._event_cb({"type": "error", "message": str(e)})
                except Exception:
                    pass

    async def send_realtime_audio(self, pcm16_bytes: bytes) -> None:
        """Stream a microphone chunk (PCM 16kHz mono 16-bit little-endian)."""
        if not self._connected or self._session is None:
            return
        await self._session.send_realtime_input(
            audio=genai_types.Blob(
                data=pcm16_bytes,
                mime_type=f"audio/pcm;rate={GEMINI_INPUT_SAMPLE_RATE}",
            )
        )

    async def send_realtime_text(self, text: str) -> None:
        """Send a text turn while a live session is active (interrupts the model)."""
        if not self._connected or self._session is None:
            return
        await self._session.send_client_content(
            turns=genai_types.Content(role="user", parts=[genai_types.Part(text=text)]),
            turn_complete=True,
        )

    async def stop_live_session(self) -> None:
        """Cancel the background listener and close the Gemini session."""
        if self._listen_task is not None:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except (asyncio.CancelledError, Exception):
                pass
            self._listen_task = None
        self._event_cb = None
        await self._close_connection()

    @property
    def is_live_active(self) -> bool:
        return self._listen_task is not None and not self._listen_task.done()

    # ----------------------------------------------------------------------
    # AgentInterface odds and ends
    # ----------------------------------------------------------------------
    def handle_interrupt(self, heard_response: str) -> None:
        # Gemini Live handles interruption server-side via VAD.
        self._current_pcm = bytearray()
        self._current_output_transcript = ""

    def set_memory_from_history(self, conf_uid: str, history_uid: str) -> None:
        # Memory persistence not implemented; live agent relies on session-scoped context.
        pass

    async def aclose(self):
        await self.stop_live_session()

    def __del__(self):
        if self._connected:
            try:
                asyncio.get_event_loop().create_task(self._close_connection())
            except Exception:
                pass
