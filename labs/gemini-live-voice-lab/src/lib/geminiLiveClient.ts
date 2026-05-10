export type ClientMessage =
  | { type: 'connect'; model: string; voiceName: string; systemInstruction: string }
  | { type: 'audio'; base64: string }
  | { type: 'text'; text: string }
  | { type: 'disconnect' };

export type ServerMessage =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'warn'; message: string }
  | { type: 'message'; message: string }
  | { type: 'error'; message: string }
  | { type: 'audio'; base64: string }
  | { type: 'interrupted' }
  | { type: 'turn_complete' };

export type MessageHandler = (msg: ServerMessage) => void;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private onMessage: MessageHandler | null = null;

  set onmessage(handler: MessageHandler) {
    this.onMessage = handler;
  }

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/gemini-live`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.onMessage?.({ type: 'open' });
    this.ws.onclose = () => this.onMessage?.({ type: 'close' });
    this.ws.onerror = () => this.onMessage?.({ type: 'error', message: 'WebSocket connection error' });

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as ServerMessage;
        this.onMessage?.(parsed);
      } catch {
        this.onMessage?.({ type: 'error', message: 'Failed to parse server message' });
      }
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}
