/*
 * Gemini Live Mode Overlay
 * ------------------------
 * Floating button injected into the main app page. It opens a dedicated
 * WebSocket to /live-ws (independent of /client-ws), streams the microphone
 * to Gemini Live, and plays back the model's voice.
 *
 * Wire protocol matches doc/LIVE_MODE.md.
 */
(function () {
  "use strict";
  if (window.__geminiLiveOverlayLoaded) return;
  window.__geminiLiveOverlayLoaded = true;

  const SR_IN = 16000;
  const SR_OUT = 24000;

  // ---------------------------------------------------------------------------
  // Audio helpers
  // ---------------------------------------------------------------------------
  function float32ToBase64Pcm16(f32) {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(i16.buffer);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  function base64Pcm16ToFloat32(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
    return f32;
  }

  function resampleLinear(input, fromRate, toRate) {
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

  // ---------------------------------------------------------------------------
  // Best-effort Live2D lip-sync: drives the mouth parameter based on PCM RMS
  // ---------------------------------------------------------------------------
  const lipSync = {
    enabled: true,
    model: null,
    currentLevel: 0,
    findModel() {
      // Common globals exposed by the Open-LLM-VTuber frontend / pixi-live2d-display
      try {
        if (window.live2dModel) return window.live2dModel;
        if (window.__pixiLive2dModel) return window.__pixiLive2dModel;
        if (window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) {
          const inst = window.PIXI.live2d.Live2DModel.__instance;
          if (inst) return inst;
        }
      } catch (_) {}
      return null;
    },
    pump(rms) {
      if (!this.enabled) return;
      this.model = this.model || this.findModel();
      const m = this.model;
      if (!m) return;
      // Smooth: ease toward the new level so we don't get jitter
      this.currentLevel = this.currentLevel * 0.6 + rms * 0.4;
      const v = Math.min(1, this.currentLevel * 4);
      try {
        const core = m.internalModel && m.internalModel.coreModel;
        if (core && typeof core.setParameterValueById === "function") {
          core.setParameterValueById("ParamMouthOpenY", v);
        } else if (typeof m.setMouthOpenY === "function") {
          m.setMouthOpenY(v);
        }
      } catch (_) {}
    },
    reset() {
      this.currentLevel = 0;
      const m = this.model;
      if (!m) return;
      try {
        const core = m.internalModel && m.internalModel.coreModel;
        if (core && typeof core.setParameterValueById === "function") {
          core.setParameterValueById("ParamMouthOpenY", 0);
        }
      } catch (_) {}
    },
  };

  function pcmRms(f32) {
    let sum = 0;
    for (let i = 0; i < f32.length; i++) sum += f32[i] * f32[i];
    return Math.sqrt(sum / Math.max(1, f32.length));
  }

  // ---------------------------------------------------------------------------
  // LiveSession — WebSocket client + mic capture + audio playback
  // ---------------------------------------------------------------------------
  class LiveSession {
    constructor(opts) {
      this.opts = opts || {};
      this.ws = null;
      this.micStream = null;
      this.micCtx = null;
      this.micNode = null;
      this.playCtx = null;
      this.queue = [];
      this.nextStartTime = 0;
      this.state = "idle"; // idle | connecting | live | error
    }

    async start() {
      this._setState("connecting");
      try {
        // Open the dedicated /live-ws endpoint
        const wsUrl =
          (location.protocol === "https:" ? "wss://" : "ws://") +
          location.host +
          "/live-ws";
        this.ws = new WebSocket(wsUrl);
        this.ws.onopen = () => {
          this.ws.send(
            JSON.stringify({
              type: "start",
              voice: this.opts.voice,
              language: this.opts.language,
            })
          );
        };
        this.ws.onmessage = (e) => this._onMessage(e);
        this.ws.onerror = () => this._setState("error", "WebSocket error");
        this.ws.onclose = () => this._setState("idle");

        // Open mic
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.micCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = this.micCtx.createMediaStreamSource(this.micStream);
        const proc = this.micCtx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const resampled =
            this.micCtx.sampleRate === SR_IN
              ? input
              : resampleLinear(input, this.micCtx.sampleRate, SR_IN);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: "live-mic-audio",
                data: float32ToBase64Pcm16(resampled),
              })
            );
          }
        };
        src.connect(proc);
        proc.connect(this.micCtx.destination);
        this.micNode = proc;

        // Playback context
        this.playCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SR_OUT,
        });
        if (this.playCtx.state === "suspended") this.playCtx.resume();
      } catch (e) {
        this._setState("error", e && e.message ? e.message : String(e));
        await this.stop();
      }
    }

    async stop() {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "stop" }));
        }
        if (this.ws) this.ws.close();
      } catch (_) {}
      this.ws = null;
      try {
        if (this.micNode) this.micNode.disconnect();
      } catch (_) {}
      this.micNode = null;
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => t.stop());
        this.micStream = null;
      }
      try {
        if (this.micCtx) await this.micCtx.close();
      } catch (_) {}
      this.micCtx = null;
      this._flushPlayback();
      try {
        if (this.playCtx) await this.playCtx.close();
      } catch (_) {}
      this.playCtx = null;
      lipSync.reset();
      this._setState("idle");
    }

    _onMessage(e) {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch (_) {
        return;
      }
      switch (m.type) {
        case "live-ready":
          this._setState("live");
          break;
        case "live-audio":
          this._enqueueAudio(m.data);
          break;
        case "live-input-transcript":
          if (this.opts.onInputText) this.opts.onInputText(m.text);
          break;
        case "live-output-transcript":
          if (this.opts.onOutputText) this.opts.onOutputText(m.text);
          break;
        case "live-interrupted":
          this._flushPlayback();
          break;
        case "live-turn-complete":
          if (this.opts.onTurnComplete) this.opts.onTurnComplete();
          break;
        case "live-error":
          this._setState("error", m.message);
          break;
      }
    }

    _enqueueAudio(b64) {
      if (!this.playCtx) return;
      if (this.playCtx.state === "suspended") this.playCtx.resume();
      const f32 = base64Pcm16ToFloat32(b64);

      // Lip-sync from RMS of this chunk
      lipSync.pump(pcmRms(f32));

      const buf = this.playCtx.createBuffer(1, f32.length, SR_OUT);
      buf.copyToChannel(f32, 0);
      const node = this.playCtx.createBufferSource();
      node.buffer = buf;
      node.connect(this.playCtx.destination);
      const now = this.playCtx.currentTime;
      const startAt = Math.max(now, this.nextStartTime);
      node.start(startAt);
      this.nextStartTime = startAt + buf.duration;
      node.onended = () => {
        const i = this.queue.indexOf(node);
        if (i >= 0) this.queue.splice(i, 1);
        if (this.queue.length === 0) lipSync.reset();
      };
      this.queue.push(node);
    }

    _flushPlayback() {
      for (const n of this.queue) {
        try {
          n.stop();
        } catch (_) {}
      }
      this.queue = [];
      this.nextStartTime = this.playCtx ? this.playCtx.currentTime : 0;
      lipSync.reset();
    }

    _setState(state, errMsg) {
      this.state = state;
      if (this.opts.onState) this.opts.onState(state, errMsg);
    }
  }

  // ---------------------------------------------------------------------------
  // Floating UI
  // ---------------------------------------------------------------------------
  function injectStyles() {
    const css = `
      .gl-overlay-root {
        position: fixed; right: 18px; bottom: 18px; z-index: 999999;
        font-family: -apple-system, "Segoe UI", Tahoma, "Cairo", sans-serif;
        direction: ltr;
      }
      .gl-btn {
        width: 64px; height: 64px; border-radius: 50%; border: 0; cursor: pointer;
        background: rgba(99, 102, 241, .15); color: #c7d2fe;
        box-shadow: 0 0 0 3px rgba(99,102,241,.5), 0 10px 30px rgba(0,0,0,.45);
        display: flex; align-items: center; justify-content: center;
        transition: transform .15s ease, box-shadow .25s ease, background .25s ease;
        position: relative;
      }
      .gl-btn:hover { transform: scale(1.05); }
      .gl-btn.live {
        background: rgba(16,185,129,.22); color: #a7f3d0;
        box-shadow: 0 0 0 3px rgba(16,185,129,.7), 0 10px 30px rgba(0,0,0,.45);
      }
      .gl-btn.connecting {
        background: rgba(245,158,11,.22); color: #fcd34d;
        box-shadow: 0 0 0 3px rgba(245,158,11,.7), 0 10px 30px rgba(0,0,0,.45);
      }
      .gl-btn.error {
        background: rgba(244,63,94,.22); color: #fda4af;
        box-shadow: 0 0 0 3px rgba(244,63,94,.7), 0 10px 30px rgba(0,0,0,.45);
      }
      .gl-pulse {
        position: absolute; inset: -8px; border-radius: 50%;
        border: 3px solid rgba(16,185,129,.6); opacity: 0; pointer-events: none;
      }
      .gl-btn.live .gl-pulse { animation: glPulse 1.4s ease-out infinite; }
      @keyframes glPulse {
        0% { transform: scale(.85); opacity: .9; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      .gl-toast {
        position: absolute; right: 72px; bottom: 8px; min-width: 220px; max-width: 360px;
        background: rgba(15,23,42,.92); color: #e2e8f0; padding: 10px 12px;
        border-radius: 12px; border: 1px solid rgba(148,163,184,.25);
        font-size: 12px; line-height: 1.4; opacity: 0; pointer-events: none;
        transition: opacity .2s ease;
      }
      .gl-toast.show { opacity: 1; }
      .gl-toast .who { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2px; }
      .gl-toast .err { color: #fda4af; }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  const ICON_MIC = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
  const ICON_STOP = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>`;
  const ICON_SPIN = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.55"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>`;

  function injectUI() {
    injectStyles();

    const root = document.createElement("div");
    root.className = "gl-overlay-root";
    root.dir = "ltr";

    const btn = document.createElement("button");
    btn.className = "gl-btn";
    btn.title = "Live Mode (Gemini)";
    btn.innerHTML = ICON_MIC + `<span class="gl-pulse"></span>`;

    const toast = document.createElement("div");
    toast.className = "gl-toast";
    toast.innerHTML = `<div class="who">…</div><div class="msg"></div>`;

    root.appendChild(toast);
    root.appendChild(btn);
    document.body.appendChild(root);

    let toastTimer = null;
    function showToast(who, msg, isErr) {
      toast.querySelector(".who").textContent = who;
      const m = toast.querySelector(".msg");
      m.textContent = msg;
      m.className = "msg" + (isErr ? " err" : "");
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
    }

    let session = null;

    function setIcon(state) {
      btn.classList.remove("live", "connecting", "error");
      const pulse = `<span class="gl-pulse"></span>`;
      if (state === "live") {
        btn.classList.add("live");
        btn.innerHTML = ICON_STOP + pulse;
      } else if (state === "connecting") {
        btn.classList.add("connecting");
        btn.innerHTML = ICON_SPIN + pulse;
      } else if (state === "error") {
        btn.classList.add("error");
        btn.innerHTML = ICON_MIC + pulse;
      } else {
        btn.innerHTML = ICON_MIC + pulse;
      }
    }

    async function toggle() {
      if (session && (session.state === "live" || session.state === "connecting")) {
        await session.stop();
        session = null;
        return;
      }
      session = new LiveSession({
        onState: (state, errMsg) => {
          setIcon(state);
          if (state === "error" && errMsg) showToast("Error", errMsg, true);
          if (state === "live") showToast("Live", "Listening…", false);
        },
        onInputText: (t) => showToast("You", t, false),
        onOutputText: (t) => showToast("Gemini", t, false),
      });
      await session.start();
    }

    btn.addEventListener("click", toggle);
  }

  // Wait for DOM ready, then inject
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectUI);
  } else {
    injectUI();
  }
})();
