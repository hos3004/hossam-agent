---
id: arabic_text_layout_for_design
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic design-ready line breaks
safety_level: low
use_when:
  - تقسيم عنوان أو جملة عربية على التصميم
  - ترحيل كلمات بين السطور ليكون المعنى واضحًا
  - اقتراح عنوان قصير وقوي للشرائح أو البوسترات
  - ضبط on-screen text عربي بصريًا
do_not_use_when:
  - المطلوب تخطيط إنفوجراف كامل؛ استخدم infographic_slide_planner
  - المطلوب نص تسجيل صوتي؛ استخدم arabic_voiceover_script_editor
  - المطلوب ترجمة أو إعادة كتابة عادية بدون تصميم
conflicts_with:
  - infographic_slide_planner
  - arabic_voiceover_script_editor
---

# Skill: arabic_text_layout_for_design

## Purpose

Prepare Arabic text for visual design: posters, slides, lower thirds, thumbnails, infographic panels, and black end cards.

## Main Tasks

- Break Arabic text into meaningful lines.
- Move words between previous/next lines to avoid awkward breaks.
- Create short, strong titles.
- Produce design-friendly hierarchy.

## Arabic Line-Break Rules

Avoid ending a line with:
- prepositions alone: من، في، على، إلى، عن، بـ، لـ
- particles alone: أن، إن، لا، قد، هل
- weak connectors: و، أو، ثم

Keep together:
- noun + adjective.
- title + name.
- number + counted noun.
- verb + essential object if short.
- fixed phrases and quotes.

## Output Format

```text
العنوان الرئيسي:
[line 1]
[line 2]

النص الفرعي:
[line 1]
[line 2]
[line 3]

نسخة أقصر:
[short option]
```

## End Card / Typewriter Text

For black ending cards:

```text
هذه القصة حدثت.
والكرامة لا تشيخ.
```

Keep it short, powerful, and readable.

## Quality Checklist

- No line has a dangling connector.
- Meaning is clear per line.
- Visual hierarchy is obvious.
- Text is short enough for design.
