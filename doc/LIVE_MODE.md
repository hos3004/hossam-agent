# Live Mode (Gemini Bidirectional Voice)

Real-time, low-latency voice conversation powered by Gemini Live API.
When Live Mode is active, the microphone stream goes straight to Gemini
(bypassing local ASR), and Gemini's audio response is streamed back and
played on the client (bypassing the project's TTS engines).

## Enabling Live Mode (backend)

In `conf.yaml`:

```yaml
agent_config:
  conversation_agent_choice: 'gemini_live_agent'
  agent_settings:
    gemini_live_agent:
      api_key: 'YOUR_GEMINI_API_KEY'
      model: 'gemini-live-2.5-flash-preview'
      voice_name: 'Aoede'      # Aoede, Kore, Puck, Charon, Fenrir, Leda, Orus, Zephyr
      language_code: 'ar-XA'   # ar-XA for Arabic, en-US for English
      idle_timeout: 30
```

The standard `basic_memory_agent` path (LLM → TTS) remains available;
the frontend's "Live Mode" toggle simply tells the server which path to
use for the current session.

## WebSocket message protocol

Direction: **C2S** = client → server, **S2C** = server → client.

| Direction | type | Fields | Description |
|---|---|---|---|
| C2S | `toggle-live-mode` | `enable: bool` | Open or close the Gemini Live session for this client |
| C2S | `live-mic-audio` | `data` (base64 PCM 16-bit little-endian, 16 kHz mono) | Push a microphone chunk into the live session |
| C2S | `live-text-input` | `text: string` | Send a text turn during an active live session (interrupts the model) |
| S2C | `live-ready` | — | Live session is open and ready for audio |
| S2C | `live-audio` | `data` (base64 PCM 16-bit little-endian), `sample_rate: 24000` | Audio chunk from the model — play immediately |
| S2C | `live-input-transcript` | `text: string` | Partial transcription of what the user just said |
| S2C | `live-output-transcript` | `text: string` | Partial transcription of what the model is saying |
| S2C | `live-interrupted` | — | The model was interrupted — clear playback queue |
| S2C | `live-turn-complete` | — | The current turn ended |
| S2C | `live-stopped` | — | Live session was closed by the server |
| S2C | `live-error` | `message: string` | An error occurred — likely needs reconnection |

Audio formats are non-negotiable:
- **Input** (mic → server): PCM 16 kHz, mono, 16-bit signed little-endian, base64-encoded.
- **Output** (server → client): PCM 24 kHz, mono, 16-bit signed little-endian, base64-encoded.

## Frontend integration

The frontend is a git submodule, so this guide ships a drop-in helper
rather than touching submodule sources. Add the helper at
`frontend/src/services/gemini-live.ts` (path matches the standard
React/Vite layout used by the official frontend) and a "Live Mode" toggle
in the UI that calls `enable()`/`disable()`.

### Helper module

The full reference implementation lives in the Gemini lab and is
directly portable:

- WebSocket client: [`labs/gemini-live-voice-lab/src/lib/liveSession.ts`](../labs/gemini-live-voice-lab/src/lib/liveSession.ts)
- Mic capture + playback: [`labs/gemini-live-voice-lab/src/lib/audio.ts`](../labs/gemini-live-voice-lab/src/lib/audio.ts)

The differences when porting to the main project frontend:

1. **Reuse the existing WebSocket** instead of opening a separate one.
   The main project already has a session WS at `/client-ws`. Send the
   new `toggle-live-mode` / `live-mic-audio` / `live-text-input`
   messages through it.

2. **Message types are wrapped in the existing JSON envelope**:
   ```ts
   ws.send(JSON.stringify({ type: "toggle-live-mode", enable: true }));
   ```

3. **Audio events use `live-audio`, not `audio`** — the existing
   frontend already has playback paths for `audio` messages (the TTS
   path); Live Mode chunks come on a new channel so the two don't mix.

### Minimal browser helper (copy-paste)

```ts
// frontend/src/services/gemini-live.ts
//
// Tiny helper layered on top of the existing project WebSocket.
// Pass in `send` (your existing ws.send) and call enable()/disable().

const SR_IN = 16000;
const SR_OUT = 24000;

function float32ToBase64Pcm16(f32: Float32Array): string {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(i16.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64Pcm16ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
  return f32;
}

export class LiveMode {
  private ctxIn: AudioContext | null = null;
  private ctxOut: AudioContext;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private playing: AudioBufferSourceNode[] = [];

  constructor(private send: (msg: object) => void) {
    this.ctxOut = new AudioContext({ sampleRate: SR_OUT });
  }

  /** Open the live session and start streaming microphone. */
  async enable() {
    this.send({ type: "toggle-live-mode", enable: true });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SR_IN,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.ctxIn = new AudioContext({ sampleRate: SR_IN });
    const src = this.ctxIn.createMediaStreamSource(this.stream);
    const proc = this.ctxIn.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.send({
        type: "live-mic-audio",
        data: float32ToBase64Pcm16(input),
      });
    };
    src.connect(proc);
    proc.connect(this.ctxIn.destination);
    this.node = proc;
  }

  /** Close the live session and release the microphone. */
  async disable() {
    this.send({ type: "toggle-live-mode", enable: false });
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.ctxIn?.close();
    this.ctxIn = null;
    this.flush();
  }

  /** Call this from your WS message handler when a "live-audio" arrives. */
  enqueueAudio(b64: string) {
    if (this.ctxOut.state === "suspended") this.ctxOut.resume();
    const f32 = base64Pcm16ToFloat32(b64);
    const buf = this.ctxOut.createBuffer(1, f32.length, SR_OUT);
    buf.copyToChannel(f32, 0);
    const node = this.ctxOut.createBufferSource();
    node.buffer = buf;
    node.connect(this.ctxOut.destination);
    const startAt = Math.max(this.ctxOut.currentTime, this.nextStartTime);
    node.start(startAt);
    this.nextStartTime = startAt + buf.duration;
    node.onended = () => {
      const i = this.playing.indexOf(node);
      if (i >= 0) this.playing.splice(i, 1);
    };
    this.playing.push(node);
  }

  /** Call this on "live-interrupted" to stop playback immediately. */
  flush() {
    for (const n of this.playing) {
      try { n.stop(); } catch {}
    }
    this.playing = [];
    this.nextStartTime = this.ctxOut.currentTime;
  }
}
```

### Hooking into the existing message dispatcher

```ts
// somewhere in your WS message reducer:
switch (msg.type) {
  case "live-ready":             /* update UI to "live" */ break;
  case "live-audio":             liveMode.enqueueAudio(msg.data); break;
  case "live-input-transcript":  appendUserText(msg.text); break;
  case "live-output-transcript": appendAssistantText(msg.text); break;
  case "live-interrupted":       liveMode.flush(); break;
  case "live-turn-complete":     /* finalize transcript bubble */ break;
  case "live-stopped":           /* update UI to "idle" */ break;
  case "live-error":             showToast(msg.message); break;
}
```

## Live2D lip-sync in Live Mode

Lip-sync currently keys off the file-based audio path delivered by TTS.
In Live Mode the audio doesn't go through a file, so two options exist:

1. **Recommended (quick):** drive viseme amplitude from the playback
   buffer envelope on the client. Compute RMS of each `live-audio`
   chunk and feed it to `live2d.setMouthOpenY(rms * gain)`.
2. **Server-side (later):** have the server save concatenated turn
   audio to a temp wav and emit a `set-audio-source` event when the
   turn completes — the existing lip-sync code would then animate the
   model with a single delayed gesture. Not recommended for live feel.

The lab uses option 1 implicitly (no Live2D, just a pulsing UI ring).
For the main project, option 1 gives the most natural-feeling animation.

## Troubleshooting

- **`live-error: Current agent is not GeminiLiveAgent`** — Live Mode requires
  `conversation_agent_choice: gemini_live_agent`. Switch the conversation
  agent (via `switch-config` or by editing `conf.yaml`) before enabling.
- **No audio output** — confirm the browser allowed mic access *and* that
  the `AudioContext` was resumed inside a user-gesture (most browsers
  suspend audio contexts until the user clicks). Calling
  `ctxOut.resume()` on the first button press fixes this.
- **Choppy/garbled output** — the playback `AudioContext` must run at
  exactly 24000 Hz. Some Windows audio drivers refuse non-48 kHz contexts;
  in that case set `sampleRate: 48000` and resample each chunk on the
  fly (linear interpolation works fine for short PCM frames).
