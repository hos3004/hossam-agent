---
id: prompt_refiner_full_output
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Full final English prompt unless otherwise requested
safety_level: low
use_when:
  - عدل البرومبت واكتبه كامل
  - تحسين برومبت موجود مع الحفاظ على الهيكل
  - إضافة أو إزالة شرط من prompt دون إعادة اختراعه
  - Hossam asks for full updated prompt
do_not_use_when:
  - المطلوب برومبت فيديو جديد من فكرة؛ استخدم veo_video_prompt_builder
  - المطلوب برومبت صورة جديد من الصفر؛ استخدم image_prompt_builder
  - المطلوب اختصار نص لا prompt؛ استخدم script_shortener_30sec
conflicts_with:
  - veo_video_prompt_builder
  - image_prompt_builder
  - script_shortener_30sec
---

# Skill: prompt_refiner_full_output

## Purpose

Refine an existing prompt and return the full final version, not a diff, unless Hossam explicitly asks for the changes only.

This skill exists because Hossam often says: “عدل البرومبت واكتبه كامل”.

## Core Rules

- Preserve the original structure when it is good.
- Apply the requested changes precisely.
- Do not silently remove important constraints.
- Do not add unnecessary new concepts.
- Keep identity, clothing, style, aspect ratio, and negative constraints unless the requested change conflicts with them.
- Return the complete final prompt.

## Process

1. Identify the original prompt type: image, video, music, voiceover, agent, UI, or other.
2. Identify requested modifications.
3. Keep all stable constraints.
4. Integrate modifications cleanly.
5. Return the full final prompt.

## Output Format

```text
البرومبت الكامل بعد التعديل:

[full final prompt]
```

If useful, add a tiny note before the prompt:

```text
عدّلت: [one-line summary]
```

## Preservation Checklist

Before final output, verify:

- Identity constraints preserved.
- Clothing constraints preserved if present.
- No-text/no-logo constraints preserved.
- Aspect ratio preserved.
- Tool target preserved.
- Arabic dialogue preserved exactly unless Hossam asked to edit it.
- The final prompt is complete and copy-ready.
