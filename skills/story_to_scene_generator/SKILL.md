---
id: story_to_scene_generator
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic scene breakdown + English image/motion prompts
safety_level: medium
use_when:
  - تحليل قصة وتحويلها إلى 10 أو 15 مشهد
  - سلسلة من أنا؟ أو قصة وثائقية أو حملة إنسانية
  - استخراج صور من سكربت أو قصة
  - طلب image prompt + motion prompt لكل مشهد
do_not_use_when:
  - المطلوب شريحة إنفوجراف معلوماتية؛ استخدم infographic_slide_planner
  - المطلوب مشهد فيديو واحد؛ استخدم veo_video_prompt_builder
  - المطلوب صورة واحدة؛ استخدم image_prompt_builder
conflicts_with:
  - infographic_slide_planner
  - veo_video_prompt_builder
  - image_prompt_builder
---

# Skill: story_to_scene_generator

## Purpose

Analyze a story, biography, documentary script, or campaign text and convert it into a coherent sequence of scenes, each with visual direction, image prompt, and optional motion prompt.

## Common Uses

- “من أنا؟” biographies.
- Historical or political documentary stories.
- Social campaign videos.
- 15-image storyboards.
- Prompt packs for image + video generation.

## Scene Planning Rules

- Keep chronological order unless dramatic rearrangement is requested.
- Each scene must have one clear visual moment.
- Avoid duplicating the same composition repeatedly.
- Use varied shots: wide, medium, close-up, symbolic, overhead, silhouette, object detail.
- For sensitive suffering, prisons, or violence: use symbolic, non-graphic imagery.
- For religious prophets: use non-figurative light or presence if requested.
- For minors: keep all depictions safe and non-exploitative.

## Standard Output

```text
المشهد [number]: [Arabic title]

Scene Purpose:
[what this scene communicates]

Visual Description:
[Arabic visual idea]

Image Prompt:
[English prompt, aspect ratio, style, no text/logos]

Motion Prompt:
[English image-to-video/camera movement prompt]

Notes:
[continuity, sensitivity, or reference character rules]
```

## Style Lock

When starting a multi-scene set, define:

```text
Global Visual Style:
[realistic Egyptian documentary / Pixar-like 3D / anime-realistic / cinematic TV]

Global Negative Constraints:
No text, no logos, no watermarks, no UI elements, no readable signs unless requested.
```

## Continuity Rules

If the same character appears across scenes:
- Use `reference_character_consistency`.
- Repeat stable identity description.
- Keep clothing consistent unless time passes or plot requires change.
- Avoid sudden age changes unless explicitly part of the timeline.

## Quality Checklist

- Scene sequence tells the story clearly.
- Visual variety is strong.
- Prompts are copy-ready.
- Sensitive content is handled safely.
- Character continuity is preserved.
