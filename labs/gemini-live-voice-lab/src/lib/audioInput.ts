export type AudioInputCallbacks = {
  onChunk: (base64: string) => void;
  onError: (error: string) => void;
};

export class AudioInput {
  private stream: MediaStream | null = null;
  private recorder: ScriptProcessorNode | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private callbacks: AudioInputCallbacks;
  private running = false;

  constructor(callbacks: AudioInputCallbacks) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.ctx = new AudioContext({ sampleRate: 16000 });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1;

    this.recorder = this.ctx.createScriptProcessor(4096, 1, 1);
    this.source.connect(this.gain);
    this.gain.connect(this.recorder);
    this.recorder.connect(this.ctx.destination);

    this.running = true;
    this.recorder.onaudioprocess = (e) => {
      if (!this.running) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = this.float32ToPcm(input);
      this.callbacks.onChunk(this.arrayBufferToBase64(pcm));
    };
  }

  stop(): void {
    this.running = false;
    if (this.recorder) {
      this.recorder.disconnect();
      this.recorder = null;
    }
    if (this.gain) { this.gain.disconnect(); this.gain = null; }
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  private float32ToPcm(float32: Float32Array): Int16Array {
    const pcm = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
}
