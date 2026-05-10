---
id: reference_character_consistency
version: 0.2.0
priority: high
language: ar-EG-first
output_language: English character bible + reusable prompt anchor
safety_level: medium
use_when:
  - شخصية ثابتة من صورة مرجعية عبر عدة مشاهد
  - الحفاظ على الوجه واللبس والشعر والنظارة والملامح
  - شخصية محفوظة مثل أدهم أو شخصيات وثائقية/بوستر
  - منع تغير غير مطلوب في الهوية أو الملابس
do_not_use_when:
  - المطلوب صورة واحدة بدون شخصية ثابتة؛ استخدم image_prompt_builder
  - المطلوب تحريك صورة واحدة فقط؛ استخدم veo_video_prompt_builder
  - المطلوب تقسيم قصة كاملة؛ استخدم story_to_scene_generator مع هذه المهارة
conflicts_with:
  - image_prompt_builder
  - veo_video_prompt_builder
  - story_to_scene_generator
---

# Skill: reference_character_consistency

## Purpose

Create and maintain a reusable character consistency description for AI image/video prompts.

## Character Bible Template

```text
Character Name / Label:
[name]

Identity Anchor:
Use the provided reference image as the identity anchor. Preserve the same facial features, hairstyle, beard/mustache if present, glasses if present, skin tone, age range, body proportions, and overall likeness.

Clothing Anchor:
Preserve the same clothing style, colors, accessories, and fabric feel unless the user explicitly asks for a costume change.

Expression Range:
[allowed expressions]

Forbidden Changes:
Do not change identity, age, face shape, hairstyle, skin tone, clothing, accessories, or body proportions unless explicitly requested.
```

## Universal Reference Phrase

Use inside prompts:

```text
Use the provided reference image as the identity anchor. Preserve the person's facial features, hairstyle, beard, glasses if present, skin tone, body proportions, clothing, and overall likeness as accurately as possible. Only change the requested scene/background/action.
```

## When Clothing Must Stay the Same But Model Is Gender-Independent

Use:

```text
Preserve the exact outfit from the reference image, including its overall style, colors, fit, layers, and accessories. Do not replace it with formalwear, uniforms, dresses, suits, or any other clothing unless explicitly requested.
```

## Scene Continuity Block

For multi-scene generation:

```text
Character Continuity:
The same character must appear consistently across all scenes. Keep the same face, age, body proportions, hairstyle, clothing, and emotional identity. Only the pose, camera angle, lighting, and environment may change as described per scene.
```

## Rules

- Do not over-describe a specific outfit if Hossam wants a prompt reusable for male/female models.
- If he says “نفس اللبس كما هو”, use outfit preservation, not a new outfit description.
- If he asks for a new background with no details, allow creative background variation but preserve the subject.
- Avoid forcing a pose unless requested.

## Quality Checklist

- Identity preserved.
- Clothing preserved when requested.
- Prompt remains reusable.
- No unwanted style/costume changes.
