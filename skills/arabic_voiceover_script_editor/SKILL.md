---
id: arabic_voiceover_script_editor
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic script with pronunciation/diacritics notes
safety_level: low
use_when:
  - تحسين نص فويس أوفر عربي للنطق والأداء
  - إضافة تشكيل كامل أو خفيف أو غنائي
  - تحويل للفصحى البسيطة أو العامية المصرية أو الخليجية
  - تجهيز نص TTS أو SSML أو أغنية عربية
do_not_use_when:
  - المطلوب اختصار حسب مدة؛ استخدم script_shortener_30sec أولًا
  - المطلوب تقسيم قصة لمشاهد؛ استخدم story_to_scene_generator
  - المطلوب برومبت فيديو كامل؛ استخدم veo_video_prompt_builder
conflicts_with:
  - script_shortener_30sec
  - story_to_scene_generator
---

# Skill: arabic_voiceover_script_editor

## Purpose

Improve Arabic voiceover scripts for natural delivery, TTS pronunciation, AI music models, and presenter performance.

## Difference from script_shortener_30sec

- `script_shortener_30sec` controls duration and word count.
- `arabic_voiceover_script_editor` controls pronunciation, tone, dialect, punctuation, and diacritics.

If both are needed, shorten first, then polish voiceover.

## Diacritics Levels

### Light Diacritics
Use for difficult words only.

### Full Diacritics
Use when TTS/music model mispronounces Arabic or Hossam asks “تشكيل كامل”.

### Singing Diacritics
Use for lyrics. Keep vowels clean and lines short. Avoid complex clusters.

## Dialect Modes

- **Egyptian Arabic** — natural, warm, conversational.
- **Gulf Arabic** — calm, polished, suitable for announcements.
- **Simple MSA** — clear, dignified, suitable for documentaries and news.

## TTS Rules

- Short sentences.
- Clear punctuation.
- Avoid nested clauses.
- Write numbers as words when pronunciation matters.
- Avoid symbols that confuse TTS.
- Use line breaks for performance pauses.
- Keep emotional direction separate from spoken text when needed.

## Output Format

```text
النص الجاهز للتسجيل:
[script]

ملاحظات الأداء:
- السرعة: [بطيئة/هادئة/متوسطة]
- النبرة: [دافئة/حازمة/وثائقية/مؤثرة]
- الوقفات: [where to pause]
```

## SSML Light Format

If Hossam asks for SSML, use simple tags only:

```xml
<speak>
  <prosody rate="slow" pitch="medium">
    [text]
    <break time="400ms"/>
  </prosody>
</speak>
```

## Quality Checklist

- Text is readable aloud.
- Diacritics match the requested level.
- Dialect is consistent.
- No unnecessary elongation.
- Punctuation supports performance.
