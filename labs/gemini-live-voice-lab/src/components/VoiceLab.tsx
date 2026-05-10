import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient, ServerMessage } from '../lib/geminiLiveClient';
import { AudioInput } from '../lib/audioInput';
import { AudioOutput } from '../lib/audioOutput';

type Status = 'idle' | 'connecting' | 'connected' | 'error';

export default function VoiceLab() {
  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [micActive, setMicActive] = useState(false);
  const [model, setModel] = useState('gemini-2.0-flash-live-001');
  const [voice, setVoice] = useState('Aoede');
  const [instruction, setInstruction] = useState(
    'You are a helpful Arabic-speaking assistant. Speak naturally in Egyptian Arabic.'
  );

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioInputRef = useRef<AudioInput | null>(null);
  const audioOutputRef = useRef<AudioOutput | null>(null);
  const logsRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    logsRef.current = [...logsRef.current, `[${ts}] ${msg}`];
    setLogs([...logsRef.current]);
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'open':
        addLog('Session opened');
        setStatus('connected');
        break;
      case 'close':
        addLog('Session closed');
        setStatus('idle');
        break;
      case 'warn':
        addLog(`WARN: ${msg.message}`);
        break;
      case 'message':
        addLog(`INFO: ${msg.message}`);
        break;
      case 'error':
        addLog(`ERROR: ${msg.message}`);
        setStatus('error');
        break;
      case 'audio':
        audioOutputRef.current?.playBase64(msg.base64);
        break;
      case 'interrupted':
        addLog('Interrupted');
        break;
      case 'turn_complete':
        addLog('Turn complete');
        break;
    }
  }, [addLog]);

  const handleConnect = useCallback(async () => {
    setStatus('connecting');
    addLog('Connecting...');

    const client = new GeminiLiveClient();
    client.onmessage = handleServerMessage;
    clientRef.current = client;
    client.connect();

    await new Promise<void>((resolve) => {
      const check = () => {
        if (client.readyState === WebSocket.OPEN) {
          client.send({ type: 'connect', model, voiceName: voice, systemInstruction: instruction });
          resolve();
        } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
          addLog('WebSocket failed to open');
          setStatus('error');
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 100);
    });
  }, [model, voice, instruction, handleServerMessage, addLog]);

  const handleDisconnect = useCallback(() => {
    if (micActive) {
      audioInputRef.current?.stop();
      setMicActive(false);
    }
    clientRef.current?.send({ type: 'disconnect' });
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
    addLog('Disconnected');
  }, [micActive, addLog]);

  const toggleMic = useCallback(async () => {
    if (micActive) {
      audioInputRef.current?.stop();
      audioInputRef.current = null;
      setMicActive(false);
      addLog('Microphone stopped');
      return;
    }

    try {
      const input = new AudioInput({
        onChunk: (base64) => {
          clientRef.current?.send({ type: 'audio', base64 });
        },
        onError: (err) => addLog(`Mic error: ${err}`),
      });
      await input.start();
      audioInputRef.current = input;
      setMicActive(true);
      addLog('Microphone started');
    } catch (err) {
      addLog(`Failed to start microphone: ${err}`);
    }
  }, [micActive, addLog]);

  useEffect(() => {
    audioOutputRef.current = new AudioOutput();
    return () => {
      audioOutputRef.current?.close();
      clientRef.current?.disconnect();
      audioInputRef.current?.stop();
    };
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>Gemini Live Voice Lab</h1>
      <p style={{ color: '#666' }}>Test Gemini Live Audio API with Arabic voice</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
        <label>
          Model:
          <input value={model} onChange={(e) => setModel(e.target.value)} style={{ marginLeft: 8, width: 300 }} />
        </label>
        <label>
          Voice:
          <input value={voice} onChange={(e) => setVoice(e.target.value)} style={{ marginLeft: 8, width: 300 }} />
        </label>
        <label>
          System Instruction:
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            style={{ marginLeft: 8, width: 300, verticalAlign: 'top' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
        <button
          onClick={handleConnect}
          disabled={status === 'connecting' || status === 'connected'}
          style={{ padding: '0.5rem 1rem' }}
        >
          Connect
        </button>
        <button
          onClick={handleDisconnect}
          disabled={status !== 'connected'}
          style={{ padding: '0.5rem 1rem' }}
        >
          Disconnect
        </button>
        <button
          onClick={toggleMic}
          disabled={status !== 'connected'}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: micActive ? '#e74c3c' : '#2ecc71',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
          }}
        >
          {micActive ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <strong>Status:</strong>{' '}
        <span style={{ color: status === 'connected' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#888' }}>
          {status}
        </span>
        {micActive && <span style={{ marginLeft: 8, color: '#e67e22' }}>🎙️ Mic active</span>}
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: 6,
          height: 300,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}
      >
        {logs.length === 0 ? 'No logs yet. Connect to start.' : logs.join('\n')}
      </div>
    </div>
  );
}
