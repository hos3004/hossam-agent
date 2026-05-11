# Gemini Live Voice Lab

PoC مرجعي للاتصال بـ **Gemini Live API** بصوت ثنائي الاتجاه. الهدف: التحقق من أنماط الاتصال
قبل دمجها في المشروع الأساسي `Open-LLM-VTuber`.

## ما الذي يفعله؟
1. يفتح الميكروفون في المتصفح بصيغة PCM 16kHz mono 16-bit.
2. يبث الصوت لحظة بلحظة إلى خادم Node.js عبر WebSocket.
3. الخادم يفتح جلسة `ai.live.connect` ويُمرر الصوت إلى Gemini.
4. الردود الصوتية من النموذج (PCM 24kHz) تُرسل للمتصفح وتُشغَّل فورًا.
5. يعرض تفريغًا نصيًا حيًا لكلا الطرفين، ويدعم المقاطعة عند بدء المستخدم بالكلام.

## البنية

```
gemini-live-voice-lab/
├── server/index.ts        ← خادم Express + WebSocket (يحوي مفتاح API)
├── src/
│   ├── App.tsx            ← الواجهة React
│   ├── main.tsx
│   ├── index.css          ← Tailwind v4
│   └── lib/
│       ├── audio.ts       ← التقاط الميكروفون وتشغيل الصوت
│       └── liveSession.ts ← غلاف WebSocket للمتصفح
├── index.html
├── vite.config.ts         ← Vite + بروكسي /ws و /api
├── package.json
├── tsconfig.json
└── .env                   ← GEMINI_API_KEY (لا يُرفع للـ git)
```

## التشغيل
```bash
# 1) تثبيت
npm install

# 2) تأكد أن .env يحوي:
#    GEMINI_API_KEY=...
#    PORT=3000

# 3) شغّل الخادم والواجهة معًا
npm run dev

# الواجهة:  http://localhost:5173
# الخادم:   http://localhost:3000  (وَ ws://localhost:3000/ws)
```

## أنماط Gemini Live المُستخدمة في هذا المختبر

### 1) فتح الجلسة (server/index.ts)
```ts
liveSession = await ai.live.connect({
  model: "gemini-live-2.5-flash-preview",
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      languageCode: "ar-XA",
    },
    systemInstruction: "...",
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  },
  callbacks: { onopen, onmessage, onerror, onclose },
});
```

### 2) إرسال صوت الميكروفون
```ts
session.sendRealtimeInput({
  audio: { data: base64Pcm16, mimeType: "audio/pcm;rate=16000" },
});
```

### 3) استقبال صوت الرد
داخل `callbacks.onmessage(msg: LiveServerMessage)`:
```ts
const parts = msg.serverContent?.modelTurn?.parts ?? [];
for (const part of parts) {
  if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
    sendToBrowser({ type: "audio", data: part.inlineData.data });
  }
}
```

### 4) تفريغ الكلام (Transcription)
```ts
const inTr  = msg.serverContent?.inputTranscription?.text;   // ما قاله المستخدم
const outTr = msg.serverContent?.outputTranscription?.text;  // ما قاله النموذج
```

### 5) المقاطعة (Interruption)
```ts
if (msg.serverContent?.interrupted) {
  audioPlayer.interrupt();  // أوقف التشغيل فورًا
}
```

## بروتوكول الرسائل بين المتصفح والخادم
| من → إلى | type | الحقول | الوصف |
|---|---|---|---|
| متصفح → خادم | `start` | `voice`, `language`, `systemInstruction` | بدء الجلسة |
| متصفح → خادم | `audio` | `data` (base64) | قطعة ميكروفون |
| متصفح → خادم | `text`  | `text` | إدخال نصي |
| متصفح → خادم | `stop`  | — | إنهاء الجلسة |
| خادم → متصفح | `ready` | — | الجلسة جاهزة |
| خادم → متصفح | `audio` | `data` (base64) | قطعة صوت من النموذج |
| خادم → متصفح | `input_transcript` | `text` | تفريغ كلام المستخدم |
| خادم → متصفح | `output_transcript` | `text` | تفريغ كلام النموذج |
| خادم → متصفح | `interrupted` | — | قُوطع النموذج |
| خادم → متصفح | `turn_complete` | — | انتهى الدور |
| خادم → متصفح | `error` | `message` | خطأ |

## ملاحظات تطبيقية مهمة (تنتقل لاحقًا إلى Python)
- **معدلات العينات صارمة**: المدخل 16000 Hz، المخرج 24000 Hz. أي اختلاف ينتج صوتًا مشوشًا.
- **التشفير**: PCM little-endian 16-bit، مُرسَل كـ base64.
- **MIME type**: `audio/pcm;rate=16000` للإدخال — لازم يتطابق وإلا يرفض الـ API.
- **VAD التلقائي**: مُفعّل افتراضيًا في الـ Live API. لا حاجة لإرسال أي إشارة بدء/نهاية كلام.
- **المقاطعة**: تُكتشف من جانب النموذج تلقائيًا. عند `interrupted: true` يجب إيقاف playback فورًا.
- **استمرارية الجلسة**: للجلسات الطويلة (>10 دقائق) يجب تفعيل `sessionResumption` لتلقي توكنات استئناف.
- **الحدود**: الجلسة الواحدة محدودة بـ ~15 دقيقة افتراضيًا. للجلسات الأطول استخدم `contextWindowCompression`.

## الخطوة التالية: الدمج في Open-LLM-VTuber
نمط الخادم هنا (`server/index.ts`) سيُعاد كتابته بـ Python كـ:
- `src/open_llm_vtuber/agent/agents/gemini_live_agent.py` — يطبّق `AgentInterface`
- يستخدم `google-genai` Python SDK مع `client.aio.live.connect(...)`
- يُرجِع `AudioOutput` للـ Live2D كما يفعل `HumeAIAgent` حاليًا
