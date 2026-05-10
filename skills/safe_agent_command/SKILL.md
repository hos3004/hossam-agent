---
id: safe_agent_command
version: 0.2.0
priority: critical
language: ar-EG-first
output_language: Arabic instructions + English agent command block
safety_level: high
use_when:
  - اكتب أمر للايجنت أو Claude Code/Codex/Roo/MaxClaw يعمل تعديل في مشروع
  - تنفيذ أو refactor أو debug أو CI أو GitHub issue/PR
  - أي مهمة تقنية فيها تعديل ملفات أو كود أو workflow
  - طلب يحتوي كلمة agent أو ايجنت أو نفذ الخطوات
do_not_use_when:
  - المطلوب تخطيط عام فقط بدون تنفيذ؛ استخدم project_brief_to_agent ولكن مع قواعد النسخ الاحتياطي إذا سيتحول لتنفيذ
  - المطلوب خطوة سيرفر واحدة مباشرة؛ استخدم wordpress_server_safety_helper
  - المطلوب شرح كود فقط بدون أمر تنفيذ
conflicts_with:
  - project_brief_to_agent
  - wordpress_server_safety_helper
  - android_tv_app_helper
wins_over:
  - project_brief_to_agent
  - android_tv_app_helper
  - wordpress_server_safety_helper
---

# Skill: safe_agent_command

## Purpose

Generate safe, disciplined commands for coding agents so they can modify projects without damaging Hossam's work, production systems, Git history, or important files.

This skill wins whenever the user asks for an agent command, even if the task also relates to WordPress, Android TV, UI, or AI tools.

## Mandatory Backup Protocol

Every execution prompt must begin with a backup/checkpoint step.

### If Git exists

```bash
git status --short
# If the tree is clean:
git checkout -b backup-[task-slug]-$(date +%Y%m%d-%H%M)
git add .
git commit -m "Backup before [task description]"
```

If the tree is dirty:
- Do not clean it silently.
- Do not discard changes.
- Stop and report changed files.
- Ask Hossam whether to commit, stash, or review.

### If no Git exists

Create a timestamped copy of the affected files/folders before editing and report its path.

## PROJECT_MAP.md Rule

For medium/large projects, the agent must first create or update `PROJECT_MAP.md` containing:

- App purpose.
- Main folders.
- Important entry points.
- Build/run/test commands.
- Risk areas.
- Files touched in this task.

The agent must read this map before changing files.

## Prompt Types

Always classify the agent command:

1. **Planning Prompt** — analyze and propose; no file edits.
2. **Execution Prompt** — modify files; must backup first.
3. **Debug Prompt** — reproduce, isolate, fix, test.
4. **Refactor Prompt** — improve structure without feature creep.
5. **Research Prompt** — inspect docs/source and summarize.
6. **UI Design Prompt** — layout/design implementation with constraints.

## Absolute Rules

The agent must not:
- Force push.
- Run destructive cleanup.
- Delete unknown files.
- Rewrite large areas without scope.
- Change production config unless explicitly requested.
- Expose or print secrets.
- Assume missing credentials.
- Use WordPress default REST API for Daawah TV unless Hossam explicitly asks.
- Ignore failing tests.

## Execution Prompt Template

```text
[ROLE]
You are a Staff Software Engineer and safe coding agent working on Hossam's project.

[MISSION]
[clear task]

[MANDATORY SAFETY CHECKPOINT — DO FIRST]
1. Run `git status --short`.
2. If clean, create backup branch:
   `git checkout -b backup-[task-slug]-YYYYMMDD-HHMM`
3. Commit current state before modifications:
   `git add . && git commit -m "Backup before [task]"`
4. If the tree is dirty, stop immediately and report the changed files. Do not overwrite, stash, discard, or clean anything without Hossam's approval.

[PROJECT MAP]
- Read existing PROJECT_MAP.md if present.
- If missing and the project is medium/large, create it before editing.

[SCOPE]
- Only change files required for this task.
- No feature creep.
- Preserve existing architecture unless explicitly instructed.

[IMPLEMENTATION RULES]
- [task-specific rules]

[VERIFICATION]
- Run relevant tests/build/lint if available.
- If tests cannot run, explain why.
- Provide a concise summary of files changed and verification result.

[FORBIDDEN]
- No force push.
- No destructive commands.
- No production changes.
- No secret exposure.
```

## Debug Prompt Additions

For debugging, require:
- reproduce the issue,
- identify root cause,
- patch the smallest area,
- add/adjust test if practical,
- verify the exact failure is gone.

## Quality Checklist

- Backup step is first.
- Dirty tree behavior is explicit.
- Scope is bounded.
- PROJECT_MAP rule included for larger tasks.
- No force push.
- Verification is required.
