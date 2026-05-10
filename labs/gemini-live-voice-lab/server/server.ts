import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GEMINI_KEY_ENV = 'GEMINI_API_KEY';

type BrowserMessage =
  | { type: 'connect'; model: string; voiceName: string; systemInstruction: string }
  | { type: 'audio'; base64: string }
  | { type: 'text'; text: string }
  | { type: 'disconnect' };

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function getServerKey() {
  return process.env[GEMINI_KEY_ENV];
}

async function startLiveSession(ws: WebSocket, message: Extract<BrowserMessage, { type: 'connect' }>) {
  const serverKey = getServerKey();
  if (!serverKey) {
    sendJson(ws, { type: 'error', message: `${GEMINI_KEY_ENV} is not configured on the server.` });
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: serverKey });
  return ai.live.connect({
    model: message.model,
    config: {
      systemInstruction: { parts: [{ text: message.systemInstruction }] },
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: message.voiceName } } },
    },
    callbacks: {
      onopen: () => sendJson(ws, { type: 'open' }),
      onclose: () => sendJson(ws, { type: 'close' }),
      onerror: (error) => sendJson(ws, { type: 'error', message: `Live API error: ${JSON.stringify(error)}` }),
      onmessage: (liveMessage: LiveServerMessage) => {
        const serverContent = liveMessage.serverContent;
        if (!serverContent) return;
        if (serverContent.interrupted) sendJson(ws, { type: 'interrupted' });
        if (serverContent.turnComplete) sendJson(ws, { type: 'turn_complete' });
        for (const part of serverContent.modelTurn?.parts || []) {
          const audioData = part.inlineData?.data;
          if (audioData) sendJson(ws, { type: 'audio', base64: audioData });
        }
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT || 3000);

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gemini-live-voice-lab' }));

  const wss = new WebSocketServer({ server: httpServer, path: '/ws/gemini-live' });
  wss.on('connection', (ws) => {
    let sessionPromise: Promise<any> | null = null;

    ws.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as BrowserMessage;

        if (message.type === 'connect') {
          if (sessionPromise) {
            sendJson(ws, { type: 'warn', message: 'A Gemini Live session is already active.' });
            return;
          }
          sendJson(ws, { type: 'message', message: 'Opening Gemini Live session...' });
          sessionPromise = startLiveSession(ws, message);
          await sessionPromise;
          return;
        }

        if (!sessionPromise) {
          sendJson(ws, { type: 'error', message: 'No active Gemini Live session. Connect first.' });
          return;
        }

        const session = await sessionPromise;
        if (!session) return;

        if (message.type === 'audio') {
          session.sendRealtimeInput({ audio: { data: message.base64, mimeType: 'audio/pcm;rate=16000' } });
          return;
        }

        if (message.type === 'text') {
          session.sendRealtimeInput({ text: message.text });
          return;
        }

        if (message.type === 'disconnect') {
          if (typeof session.close === 'function') session.close();
          sessionPromise = null;
          sendJson(ws, { type: 'close' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(ws, { type: 'error', message });
      }
    });

    ws.on('close', async () => {
      if (!sessionPromise) return;
      try {
        const session = await sessionPromise;
        if (session && typeof session.close === 'function') session.close();
      } catch {}
      sessionPromise = null;
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini Live Voice Lab running on http://localhost:${PORT}`);
    console.log('Gemini credential is used by the local server only.');
  });
}

startServer();
