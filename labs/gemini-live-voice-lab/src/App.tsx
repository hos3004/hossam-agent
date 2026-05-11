/**
 * واجهة مختبر Gemini Live — صفحة واحدة بسيطة:
 *   1. زر "ابدأ المحادثة" يفتح جلسة Live ويبدأ الميكروفون
 *   2. مؤشر دائري يضيء حسب نشاط الكلام
 *   3. عرض نص ما يقوله المستخدم وما يرد به النموذج
 *   4. اختيار الصوت واللغة قبل البدء
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { MicCapture, AudioPlayer } from "./lib/audio";
import { LiveSession } from "./lib/liveSession";

type Status = "idle" | "connecting" | "ready" | "error";

interface Turn {
  role: "user" | "model";
  text: string;
}

const DEFAULT_VOICES = ["Aoede", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Zephyr"];
const LANGS = [
  { code: "ar-XA", label: "العربية" },
  { code: "en-US", label: "English" },
];

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState("Aoede");
  const [language, setLanguage] = useState("ar-XA");
  const [systemInstruction, setSystemInstruction] = useState(
    "أنت مساعدة صوتية ودودة باللغة العربية. ردودك قصيرة وعفوية."
  );
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speakingNow, setSpeakingNow] = useState(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const currentUserTextRef = useRef<string>("");
  const currentModelTextRef = useRef<string>("");

  // -------- بدء المحادثة --------
  const start = async () => {
    setError(null);
    setStatus("connecting");
    setTurns([]);

    const session = new LiveSession();
    const player = new AudioPlayer();
    sessionRef.current = session;
    playerRef.current = player;

    session.onReady = () => {
      setStatus("ready");
      // ابدأ الميكروفون فقط بعد أن تكون الجلسة جاهزة
      const mic = new MicCapture((chunk) => session.sendAudio(chunk));
      micRef.current = mic;
      mic.start().catch((err) => {
        setError("تعذر فتح الميكروفون: " + err.message);
        setStatus("error");
      });
    };

    session.onAudio = (chunk) => {
      player.enqueue(chunk);
      setSpeakingNow(true);
    };

    session.onInputText = (text) => {
      currentUserTextRef.current += text;
      flushPartial("user", currentUserTextRef.current);
    };

    session.onOutputText = (text) => {
      currentModelTextRef.current += text;
      flushPartial("model", currentModelTextRef.current);
    };

    session.onInterrupted = () => {
      player.interrupt();
      setSpeakingNow(false);
    };

    session.onTurnComplete = () => {
      // ثبّت الدور وأخلِ المخزن المؤقت
      if (currentUserTextRef.current) {
        currentUserTextRef.current = "";
      }
      if (currentModelTextRef.current) {
        currentModelTextRef.current = "";
      }
      setSpeakingNow(false);
    };

    session.onError = (msg) => {
      setError(msg);
      setStatus("error");
    };

    session.onClose = () => {
      setStatus("idle");
      setSpeakingNow(false);
    };

    try {
      await session.start({ voice, language, systemInstruction });
    } catch {
      setStatus("error");
      setError("فشل الاتصال بالخادم");
    }
  };

  // -------- إيقاف المحادثة --------
  const stop = () => {
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
    setSpeakingNow(false);
  };

  // -------- تحديث آخر دور للنص الجزئي (streaming partial) --------
  const flushPartial = (role: "user" | "model", text: string) => {
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text }];
      }
      return [...prev, { role, text }];
    });
  };

  // تنظيف عند الخروج
  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = status === "ready" || status === "connecting";

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 max-w-3xl mx-auto">
      {/* العنوان */}
      <header className="w-full text-center my-6">
        <h1 className="text-3xl font-bold tracking-tight">
          مختبر Gemini Live الصوتي
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          محادثة صوتية ثنائية الاتجاه بزمن استجابة منخفض
        </p>
      </header>

      {/* لوحة الإعدادات (تظهر فقط قبل البدء) */}
      {!isActive && (
        <section className="w-full bg-slate-900/60 rounded-2xl p-5 mb-6 space-y-4 border border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-slate-400">الصوت</span>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="mt-1 w-full bg-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
              >
                {DEFAULT_VOICES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">اللغة</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 w-full bg-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-slate-400">تعليمات النظام (الشخصية)</span>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500 resize-none"
            />
          </label>
        </section>
      )}

      {/* مؤشر الحالة الكبير */}
      <div className="flex flex-col items-center my-6">
        <motion.button
          onClick={isActive ? stop : start}
          whileTap={{ scale: 0.95 }}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-colors ${
            status === "ready"
              ? "bg-emerald-500/20 ring-4 ring-emerald-500"
              : status === "connecting"
              ? "bg-amber-500/20 ring-4 ring-amber-500"
              : status === "error"
              ? "bg-rose-500/20 ring-4 ring-rose-500"
              : "bg-indigo-500/20 ring-4 ring-indigo-500"
          }`}
        >
          {/* نبضة عند الكلام */}
          <AnimatePresence>
            {speakingNow && (
              <motion.span
                key="pulse"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-emerald-400"
              />
            )}
          </AnimatePresence>

          {status === "connecting" ? (
            <Loader2 className="w-12 h-12 animate-spin text-amber-400" />
          ) : status === "ready" ? (
            speakingNow ? (
              <Volume2 className="w-12 h-12 text-emerald-300" />
            ) : (
              <Mic className="w-12 h-12 text-emerald-300" />
            )
          ) : (
            <MicOff className="w-12 h-12 text-indigo-300" />
          )}
        </motion.button>
        <p className="mt-3 text-sm text-slate-400">
          {status === "idle" && "اضغط للبدء"}
          {status === "connecting" && "جارٍ الاتصال…"}
          {status === "ready" && "تحدث الآن"}
          {status === "error" && "خطأ"}
        </p>
      </div>

      {error && (
        <div className="w-full bg-rose-950/60 border border-rose-800 rounded-xl p-3 mb-4 text-rose-200 text-sm">
          {error}
        </div>
      )}

      {/* سجل المحادثة */}
      <section className="w-full flex-1 space-y-2 overflow-y-auto">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl text-sm ${
              t.role === "user"
                ? "bg-indigo-900/30 border border-indigo-800/50"
                : "bg-emerald-900/30 border border-emerald-800/50"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
              {t.role === "user" ? "أنت" : "Gemini"}
            </div>
            <div className="leading-relaxed">{t.text}</div>
          </div>
        ))}
        {turns.length === 0 && status === "ready" && (
          <p className="text-center text-slate-500 text-sm mt-8">
            ابدأ الكلام…
          </p>
        )}
      </section>
    </div>
  );
}
