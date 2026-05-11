/**
 * ============================================================================
 * مساعدات الصوت (Web Audio API)
 * ============================================================================
 *
 * 1. MicCapture — يفتح الميكروفون ويعيد قطعًا بصيغة PCM 16kHz mono 16-bit
 *                  بترميز base64 (هذا ما يطلبه Gemini Live للإدخال).
 *
 * 2. AudioPlayer — يستقبل قطعًا بصيغة PCM 24kHz mono 16-bit base64
 *                   ويشغلها بالترتيب مع دعم المقاطعة الفورية (interrupt).
 *
 * لماذا هذه المعدلات بالتحديد؟
 *   - الإدخال:  16000 Hz mono 16-bit PCM little-endian  (متطلب Gemini Live)
 *   - الإخراج:  24000 Hz mono 16-bit PCM little-endian  (ما يرسله النموذج)
 */

const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;

// ---------- مساعدات تحويل البيانات ----------

/** Float32Array (مدى ‎[-1, 1]‎) → Int16 PCM little-endian → base64 */
function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  // ArrayBuffer → binary string → base64
  const bytes = new Uint8Array(int16.buffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** base64 → Int16Array (PCM) → Float32Array (مدى ‎[-1, 1]‎) */
function base64Pcm16ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const f32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    f32[i] = int16[i] / 0x8000;
  }
  return f32;
}

// ============================================================================
// MicCapture — التقاط الميكروفون
// ============================================================================
export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | ScriptProcessorNode | null = null;
  private onChunk: (base64Pcm16: string) => void;

  constructor(onChunk: (base64Pcm16: string) => void) {
    this.onChunk = onChunk;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE_IN,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // ملاحظة: المتصفحات لا تضمن sampleRate المطلوب، لذا نُعيد التشكيل بأنفسنا
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE_IN });
    const source = this.ctx.createMediaStreamSource(this.stream);

    // ScriptProcessor مهجور لكنه أبسط بكثير من AudioWorklet ويعمل في كل المتصفحات
    // (في الإنتاج: استبدله بـ AudioWorklet)
    const processor = this.ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      // قد يكون sampleRate الفعلي للسياق مختلفًا — نُعيد التشكيل بسيطًا
      const resampled =
        this.ctx!.sampleRate === SAMPLE_RATE_IN
          ? input
          : resampleLinear(input, this.ctx!.sampleRate, SAMPLE_RATE_IN);
      this.onChunk(float32ToPcm16Base64(resampled));
    };

    source.connect(processor);
    processor.connect(this.ctx.destination); // لازم لتشغيل onaudioprocess
    this.node = processor;
  }

  stop() {
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close();
    this.ctx = null;
  }
}

/** إعادة تشكيل خطية بسيطة (Linear resampling) */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, input.length - 1);
    const t = srcIdx - lo;
    out[i] = input[lo] * (1 - t) + input[hi] * t;
  }
  return out;
}

// ============================================================================
// AudioPlayer — تشغيل الصوت القادم من النموذج
// ============================================================================
export class AudioPlayer {
  private ctx: AudioContext;
  private queue: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;

  constructor() {
    // ملاحظة: AudioContext جديد بمعدل عينات يطابق إخراج Gemini
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE_OUT });
  }

  /** أضف قطعة PCM base64 (24kHz mono 16-bit) إلى قائمة التشغيل */
  enqueue(base64Pcm16: string) {
    if (this.ctx.state === "suspended") this.ctx.resume();

    const f32 = base64Pcm16ToFloat32(base64Pcm16);
    const buffer = this.ctx.createBuffer(1, f32.length, SAMPLE_RATE_OUT);
    buffer.copyToChannel(f32, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const startAt = Math.max(now, this.nextStartTime);
    src.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    src.onended = () => {
      const i = this.queue.indexOf(src);
      if (i >= 0) this.queue.splice(i, 1);
    };
    this.queue.push(src);
  }

  /** أوقف كل ما هو قيد التشغيل (للمقاطعة عند بدء المستخدم بالكلام) */
  interrupt() {
    for (const src of this.queue) {
      try { src.stop(); } catch {}
    }
    this.queue = [];
    this.nextStartTime = this.ctx.currentTime;
  }

  /** هل هناك شيء يُشغَّل الآن؟ */
  get isPlaying(): boolean {
    return this.queue.length > 0;
  }

  close() {
    this.interrupt();
    this.ctx.close();
  }
}
