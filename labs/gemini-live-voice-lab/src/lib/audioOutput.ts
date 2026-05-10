export class AudioOutput {
  private ctx: AudioContext | null = null;

  async playBase64(base64: string): Promise<void> {
    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: 24000 });
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const float32 = this.pcmToFloat32(bytes.buffer);
    const buffer = this.ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start();
  }

  private pcmToFloat32(buffer: ArrayBuffer): Float32Array {
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    return float32;
  }

  close(): void {
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
  }
}
