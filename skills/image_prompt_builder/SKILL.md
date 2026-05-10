---
id: image_prompt_builder
version: 0.2.0
priority: critical
language: ar-EG-first
output_language: English image prompt + optional Arabic design text
safety_level: medium
use_when:
  - كتابة برومبت صورة ثابتة أو بوستر أو خلفية أو إنفوجراف
  - صور مرجعية مع الحفاظ على الهوية أو الملابس
  - صورة بدون نصوص أو بدون UI أو بدون شعارات
  - تحديد layout مثل بطل يمين ومساحة نص يسار
do_not_use_when:
  - المطلوب فيديو أو حركة؛ استخدم veo_video_prompt_builder
  - المطلوب خطة شرائح كاملة؛ استخدم infographic_slide_planner
  - المطلوب الحفاظ على شخصية عبر مشاهد كثيرة؛ استخدم reference_character_consistency مع هذه المهارة
conflicts_with:
  - veo_video_prompt_builder
  - infographic_slide_planner
  - reference_character_consistency
---

# Skill: image_prompt_builder

## Purpose

Create high-quality English image prompts for AI image models, tailored to Hossam's daily work: cinematic documentary images, posters, infographics, TV backgrounds, historical scenes, character references, and social campaigns.

## Output Rule

- Write the final image prompt in English.
- If Arabic text must appear inside the design, write it clearly and separately.
- If Hossam asks only for a prompt, do not generate an image.
- If Hossam asks to generate/create/produce the image, the external image tool handles execution.

## Layout Presets

### 1. Hero Right / Text Space Left
Use for infographics and thumbnails.

```text
16:9 horizontal composition. Main subject on the right third, large and emotionally dominant. Clean negative space on the left for Arabic text overlay. Background integrated, cinematic, modern, no text, no logos, no UI.
```

### 2. Cinematic Poster 3:4 No Text
Use for character posters.

```text
3:4 vertical cinematic poster portrait, no text, no titles, no logos, dramatic lighting, strong subject presence, premium movie-poster composition.
```

### 3. Infographic Background 16:9
Use for data/social/political slides.

```text
16:9 modern editorial infographic background, bold natural colors, layered depth, clean area for text, subtle symbolic elements, no readable text unless explicitly requested.
```

### 4. Realistic Documentary Still
Use for news/documentary scenes.

```text
Realistic cinematic documentary still, natural proportions, authentic environment, emotionally restrained, no exaggeration, no text, no logos.
```

### 5. Preserved Reference Character
Use when an uploaded image defines identity.

```text
Use the provided reference image as the identity anchor. Preserve facial features, hairstyle, beard, glasses if present, skin tone, body proportions, clothing, and overall likeness. Change only the requested elements.
```

## Reference Image Protocol

When Hossam provides a reference image:
- Preserve identity.
- Preserve clothing unless he asks to change it.
- Preserve pose if he asks.
- Change background only if requested.
- Do not invent additional characters.
- Do not beautify beyond the requested style.

## Strict No-Text Rule

If Hossam says:
- “بدون نصوص”
- “احذف أي نصوص”
- “no text”
- “بدون UI”
- “بدون شعارات”

Then include this exact negative constraint:

```text
No text, no captions, no Arabic letters, no English letters, no numbers, no logos, no watermarks, no UI elements, no signs, no labels, no readable writing anywhere in the image.
```

## Prompt Structure

```text
Prompt:
[subject + composition + style + lighting + mood + camera + environment + aspect ratio]

Negative Prompt:
[forbidden elements]

Optional Arabic Text:
[only if requested]
```

## Quality Rules

- Mention aspect ratio when known.
- Avoid asking for visible Arabic text unless necessary.
- For TV/program graphics, reserve clean space for overlays.
- For historical scenes, avoid modern objects unless intentionally requested.
- For sensitive scenes, prefer symbolic, dignified visuals.
- For children/teens, use safe, non-exploitative, age-appropriate contexts only.

## Quality Checklist

- Prompt matches the intended image, not video.
- Layout is explicit.
- No accidental text/logo/UI if forbidden.
- Reference identity/clothing instructions are clear.
- The output is usable directly in an image model.
