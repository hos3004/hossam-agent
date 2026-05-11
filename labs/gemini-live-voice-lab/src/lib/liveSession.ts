/**
 * ============================================================================
 * عميل WebSocket المتصفح ← الخادم الوسيط
 * ============================================================================
 *
 * هذا الصنف يُغلِّف WebSocket إلى /ws مع API بسيط:
 *   - start({ voice, language, systemInstruction })
 *   - sendAudio(base64Pcm16)
 *   - sendText(text)
 *   - stop()
 *
 * يعرض أحداث:
 *   - onReady          : الجلسة جاهزة لاستقبال الصوت
 *   - onAudio          : قطعة صوت من النموذج (base64 PCM 24kHz)
 *   - onInputText      : تفريغ كلام المستخدم
 *   - onOutputText     : تفريغ كلام النموذج
 *   - onInterrupted    : النموذج قُوطع
 *   - onTurnComplete   : انتهى الدور
 *   - onError          : خطأ
 *   - onClose          : أُغلِق الاتصال
 */

type Listener<T> = (payload: T) => void;

export class LiveSession {
  private ws: WebSocket | null = null;

  // أحداث
  onReady: Listener<void> = () => {};
  onAudio: Listener<string> = () => {};
  onInputText: Listener<string> = () => {};
  onOutputText: Listener<string> = () => {};
  onInterrupted: Listener<void> = () => {};
  onTurnComplete: Listener<void> = () => {};
  onError: Listener<string> = () => {};
  onClose: Listener<void> = () => {};

  async start(opts: {
    voice?: string;
    language?: string;
    systemInstruction?: string;
  } = {}) {
    return new Promise<void>((resolve, reject) => {
      const wsUrl =
        (location.protocol === "https:" ? "wss://" : "ws://") +
        location.host +
        "/ws";
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ type: "start", ...opts }));
        resolve();
      };

      this.ws.onerror = (e) => {
        this.onError("WebSocket error");
        reject(e);
      };

      this.ws.onclose = () => {
        this.onClose();
        this.ws = null;
      };

      this.ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          switch (m.type) {
            case "ready":            return this.onReady();
            case "audio":            return this.onAudio(m.data);
            case "input_transcript": return this.onInputText(m.text);
            case "output_transcript":return this.onOutputText(m.text);
            case "interrupted":      return this.onInterrupted();
            case "turn_complete":    return this.onTurnComplete();
            case "error":            return this.onError(m.message);
          }
        } catch (err) {
          console.error("فشل قراءة رسالة من الخادم:", err);
        }
      };
    });
  }

  sendAudio(base64Pcm16: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio", data: base64Pcm16 }));
    }
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  stop() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
      this.ws.close();
    }
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
