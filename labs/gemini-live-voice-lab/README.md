# Gemini Live Voice Lab

Isolated test lab for Gemini Live Audio API with Arabic voice support.

## Security

- **GEMINI_API_KEY is server-side only.** Never exposed to the frontend.
- The backend server (`server/server.ts`) reads `GEMINI_API_KEY` from `.env` and uses `@google/genai` to connect to Gemini Live.
- The frontend communicates only through a local WebSocket bridge at `/ws/gemini-live`.
- No API key, token, or credential endpoint exists in the frontend.

## Architecture

```
Browser (React SPA)           Node.js Server (Express + Vite)         Gemini API
       │                              │                                   │
       │  ws://localhost:3000/        │                                   │
       │  /ws/gemini-live             │  @google/genai live.connect()    │
       ├─────────────────────────────>├──────────────────────────────────>
       │  { type: "connect", ... }    │                                   │
       │  { type: "audio", base64 }   │  sendRealtimeInput()             │
       │  { type: "text", text }      │  sendRealtimeInput()             │
       │  { type: "disconnect" }      │  session.close()                 │
       │                              │                                   │
       │  <───────────────────────────├──────────────────────────────────│
       │  { type: "open" }            │  onopen                          │
       │  { type: "audio", base64 }   │  onmessage (audio data)          │
       │  { type: "turn_complete" }   │  onmessage (turn complete)       │
       │  { type: "close" }           │  onclose                         │
```

## Files

| File | Purpose |
|------|---------|
| `server/server.ts` | Secure WebSocket bridge — only place with `GEMINI_API_KEY` |
| `src/lib/geminiLiveClient.ts` | Browser WebSocket client — no Google SDK imports |
| `src/lib/audioInput.ts` | Microphone PCM capture at 16000 Hz |
| `src/lib/audioOutput.ts` | PCM audio playback |
| `src/components/VoiceLab.tsx` | Test UI for connect/disconnect/mic toggle |
| `vite.config.ts` | Vite SPA config |
| `.env.example` | Template for local `.env` (never committed) |

## How to Run

```bash
cd labs/gemini-live-voice-lab

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start dev server (serves both backend and frontend)
npm run dev
```

Open http://localhost:3000 in your browser.

## Manual Test

1. Click **Connect** — opens Gemini Live session.
2. Choose **Voice** (default: `Aoede`). Other options: `Puck`, `Charon`, `Fenrir`, `Leda`, `Orus`, `Kore`.
3. Enter **System Instruction** (default: Egyptian Arabic assistant).
4. Click **Start Mic** — speaks Arabic, Gemini responds with Arabic audio.
5. Click **Stop Mic** or **Disconnect** to end.

## Notes

- This lab is **isolated** from the main Open-LLM-VTuber app.
- Not wired into the main voice flow or avatar system yet.
- Audio format: PCM 16000 Hz 16-bit mono (input), PCM 24000 Hz (output from Gemini).
