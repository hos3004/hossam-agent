---
id: ai_tool_selection_advisor
version: 0.2.0
priority: medium
language: ar-EG-first
output_language: Arabic recommendation + practical workflow
safety_level: medium
use_when:
  - اختيار أفضل أداة AI لمهمة فيديو/صورة/صوت/كود
  - مقارنة Sora وVeo وMinimax وRunway وHeyGen وComfyUI
  - بديل يدعم العربي أو قيوده أقل أو workflow أسرع
  - هل ينفع محليًا على جهاز حسام
do_not_use_when:
  - المطلوب fact-check محدد عن خبر أداة حديثة؛ استخدم research_fact_checker أولًا
  - المطلوب كتابة البرومبت نفسه؛ استخدم veo_video_prompt_builder أو image_prompt_builder
  - المطلوب تنفيذ تقني داخل مشروع؛ استخدم safe_agent_command
conflicts_with:
  - research_fact_checker
  - veo_video_prompt_builder
  - image_prompt_builder
---

# Skill: ai_tool_selection_advisor

## Purpose

Recommend the best AI tool or workflow for Hossam's creative/technical task, prioritizing practical output over hype.

## Hossam's Known Tool Context

Consider these as available unless Hossam says otherwise:
- Sora.
- Veo.
- HeyGen.
- ComfyUI locally.
- Powerful PC with RTX 2080 Ti 11GB, 64GB RAM.

## Current-Info Rule

Do not recommend a newly changed tool, price, plan, model limit, or policy based on memory. If the decision depends on current availability, use fact checking.

## Decision Matrix

Evaluate against:

| Need | Best-fit consideration |
|---|---|
| Realistic cinematic video | Sora / Veo, depending on prompt control and policy |
| Arabic voice + lip-sync | HeyGen / Veo if proven in user's workflow |
| Image-to-video quick motion | Minimax / Runway / Veo depending on availability |
| Stable character identity | Reference workflow + character consistency skill |
| Local control | ComfyUI / local models, limited by RTX 2080 Ti VRAM |
| Speed | Fast cloud tools or simple hybrid pipeline |
| Cost | Existing subscriptions before new spending |
| Control | Workflow with image reference + separate audio/lip-sync |

## Principle

Do not choose the strongest tool. Choose the fastest workflow that can produce the required result at acceptable quality.

## Output Format

```text
أفضل اختيار للمهمة:
[tool/workflow]

لماذا:
[reasons]

متى لا نستخدمه:
[limits]

Workflow عملي:
1. [step]
2. [step]
3. [step]

الخلاصة:
[decision]
```

## Quality Checklist

- Tool chosen for requirement, not hype.
- Limitations stated.
- Hossam's existing subscriptions considered.
- Current claims verified when needed.
- Workflow is realistic.
