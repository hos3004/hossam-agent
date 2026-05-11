import base64
import os
import json
from uuid import uuid4
import numpy as np
from datetime import datetime
from fastapi import APIRouter, WebSocket, UploadFile, File, Response
from starlette.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect
from loguru import logger
from .service_context import ServiceContext
from .websocket_handler import WebSocketHandler
from .proxy_handler import ProxyHandler
from .agent.agents.gemini_live_agent import GeminiLiveAgent


def init_client_ws_route(default_context_cache: ServiceContext) -> APIRouter:
    """
    Create and return API routes for handling the `/client-ws` WebSocket connections.

    Args:
        default_context_cache: Default service context cache for new sessions.

    Returns:
        APIRouter: Configured router with WebSocket endpoint.
    """

    router = APIRouter()
    ws_handler = WebSocketHandler(default_context_cache)

    @router.websocket("/client-ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for client connections"""
        await websocket.accept()
        client_uid = str(uuid4())

        try:
            await ws_handler.handle_new_connection(websocket, client_uid)
            await ws_handler.handle_websocket_communication(websocket, client_uid)
        except WebSocketDisconnect:
            await ws_handler.handle_disconnect(client_uid)
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {e}")
            await ws_handler.handle_disconnect(client_uid)
            raise

    return router


def init_live_mode_route(default_context_cache: ServiceContext) -> APIRouter:
    """
    Dedicated `/live-ws` endpoint for Gemini Live Mode.

    Independent of the main `/client-ws` handler — each connection gets its
    own short-lived GeminiLiveAgent built from `agent_settings.gemini_live_agent`
    in the active config. This lets the user keep `basic_memory_agent` as the
    main conversation agent and still open a Live Mode session on demand.
    """
    router = APIRouter()

    @router.websocket("/live-ws")
    async def live_ws_endpoint(websocket: WebSocket):
        await websocket.accept()
        client_uid = str(uuid4())[:8]
        logger.info(f"Live-WS client connected: {client_uid}")

        settings = (
            default_context_cache.character_config.agent_config.agent_settings.gemini_live_agent
            if default_context_cache.character_config
            else None
        )
        if settings is None:
            await websocket.send_json(
                {
                    "type": "live-error",
                    "message": "gemini_live_agent is not configured in conf.yaml",
                }
            )
            await websocket.close()
            return

        # Use the constructed system prompt if available (skills are baked in there);
        # fall back to persona_prompt if not yet built.
        system_prompt = getattr(default_context_cache, "system_prompt", None)
        if not system_prompt:
            system_prompt = (
                default_context_cache.character_config.persona_prompt
                if default_context_cache.character_config
                else None
            )

        agent = GeminiLiveAgent(
            api_key=settings.api_key,
            model=settings.model,
            voice_name=settings.voice_name,
            language_code=settings.language_code,
            system_instruction=system_prompt,
            idle_timeout=settings.idle_timeout,
        )

        async def on_event(ev: dict) -> None:
            try:
                if ev["type"] == "audio":
                    payload = {
                        "type": "live-audio",
                        "data": base64.b64encode(ev["pcm"]).decode("ascii"),
                        "sample_rate": 24000,
                    }
                elif ev["type"] == "input_transcript":
                    payload = {"type": "live-input-transcript", "text": ev["text"]}
                elif ev["type"] == "output_transcript":
                    payload = {"type": "live-output-transcript", "text": ev["text"]}
                elif ev["type"] == "interrupted":
                    payload = {"type": "live-interrupted"}
                elif ev["type"] == "turn_complete":
                    payload = {"type": "live-turn-complete"}
                elif ev["type"] == "ready":
                    payload = {"type": "live-ready"}
                elif ev["type"] == "error":
                    payload = {"type": "live-error", "message": ev["message"]}
                else:
                    return
                await websocket.send_json(payload)
            except Exception as e:
                logger.warning(f"Live-WS {client_uid}: send failed: {e}")

        try:
            await agent.start_live_session(on_event)

            while True:
                msg = await websocket.receive_json()
                mtype = msg.get("type")

                if mtype == "live-mic-audio":
                    b64 = msg.get("data")
                    if b64:
                        try:
                            await agent.send_realtime_audio(base64.b64decode(b64))
                        except Exception as e:
                            logger.warning(f"Live-WS {client_uid}: audio failed: {e}")

                elif mtype == "live-text-input":
                    text = msg.get("text", "")
                    if text:
                        await agent.send_realtime_text(text)

                elif mtype == "stop":
                    break

                elif mtype == "ping":
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            logger.info(f"Live-WS client disconnected: {client_uid}")
        except Exception as e:
            logger.error(f"Live-WS {client_uid} error: {e}")
        finally:
            try:
                await agent.stop_live_session()
            except Exception as e:
                logger.warning(f"Live-WS {client_uid}: cleanup error: {e}")
            logger.info(f"Live-WS {client_uid} closed")

    return router


def init_proxy_route(server_url: str) -> APIRouter:
    """
    Create and return API routes for handling proxy connections.

    Args:
        server_url: The WebSocket URL of the actual server

    Returns:
        APIRouter: Configured router with proxy WebSocket endpoint
    """
    router = APIRouter()
    proxy_handler = ProxyHandler(server_url)

    @router.websocket("/proxy-ws")
    async def proxy_endpoint(websocket: WebSocket):
        """WebSocket endpoint for proxy connections"""
        try:
            await proxy_handler.handle_client_connection(websocket)
        except Exception as e:
            logger.error(f"Error in proxy connection: {e}")
            raise

    return router


def init_webtool_routes(default_context_cache: ServiceContext) -> APIRouter:
    """
    Create and return API routes for handling web tool interactions.

    Args:
        default_context_cache: Default service context cache for new sessions.

    Returns:
        APIRouter: Configured router with WebSocket endpoint.
    """

    router = APIRouter()

    @router.get("/web-tool")
    async def web_tool_redirect():
        """Redirect /web-tool to /web_tool/index.html"""
        return Response(status_code=302, headers={"Location": "/web-tool/index.html"})

    @router.get("/web_tool")
    async def web_tool_redirect_alt():
        """Redirect /web_tool to /web_tool/index.html"""
        return Response(status_code=302, headers={"Location": "/web-tool/index.html"})

    @router.get("/live2d-models/info")
    async def get_live2d_folder_info():
        """Get information about available Live2D models"""
        live2d_dir = "live2d-models"
        if not os.path.exists(live2d_dir):
            return JSONResponse(
                {"error": "Live2D models directory not found"}, status_code=404
            )

        valid_characters = []
        supported_extensions = [".png", ".jpg", ".jpeg"]

        for entry in os.scandir(live2d_dir):
            if entry.is_dir():
                folder_name = entry.name.replace("\\", "/")
                model3_file = os.path.join(
                    live2d_dir, folder_name, f"{folder_name}.model3.json"
                ).replace("\\", "/")

                if os.path.isfile(model3_file):
                    # Find avatar file if it exists
                    avatar_file = None
                    for ext in supported_extensions:
                        avatar_path = os.path.join(
                            live2d_dir, folder_name, f"{folder_name}{ext}"
                        )
                        if os.path.isfile(avatar_path):
                            avatar_file = avatar_path.replace("\\", "/")
                            break

                    valid_characters.append(
                        {
                            "name": folder_name,
                            "avatar": avatar_file,
                            "model_path": model3_file,
                        }
                    )
        return JSONResponse(
            {
                "type": "live2d-models/info",
                "count": len(valid_characters),
                "characters": valid_characters,
            }
        )

    @router.post("/asr")
    async def transcribe_audio(file: UploadFile = File(...)):
        """
        Endpoint for transcribing audio using the ASR engine
        """
        logger.info(f"Received audio file for transcription: {file.filename}")

        try:
            contents = await file.read()

            # Validate minimum file size
            if len(contents) < 44:  # Minimum WAV header size
                raise ValueError("Invalid WAV file: File too small")

            # Decode the WAV header and get actual audio data
            wav_header_size = 44  # Standard WAV header size
            audio_data = contents[wav_header_size:]

            # Validate audio data size
            if len(audio_data) % 2 != 0:
                raise ValueError("Invalid audio data: Buffer size must be even")

            # Convert to 16-bit PCM samples to float32
            try:
                audio_array = (
                    np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
                    / 32768.0
                )
            except ValueError as e:
                raise ValueError(
                    f"Audio format error: {str(e)}. Please ensure the file is 16-bit PCM WAV format."
                )

            # Validate audio data
            if len(audio_array) == 0:
                raise ValueError("Empty audio data")

            text = await default_context_cache.asr_engine.async_transcribe_np(
                audio_array
            )
            logger.info(f"Transcription result: {text}")
            return {"text": text}

        except ValueError as e:
            logger.error(f"Audio format error: {e}")
            return Response(
                content=json.dumps({"error": str(e)}),
                status_code=400,
                media_type="application/json",
            )
        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return Response(
                content=json.dumps(
                    {"error": "Internal server error during transcription"}
                ),
                status_code=500,
                media_type="application/json",
            )

    @router.websocket("/tts-ws")
    async def tts_endpoint(websocket: WebSocket):
        """WebSocket endpoint for TTS generation"""
        await websocket.accept()
        logger.info("TTS WebSocket connection established")

        try:
            while True:
                data = await websocket.receive_json()
                text = data.get("text")
                if not text:
                    continue

                logger.info(f"Received text for TTS: {text}")

                # Split text into sentences
                sentences = [s.strip() for s in text.split(".") if s.strip()]

                try:
                    # Generate and send audio for each sentence
                    for sentence in sentences:
                        sentence = sentence + "."  # Add back the period
                        file_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid4())[:8]}"
                        audio_path = (
                            await default_context_cache.tts_engine.async_generate_audio(
                                text=sentence, file_name_no_ext=file_name
                            )
                        )
                        logger.info(
                            f"Generated audio for sentence: {sentence} at: {audio_path}"
                        )

                        await websocket.send_json(
                            {
                                "status": "partial",
                                "audioPath": audio_path,
                                "text": sentence,
                            }
                        )

                    # Send completion signal
                    await websocket.send_json({"status": "complete"})

                except Exception as e:
                    logger.error(f"Error generating TTS: {e}")
                    await websocket.send_json({"status": "error", "message": str(e)})

        except WebSocketDisconnect:
            logger.info("TTS WebSocket client disconnected")
        except Exception as e:
            logger.error(f"Error in TTS WebSocket connection: {e}")
            await websocket.close()

    return router
