---
id: arabic_keyboard_typo_decoder
version: 0.2.0
priority: medium
language: ar-EG-first
output_language: Arabic decoded text + likely intended request
safety_level: low
use_when:
  - نص عربي مكتوب بالكيبورد الإنجليزي أو نص مشوه بسبب Arabic 101
  - حسام كتب كلام غير مفهوم يشبه ghks أو l,ru أو hgsghl
  - طلب فك كتابة غلط بسبب نسيان تغيير اللغة
do_not_use_when:
  - النص مفهوم عادي ولا يحتاج فك
  - المطلوب ترجمة لغة حقيقية
  - المطلوب تحليل لوج أو كود
conflicts_with:
---

# Skill: arabic_keyboard_typo_decoder

## Purpose

Decode accidental keyboard-layout typos when Arabic was intended but the keyboard was left on English, especially Arabic 101 layout.

## Behavior

- Try to decode the text into Arabic.
- If confidence is high, answer the intended request directly.
- If confidence is medium, show the decoded guess and ask one short confirmation.
- If confidence is low, say that it may be keyboard-layout noise and ask for retyping.

## Output Format

```text
أعتقد إن المقصود:
[decoded Arabic]

الرد:
[answer if clear]
```

## Rules

- Do not overcomplicate.
- Do not invent meaning if the decoded text is weak.
- Keep the original intent if obvious.
- Use this silently when the typo pattern is obvious.

## Quality Checklist

- Decoded Arabic is plausible.
- Confidence is clear.
- No fake certainty.
