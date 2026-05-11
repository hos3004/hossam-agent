"""
Gemini TTS engine.

Uses google-genai to synthesize speech with prebuilt voices.
The model returns raw PCM 24kHz mono 16-bit; we wrap it into a .wav file
so Live2D lip-sync can read it like any other TTS output.

Models:
    gemini-2.5-flash-preview-tts   (fast, default)
    gemini-2.5-pro-preview-tts     (higher quality)

Voices: Aoede, Puck, Charon, Kore, Fenrir, Leda, Orus, Zephyr, ...
Languages: ar-XA, en-US, and 22+ more (see Gemini TTS docs).
"""

from __future__ import annotations

import struct
import wave
from pathlib import Path

from loguru import logger
from google import genai
from google.genai import types as genai_types

from .tts_interface import TTSInterface

# Gemini TTS output format
SAMPLE_RATE_HZ = 24000
SAMPLE_WIDTH_BYTES = 2  # 16-bit
NUM_CHANNELS = 1


class TTSEngine(TTSInterface):
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash-preview-tts",
        voice_name: str = "Kore",
        language_code: str = "ar-XA",
        style_prompt: str | None = None,
    ):
        if not api_key:
            raise ValueError("Gemini TTS requires api_key")

        self.model = model
        self.voice_name = voice_name
        self.language_code = language_code
        self.style_prompt = style_prompt
        self.client = genai.Client(api_key=api_key)

        logger.info(
            f"Initialized Gemini TTS — model={model}, voice={voice_name}, lang={language_code}"
        )

    def _build_prompt(self, text: str) -> str:
        if self.style_prompt:
            return f"{self.style_prompt}\n\n{text}"
        return text

    def generate_audio(self, text: str, file_name_no_ext=None) -> str:
        out_path = self.generate_cache_file_name(
            file_name_no_ext=file_name_no_ext, file_extension="wav"
        )
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=self._build_prompt(text),
                config=genai_types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=genai_types.SpeechConfig(
                        voice_config=genai_types.VoiceConfig(
                            prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                                voice_name=self.voice_name,
                            ),
                        ),
                        language_code=self.language_code,
                    ),
                ),
            )
        except Exception as e:
            logger.error(f"Gemini TTS request failed: {e}")
            raise

        # Extract raw PCM bytes from inline_data
        pcm_bytes = b""
        for cand in response.candidates or []:
            for part in cand.content.parts or []:
                inline = getattr(part, "inline_data", None)
                if inline and inline.data:
                    pcm_bytes += inline.data
        if not pcm_bytes:
            raise RuntimeError("Gemini TTS returned no audio data")

        # Wrap raw PCM into a proper .wav file
        with wave.open(out_path, "wb") as wf:
            wf.setnchannels(NUM_CHANNELS)
            wf.setsampwidth(SAMPLE_WIDTH_BYTES)
            wf.setframerate(SAMPLE_RATE_HZ)
            wf.writeframes(pcm_bytes)

        # sanity-check: ensure at least one full sample frame
        if Path(out_path).stat().st_size <= 44 + struct.calcsize("h"):
            raise RuntimeError("Gemini TTS produced an empty wav")

        return out_path
