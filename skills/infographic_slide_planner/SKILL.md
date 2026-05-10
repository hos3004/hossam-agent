---
id: infographic_slide_planner
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic slide plan + English image prompts
safety_level: medium
use_when:
  - تحويل موضوع أو بيانات إلى غلاف وشرائح إنفوجراف
  - طلب 10 شرائح أو 15 شريحة أو on-screen text و visual idea
  - موقف معارض/مؤيد/محايد من قضية
  - تجهيز صور وموشن لكل شريحة
do_not_use_when:
  - المطلوب صورة واحدة فقط؛ استخدم image_prompt_builder
  - المطلوب اختصار نص زمني؛ استخدم script_shortener_30sec
  - الموضوع يحتوي خبر حديث أو أرقام غير مؤكدة؛ استخدم research_fact_checker أولًا أو اطلب بحث
conflicts_with:
  - image_prompt_builder
  - script_shortener_30sec
  - research_fact_checker
---

# Skill: infographic_slide_planner

## Purpose

Turn a topic, script, news item, law, campaign, or argument into a clear infographic slide plan, usually cover + 10 slides, with Arabic on-screen text and English image prompts.

## Required Positioning

Before writing slides, infer or state the editorial angle:

- **Supportive / مؤيد**
- **Opposing / معارض**
- **Neutral / محايد**
- **Explainer / شرح معلوماتي**
- **Campaign / حملة عاطفية**

## Fact-Check Rule

Any slide containing:
- numbers,
- legal claims,
- recent news,
- prices,
- punishments,
- dates,
- named organizations,
- current AI tool claims,

must be marked:

```text
Fact Check Needed: Yes
```

Do not present uncertain numbers as final facts without verification.

## On-Screen Text Rules

- Each slide should have 1 main headline and up to 3 short supporting points.
- Avoid long paragraphs.
- Use powerful Arabic phrasing suitable for design.
- If text feels crowded, split it into another slide.
- Prefer 3–4 short lines max per slide.

## Standard Output Format

Use this for every slide:

```text
Slide Number:
[1]

Slide Goal:
[what this slide must communicate]

On-screen Text:
[headline]
++ [point 1]
++ [point 2]
++ [point 3]

Visual Idea:
[short Arabic visual direction]

Image Prompt:
[English prompt, aspect ratio included, no accidental text/logos]

Motion Suggestion:
[short camera/motion idea if used in video]

Fact Check Needed:
[Yes/No]
```

## Style Lock

If Hossam asks for a consistent style, define it once at the top:

```text
Campaign Visual Style:
[colors, lighting, realism, layout, typography mood, repeated composition rule]
```

Then keep every slide aligned with it.

## Image Prompt Defaults

- Use 16:9 for horizontal slide backgrounds unless specified.
- Keep clean negative space for Arabic text.
- Avoid visible text inside generated images unless requested.
- For “hero on right”, reserve the left side for text.

## Quality Checklist

- Slides tell a coherent story.
- Each slide has one job.
- On-screen text is short enough.
- Image prompt is directly usable.
- Motion suggestion is simple.
- Fact-check flags are honest.
