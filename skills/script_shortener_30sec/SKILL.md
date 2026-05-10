---
id: script_shortener_30sec
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic script / Arabic lyrics / optional prompt-ready format
safety_level: low
use_when:
  - اختصار نص لزمن محدد مثل 20 أو 30 أو 45 أو 60 ثانية
  - تجهيز أغنية شارة أو فويس أوفر قصير أو إعلان أو نص إنفوجراف
  - النص طويل على المدة أو المودل لا يلحق النطق
  - طلب عامية مصرية أو تشكيل للنطق
do_not_use_when:
  - المطلوب تحسين النطق فقط بدون اختصار؛ استخدم arabic_voiceover_script_editor
  - المطلوب تقسيم قصة لمشاهد؛ استخدم story_to_scene_generator
  - المطلوب برومبت فيديو كامل؛ استخدم veo_video_prompt_builder
conflicts_with:
  - arabic_voiceover_script_editor
  - story_to_scene_generator
  - veo_video_prompt_builder
---

# Skill: script_shortener_30sec

## Purpose

Shorten Arabic scripts, songs, theme lyrics, announcements, voiceover text, and infographic narration to fit a strict duration, especially 30 seconds.

## Required Classification First

Before editing, classify the input into exactly one type:

1. **Ad Script** — commercial, campaign, announcement, call to action.
2. **Theme Song / Jingle** — lyrics to be sung, with pauses and melody.
3. **Documentary Voiceover** — serious narrative, emotional or investigative.
4. **Infographic Text** — short on-screen or narrated points.
5. **Social Reel / Short** — fast hook, one idea, strong ending.

If the type is unclear, infer from the wording and mention the assumption in one short line.

## Timing Guide

| Use case | 30 sec target | 60 sec target | Notes |
|---|---:|---:|---|
| Calm Arabic voiceover | 45–60 words | 90–120 words | Good for documentary narration. |
| Emotional slow voiceover | 30–45 words | 65–90 words | More pauses, fewer words. |
| Dramatic promo | 35–50 words | 75–100 words | Strong, short phrases. |
| Song/theme | 25–45 words | 50–75 words | 4–6 short lines max for 30 sec. |
| Infographic narration | 40–55 words | 80–105 words | Clear and direct. |

## Process

1. Identify the single core message.
2. Remove repeated meaning, filler, and decorative lines.
3. Preserve names, facts, emotional hook, and call to action.
4. Choose whether the text is **spoken** or **sung**.
5. For song/theme, limit to 4–6 short singable lines for 30 seconds.
6. If diacritics are requested, apply the correct level.
7. Return ready-to-use final text.

## Output Modes

### Normal Shortening

```text
النوع: [Ad Script / Theme Song / Documentary Voiceover / Infographic Text / Social Reel]

النسخة المناسبة لـ [duration]:
[final text]

تقدير المدة:
حوالي [x] ثانية بسرعة [هادئة/متوسطة/غنائية].
```

### When the original is too long and could be treated in two ways

Return two options:

```text
نسخة قصيرة جدًا:
[very concise version]

نسخة عاطفية أوسع:
[slightly richer version]
```

### Theme Song / Jingle

```text
Prompt-ready lyrics:
[only the lyrics to be sung]

Estimated duration:
Around [x] seconds with musical pauses.
```

## Rules

- Never cram too many words into the duration.
- Do not add new factual claims.
- Do not make narration poetic if the task needs clarity.
- For AI music tools, keep lines short and avoid complex Arabic sentence structures.
- If Hossam asks for “تشكيل”، add diacritics to improve pronunciation.
- If Hossam asks for “بالعامية المصرية”، rewrite naturally, not as translated fusha.

## Quality Checklist

- Fits the requested duration.
- Has no unnecessary repetition.
- Keeps the strongest emotional point.
- Reads naturally aloud.
- Song lyrics are actually singable.
- Diacritics are useful, not random.
