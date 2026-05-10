---
id: project_brief_to_agent
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic/English structured project brief
safety_level: medium
use_when:
  - تحويل فكرة مشروع إلى brief أو plan للايجنت أو للفريق
  - Planning only أو Research أو UI design أو Refactor plan بدون تنفيذ مباشر
  - وصف مشروع كبير قبل كتابة أمر التنفيذ
  - طلب خطة كاملة لكن ليس تعديل ملفات الآن
do_not_use_when:
  - المطلوب أمر تنفيذ للايجنت يعدل ملفات؛ استخدم safe_agent_command
  - المطلوب إدارة مشروع Hossam Desk Companion نفسه؛ استخدم desktop_companion_project_manager
  - المطلوب خطوة سيرفر مباشرة؛ استخدم wordpress_server_safety_helper
conflicts_with:
  - safe_agent_command
  - desktop_companion_project_manager
---

# Skill: project_brief_to_agent

## Purpose

Turn Hossam's project ideas into clear briefs for agents, developers, or planning sessions without causing uncontrolled implementation.

## Difference from safe_agent_command

- `project_brief_to_agent`: writes plan/brief/research/spec. No file edits by default.
- `safe_agent_command`: writes execution command with backup and verification.

If Hossam says “نفذ”، “اعمل تعديل”، “اكتب أمر للايجنت”، or provides repo/task for editing, hand off to `safe_agent_command`.

## Brief Types

1. **Planning Only** — architecture, assumptions, risks, questions.
2. **Execution Brief** — scope for later implementation, but not execution command.
3. **Debug Brief** — problem statement and expected investigation path.
4. **Refactor Brief** — goals, boundaries, files likely involved.
5. **Research Brief** — what to inspect and how to report findings.
6. **UI Design Brief** — layout, interactions, states, constraints.

## No Feature Creep Rule

Every brief must include:

```text
Out of Scope:
- [items that must not be added now]
```

## Planning Behavior

For planning-only prompts:
- The agent should think before coding.
- Identify assumptions.
- Ask questions if blockers exist.
- Wait for approval before implementation.

## Execution-Ready But Safe Template

```text
[ROLE]
You are a Staff Software Engineer and technical planner.

[PROJECT]
[name/context]

[GOAL]
[goal]

[ASSUMPTIONS]
- [assumption]

[REQUIREMENTS]
- [requirement]

[OUT OF SCOPE]
- [blocked feature creep]

[DELIVERABLE]
Produce a plan only. Do not modify files. Do not run commands. Wait for approval before execution.
```

## Verification Loop for Later Execution

Any execution plan should include:
- how to verify,
- what tests/builds to run,
- what acceptance criteria prove success.

## Quality Checklist

- Clear scope.
- Clear non-goals.
- No accidental execution.
- Approval checkpoint included.
- Can be converted to `safe_agent_command` later.
