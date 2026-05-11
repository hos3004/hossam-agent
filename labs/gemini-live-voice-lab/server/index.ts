/**
 * ============================================================================
 * خادم وسيط (Backend Proxy) بين المتصفح و Gemini Live API
 * ============================================================================
 *
 * المهمة:
 *   1. يستضيف منفذ HTTP (افتراضيًا 3000) ومنفذ WebSocket على نفس الخادم.
 *   2. عند اتصال المتصفح بـ /ws، يفتح جلسة Gemini Live بمفتاح API السري،
 *      ثم يمرر الرسائل في الاتجاهين (audio in / audio out / transcripts).
 *   3. مفتاح GEMINI_API_KEY يبقى داخل هذا الخادم — لا يصل المتصفح أبدًا.
 *
 * بروتوكول الرسائل (JSON عبر WebSocket):
 *
 *   من المتصفح → الخادم:
 *     { type: "start", systemInstruction?, voice?, language? }   ← بدء جلسة
 *     { type: "audio", data: <base64 PCM 16kHz mono 16-bit> }    ← قطعة ميكروفون
 *     { type: "text",  text: "..."}                              ← إدخال نصي
 *     { type: "stop" }                                           ← إنهاء الجلسة
 *
 *   من الخادم → المتصفح:
 *     { type: "ready" }                                          ← الجلسة جاهزة
 *     { type: "audio", data: <base64 PCM 24kHz mono 16-bit> }    ← قطعة صوت من النموذج
 *     { type: "input_transcript",  text: "..." }                 ← تفريغ نص المستخدم
 *     { type: "output_transcript", text: "..." }                 ← تفريغ نص النموذج
 *     { type: "interrupted" }                                    ← قاطع المستخدم النموذج
 *     { type: "turn_complete" }                                  ← انتهى الدور
 *     { type: "error", message: "..." }                          ← خطأ
 *
 * مراجع API الأساسية:
 *   - ai.live.connect({ model, config, callbacks })  →  Session
 *   - session.sendRealtimeInput({ audio: { data, mimeType } })   لإرسال ميكروفون
 *   - session.sendClientContent({ turns })                       لإرسال نص
 *   - session.close()                                            لإنهاء الجلسة
 */

import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  GoogleGenAI,
  Modality,
  type Session,
  type LiveServerMessage,
} from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT ?? 3000);

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY غير موجود في .env");
  process.exit(1);
}

// ============================================================================
// إعداد عميل Gemini
// ============================================================================
const ai = new GoogleGenAI({ apiKey: API_KEY });

// نموذج Live الموصى به للوضع الصوتي ثنائي الاتجاه
const DEFAULT_LIVE_MODEL = "gemini-live-2.5-flash-preview";

// قائمة الأصوات المُدرّبة المتاحة (يمكنك تغييرها من الواجهة)
const DEFAULT_VOICE = "Aoede"; // دافئ ومحاوِر
// أصوات أخرى: Puck, Charon, Kore, Fenrir, Leda, Orus, Zephyr

const DEFAULT_LANGUAGE = "ar-XA"; // العربية (أو "en-US" للإنجليزية)

const DEFAULT_SYSTEM_INSTRUCTION = `أنت مساعدة صوتية ودودة باللغة العربية الفصحى المبسطة.
ردودك قصيرة وعفوية، كأنك تتحدثين شفهيًا لا تكتبين.
إذا تحدث المستخدم بالإنجليزية، يمكنك الرد بها.
لا تستخدمي تنسيقات Markdown — كل ما تقولينه سيُنطق صوتيًا.`;

// ============================================================================
// إعداد الخادم
// ============================================================================
const app = express();
app.use(express.json());

// نقطة فحص صحة سريعة للواجهة
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: DEFAULT_LIVE_MODEL });
});

// قائمة الأصوات لتعبئة قائمة منسدلة في الواجهة
app.get("/api/voices", (_req, res) => {
  res.json({
    voices: [
      "Aoede", "Puck", "Charon", "Kore", "Fenrir",
      "Leda", "Orus", "Zephyr",
    ],
    default: DEFAULT_VOICE,
    languages: ["ar-XA", "en-US"],
    defaultLanguage: DEFAULT_LANGUAGE,
  });
});

const httpServer = createServer(app);

// ============================================================================
// خادم WebSocket
// ============================================================================
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (browserWs) => {
  console.log("🔌 اتصل متصفح جديد");

  let liveSession: Session | null = null;
  let sessionReady = false;
  // طابور للقطعات الصوتية القادمة قبل اكتمال إعداد الجلسة
  const pendingAudio: string[] = [];

  // -----------------------------------------------------
  // دالة مساعدة لإرسال JSON للمتصفح بأمان
  // -----------------------------------------------------
  const sendToBrowser = (obj: unknown) => {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify(obj));
    }
  };

  // -----------------------------------------------------
  // معالج الرسائل القادمة من Gemini Live
  // -----------------------------------------------------
  const handleLiveMessage = (msg: LiveServerMessage) => {
    // 1) قطعة صوتية: تأتي عادة في modelTurn.parts[i].inlineData
    const parts = msg.serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data && inline.mimeType?.startsWith("audio/")) {
        sendToBrowser({ type: "audio", data: inline.data });
      } else if (part.text) {
        // أحيانًا يأتي نص ضمن الـ modelTurn (مثل grounding)
        sendToBrowser({ type: "output_transcript", text: part.text });
      }
    }

    // 2) تفريغ نص المستخدم (Input transcription)
    const inTr = msg.serverContent?.inputTranscription;
    if (inTr?.text) {
      sendToBrowser({ type: "input_transcript", text: inTr.text });
    }

    // 3) تفريغ نص النموذج (Output transcription) — للترجمة على الشاشة
    const outTr = msg.serverContent?.outputTranscription;
    if (outTr?.text) {
      sendToBrowser({ type: "output_transcript", text: outTr.text });
    }

    // 4) المقاطعة: المستخدم بدأ يتكلم فجأة → نوقف التشغيل في الواجهة
    if (msg.serverContent?.interrupted) {
      sendToBrowser({ type: "interrupted" });
    }

    // 5) انتهى الدور
    if (msg.serverContent?.turnComplete) {
      sendToBrowser({ type: "turn_complete" });
    }

    // 6) نداء أداة (function calling) — مرحلة لاحقة، نتجاهلها الآن
    if (msg.toolCall) {
      console.warn("📞 toolCall received (لم يتم التطبيق بعد):", msg.toolCall);
    }
  };

  // -----------------------------------------------------
  // فتح جلسة Gemini Live
  // -----------------------------------------------------
  const startLiveSession = async (opts: {
    systemInstruction?: string;
    voice?: string;
    language?: string;
  }) => {
    try {
      liveSession = await ai.live.connect({
        model: DEFAULT_LIVE_MODEL,
        config: {
          // النموذج يستقبل ميكروفون ويرد بصوت
          responseModalities: [Modality.AUDIO],

          // الصوت المُدرّب + اللغة
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: opts.voice ?? DEFAULT_VOICE,
              },
            },
            languageCode: opts.language ?? DEFAULT_LANGUAGE,
          },

          // تعليمات النظام (الشخصية)
          systemInstruction:
            opts.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,

          // تفعيل تفريغ النصوص في الاتجاهين — مفيد للترجمة على الشاشة
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("✅ Gemini Live connected");
            sessionReady = true;
            sendToBrowser({ type: "ready" });
            // أرسل أي صوت تراكم خلال الإعداد
            while (pendingAudio.length > 0 && liveSession) {
              const data = pendingAudio.shift()!;
              liveSession.sendRealtimeInput({
                audio: { data, mimeType: "audio/pcm;rate=16000" },
              });
            }
          },
          onmessage: handleLiveMessage,
          onerror: (e) => {
            console.error("⚠️  Gemini Live error:", e);
            sendToBrowser({ type: "error", message: String(e.message ?? e) });
          },
          onclose: (e) => {
            console.log("🔚 Gemini Live closed:", e.reason || e.code);
            sessionReady = false;
            liveSession = null;
          },
        },
      });
    } catch (err) {
      console.error("فشل بدء الجلسة:", err);
      sendToBrowser({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // -----------------------------------------------------
  // الرسائل القادمة من المتصفح
  // -----------------------------------------------------
  browserWs.on("message", async (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "start":
        if (liveSession) {
          console.warn("جلسة قائمة بالفعل، أُهملت رسالة start");
          return;
        }
        await startLiveSession({
          systemInstruction: msg.systemInstruction,
          voice: msg.voice,
          language: msg.language,
        });
        break;

      case "audio": {
        if (!msg.data) return;
        if (!sessionReady || !liveSession) {
          // الصوت وصل قبل اكتمال الإعداد — نخزّنه
          pendingAudio.push(msg.data);
          return;
        }
        liveSession.sendRealtimeInput({
          audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
        });
        break;
      }

      case "text":
        if (!liveSession) return;
        liveSession.sendClientContent({
          turns: [{ role: "user", parts: [{ text: msg.text ?? "" }] }],
          turnComplete: true,
        });
        break;

      case "stop":
        if (liveSession) {
          liveSession.close();
          liveSession = null;
          sessionReady = false;
        }
        break;

      default:
        console.warn("نوع رسالة غير معروف:", msg.type);
    }
  });

  // -----------------------------------------------------
  // تنظيف عند فصل المتصفح
  // -----------------------------------------------------
  browserWs.on("close", () => {
    console.log("👋 متصفح مفصول");
    if (liveSession) {
      liveSession.close();
      liveSession = null;
    }
  });

  browserWs.on("error", (err) => {
    console.error("خطأ في WebSocket المتصفح:", err);
  });
});

// ============================================================================
// تشغيل الخادم
// ============================================================================
httpServer.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
  console.log(`   نقطة WebSocket:   ws://localhost:${PORT}/ws`);
  console.log(`   النموذج:          ${DEFAULT_LIVE_MODEL}`);
  console.log(`   الصوت الافتراضي: ${DEFAULT_VOICE} / ${DEFAULT_LANGUAGE}`);
});
