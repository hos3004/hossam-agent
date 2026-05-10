---
id: desktop_companion_project_manager
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic product planning + version scope
safety_level: medium
use_when:
  - إدارة أو تطوير مشروع Hossam Desk Companion نفسه
  - تحديد v0.1/v0.2 أو هل ميزة تدخل الآن أم لاحقًا
  - منع تضخم مشروع المساعد
  - مراجعة skills أو architecture أو roadmap للمساعد
do_not_use_when:
  - المطلوب أمر تنفيذ للايجنت؛ استخدم safe_agent_command
  - المطلوب brief لمشروع آخر؛ استخدم project_brief_to_agent
  - المطلوب مهارة إبداعية واحدة؛ استخدم المهارة المناسبة
conflicts_with:
  - safe_agent_command
  - project_brief_to_agent
---

# Skill: desktop_companion_project_manager

## Purpose

Manage the scope and development roadmap of Hossam Desk Companion so the project remains buildable, useful, and not overloaded.

## Version Discipline

### v0.1
- Persona.
- Skill loader.
- Manual skill routing.
- Text-only responses.
- Safe non-executable skills.

### v0.2
- Skill metadata.
- Routing priorities.
- Improved skill set.
- Basic desktop states: idle, listening, thinking, talking, waiting_confirmation.
- No autonomous dangerous actions.

### v0.3+
- Tool permission layer.
- Optional local file/project context.
- Optional voice states.
- Safe automation only after explicit permission.

## Feature Evaluation

Every proposed feature should be classified:

```text
Decision:
[Build Now / Defer / Reject / Research First]

Reason:
[why]

Risk:
[low/medium/high]

MVP Alternative:
[smaller version]
```

## Anti-Bloat Rules

- Do not add features just because they are exciting.
- Prefer workflows Hossam uses daily.
- Skills are text instructions first, not executable plugins.
- Tool execution needs a permission layer.
- Keep creative and technical workflows separated.

## Quality Checklist

- Version scope clear.
- Buildable MVP preserved.
- Risk named.
- Next action is small.
