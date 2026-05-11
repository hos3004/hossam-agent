"""
Gemini ASR — speech-to-text via Gemini's multimodal audio understanding.

Sends a short wav clip as inline_data with a minimal "transcribe" prompt and
returns the transcription. Works well for Arabic (and 100+ other languages).

This is the *non-Live* path used by BasicMemoryAgent. The Live agent
gets transcripts directly from the bidi stream and doesn't go through ASR.

Performance note:
    Recommended for clip-based recognition (after VAD endpointing).
    For continuous streaming, prefer Gemini Live or sherpa-onnx.
"""

from __future__ import annotations

import io
import wave

import numpy as np
from loguru import logger
from google import genai
from google.genai import types as genai_types

from .asr_interface import ASRInterface

DEFAULT_PROMPT = (
    "Transcribe the spoken content of the following audio. "
    "Return ONLY the transcription text, with no preamble, no commentary, "
    "no quotes, and no language label. If the audio is silent or unintelligible, "
    "return an empty string."
)


class VoiceRecognition(ASRInterface):
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        language: str | None = None,
        prompt: str | None = None,
    ):
        if not api_key:
            raise ValueError("Gemini ASR requires api_key")
        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.language = language
        self.prompt = prompt or DEFAULT_PROMPT
        if language:
            self.prompt = f"{self.prompt} The expected language is: {language}."

        logger.info(
            f"Initialized Gemini ASR — model={model}, language={language or 'auto'}"
        )

    def _np_to_wav_bytes(self, audio: np.ndarray) -> bytes:
        """Convert float32 numpy audio (mono) → WAV bytes at 16 kHz 16-bit."""
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)
        audio = np.clip(audio, -1.0, 1.0)
        pcm16 = (audio * 32767).astype(np.int16)

        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(self.NUM_CHANNELS)
            wf.setsampwidth(self.SAMPLE_WIDTH)
            wf.setframerate(self.SAMPLE_RATE)
            wf.writeframes(pcm16.tobytes())
        return buf.getvalue()

    def transcribe_np(self, audio: np.ndarray) -> str:
        if audio.size == 0:
            return ""

        wav_bytes = self._np_to_wav_bytes(audio)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    self.prompt,
                    genai_types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                ],
                config=genai_types.GenerateContentConfig(
                    temperature=0.0,
                ),
            )
        except Exception as e:
            logger.error(f"Gemini ASR request failed: {e}")
            return ""

        text = (response.text or "").strip()
        # Defensive: strip stray quotes if the model wrapped its answer
        if len(text) >= 2 and text[0] == text[-1] and text[0] in ('"', "'", "“", "”"):
            text = text[1:-1].strip()
        return text
