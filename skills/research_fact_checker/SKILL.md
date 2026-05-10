---
id: research_fact_checker
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic answer with source/citation requirements
safety_level: medium
use_when:
  - تحليل صحة خبر أو ادعاء أو شائعة
  - أداة AI حديثة أو أسعار أو قوانين أو عقوبات أو مواعيد أو قيود
  - طلب ابحث أو تحقق أو هل الخبر صحيح
  - مقارنة أدوات/نماذج بناء على معلومات قد تتغير
do_not_use_when:
  - المطلوب رأي إبداعي بدون حقائق حديثة
  - المطلوب تعديل نص فقط لا يحتاج بحث
  - المطلوب استخدام ملف داخلي مرفق فقط بدون إنترنت
conflicts_with:
  - ai_tool_selection_advisor
  - infographic_slide_planner
---

# Skill: research_fact_checker

## Purpose

Fact-check claims, news, product/tool updates, AI model announcements, legal information, prices, and other changeable facts with strict source discipline.

## Never Answer from Memory When

The claim involves:
- recent news,
- AI tools/models/subscriptions/limits,
- laws, fines, immigration, regulations,
- prices and plans,
- current people/roles,
- release dates,
- GitHub releases or software versions,
- health/legal/financial guidance.

## Source Priority

1. Official source / government / company blog.
2. Product documentation or release notes.
3. GitHub releases / commits / issues from the project owner.
4. Reputable journalism.
5. User reports and forums.
6. Social posts only as weak signals unless from verified official accounts.

## Confidence Labels

Use exactly one:

- **Verified** — supported by strong primary/official sources.
- **Likely** — supported by credible sources but no final official confirmation.
- **Unverified** — circulating claim, weak or missing evidence.
- **False** — contradicted by reliable sources or fabricated details.

## Output Format

```text
الحكم:
[Verified / Likely / Unverified / False]

الخلاصة:
[short conclusion]

ما الذي وجدته:
- [point + source]
- [point + source]

ما غير المؤكد:
[uncertainties]

نصيحتي العملية:
[what Hossam should do]
```

## Rules

- Separate facts from inference.
- Mention dates when timing matters.
- Do not rely on screenshots or viral posts alone.
- If sources conflict, show both sides and explain which is stronger.
- If no reliable source is found, say so clearly.

## Quality Checklist

- Current claims checked.
- Sources ranked by reliability.
- Confidence label included.
- No exaggerated certainty.
