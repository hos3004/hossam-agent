---
id: veo_video_prompt_builder
version: 0.2.0
priority: critical
language: ar-EG-first
output_language: English video prompt + Arabic dialogue when needed
safety_level: medium
use_when:
  - اكتب برومبت فيديو أو حول مشهد إلى Veo/Sora/Minimax/Runway/HeyGen prompt
  - تحريك صورة أو image-to-video أو motion prompt
  - مشاهد سينمائية أو وثائقية أو حوارية
  - Google FX Flow Video Prompt أو prompt فيه كاميرا وإضاءة وأداء
do_not_use_when:
  - المطلوب توليد صورة ثابتة فقط؛ استخدم image_prompt_builder
  - المطلوب تقسيم قصة طويلة إلى مشاهد قبل كتابة البرومبتات؛ استخدم story_to_scene_generator
  - المطلوب اختيار الأداة لا كتابة prompt؛ استخدم ai_tool_selection_advisor
conflicts_with:
  - image_prompt_builder
  - story_to_scene_generator
  - ai_tool_selection_advisor
wins_over:
  - image_prompt_builder when the requested output is video or motion
---

# Skill: veo_video_prompt_builder

## Purpose

Convert Arabic ideas, scripts, documentary moments, or scene descriptions into professional English video-generation prompts compatible with Veo, Sora, Minimax, Runway, HeyGen, and similar tools.

## Important Distinction

- If Hossam asks **“اكتب برومبت فيديو”**, output text only.
- If Hossam asks **“ولد فيديو / نفذ”**, explain that this skill prepares the prompt and that execution happens in the target tool.
- If he says **“تحريك فقط”**, do not invent a new story.

## Tool Profiles

### Veo / Google FX Flow
Best for cinematic realism, Arabic spoken lines may be included as dialogue. Use structured sections and precise camera/action.

### Sora
Best for visually rich cinematic shots. Emphasize physical consistency, cinematic realism, continuity, and natural movement. Avoid overloading with dialogue.

### Minimax
Best for fast motion generation and image-to-video. Keep motion prompt compact, direct, and strongly preserve the reference.

### Runway
Best for image-to-video and controllable motion. Focus on camera movement and clear subject motion.

### HeyGen
Best for talking presenters, lip-sync, and direct speech. Prioritize clean script, face visibility, and performance instructions.

## Default Prompt Structure

```text
Title:
[short scene title]

Main Subject:
[identity / character description / reference instructions]

Setting & Background:
[place, period, environment, atmosphere]

Camera Setup:
[lens, framing, angle, movement]

Lighting:
[lighting style and mood]

Action & Performance:
[what happens, expressions, gestures, pacing]

Dialogue / Spoken Line:
"[Arabic dialogue if needed]"

Emotional Tone:
[emotional direction]

Technical Specifications:
[duration, aspect ratio, realism/style, quality, motion]

Negative Constraints:
[no text/logos/new objects/unsafe content/etc.]
```

## Image-to-Video Protocol

Use this when there is a reference image or Hossam says “حرك الصورة”:

```text
Use the provided image as the exact visual reference. Preserve the same person, facial identity, clothing, pose, lighting, background, composition, and overall mood. Add only the requested motion: [camera movement + subtle subject movement]. Do not add new people, objects, text, logos, props, UI elements, or background changes. Maintain cinematic realism and temporal consistency.
```

If Hossam specifically asks to change the background or add something, only then include that change.

## Reference Identity Rules

When a reference image exists:
- Preserve facial features, hairstyle, beard, glasses, skin tone, body proportions, and clothing.
- Preserve pose if requested.
- Change background only if requested.
- Do not add a new outfit unless Hossam explicitly asks.

## Dialogue Rules

- Prompt body is English.
- Spoken Arabic line remains Arabic inside quotes.
- For Egyptian dialogue, write clean Egyptian Arabic.
- If pronunciation matters, add diacritics to the dialogue only.
- Do not request visible Arabic text unless explicitly needed.

## Examples

### Dialogue Scene

```text
Title:
A quiet confession in a dim studio

Main Subject:
A middle-aged Egyptian presenter, calm and serious, seated close to camera.

Action & Performance:
He looks directly into the lens, speaks slowly with controlled emotion, then pauses before the last sentence.

Dialogue / Spoken Line:
"إِحْنَا مِشْ بِنِحْكِي حِكَايَة... إِحْنَا بِنِفَكَّر النَّاس بِحَقِيقَة." 
```

### Silent Documentary Scene

```text
A symbolic cinematic documentary shot of an empty prison corridor at night, no visible people, slow forward dolly, cold overhead lights flickering softly, heavy silence, realistic texture, 16:9, no text, no logos.
```

### Image-to-Video Motion Only

```text
Use the provided image as the exact reference. Keep identity, clothing, lighting, background, and composition unchanged. Add a slow cinematic push-in while the subject breathes naturally and blinks once. Do not add new elements, text, logos, or camera cuts.
```

## Safety Notes

- Do not generate graphic violence.
- For prisons, repression, suffering, and political stories, use symbolic or non-graphic documentary imagery.
- For minors, avoid unsafe or exploitative framing.
- For prophets or sacred figures, follow Hossam's non-figurative constraints, such as representing them as light.

## Quality Checklist

- Prompt is in English.
- Arabic dialogue is preserved correctly.
- Camera motion is clear and feasible.
- Reference identity/clothing rules are respected.
- No accidental text/logos are requested.
- Duration and aspect ratio are included when known.
