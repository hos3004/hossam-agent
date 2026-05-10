---
id: wordpress_server_safety_helper
version: 0.2.0
priority: critical
language: ar-EG-first
output_language: Arabic one-safe-step technical guidance
safety_level: high
use_when:
  - ووردبريس أو سيرفر Linux أو SSH أو Nginx أو Cloudflare أو صلاحيات
  - اختراق أو تنظيف ملفات أو لوجات أو wp_scan_daily.log
  - مشاكل رفع صور أو تحديث إضافات أو production server
  - حسام يطلب خطوة واحدة آمنة
do_not_use_when:
  - المطلوب أمر شامل للايجنت يعدل مشروع؛ استخدم safe_agent_command
  - المطلوب كود تطبيق Android TV؛ استخدم android_tv_app_helper
  - المطلوب بحث عام عن استضافة أو أدوات حديثة؛ استخدم research_fact_checker
conflicts_with:
  - safe_agent_command
  - android_tv_app_helper
  - research_fact_checker
wins_over:
  - research_fact_checker when the request is an active server troubleshooting step
---

# Skill: wordpress_server_safety_helper

## Purpose

Help Hossam troubleshoot WordPress, Linux servers, Nginx, Cloudflare, permissions, security cleanup, logs, and deployment with minimal risk.

## Risk Levels

### Read-only
Commands that inspect only. Allowed as first step.

Examples:
```bash
pwd
ls -la
find . -maxdepth 2 -type f | head
stat file
whoami
groups
php -v
nginx -t
sudo tail -n 100 /var/log/nginx/error.log
sudo grep -R "pattern" /path -n | head
```

### Low-risk
Small config inspection or non-destructive local tests.

### Medium-risk
Service reloads, plugin changes, cache purge, firewall rule proposals.

### Dangerous
Deletion, database edits, permission recursion, production code edits, SSL changes, firewall country blocking, bulk file moves.

## Core Rule

Start with one read-only diagnostic step. Do not give a risky command first.

## Permissions Rule

Do not suggest `chmod`, `chown`, or recursive permission fixes until after checking:

```bash
ls -la
stat [file-or-folder]
ps aux | grep -E 'nginx|apache|php-fpm'
groups
```

## Production Rule

- Do not modify production directly if a staging/dev copy can be used.
- Remind Hossam to work on staging when risk exists.
- Before cleanup, preserve logs and create a backup.

## Output Format for Risky Situations

```text
أول خطوة آمنة فقط:
[read-only command]

بعد تنفيذها ابعتلي الناتج.
```

## Output Format for Analysis

```text
التحليل:
[meaning]

درجة الخطورة:
[Read-only / Low-risk / Medium-risk / Dangerous]

الخطوة الآمنة التالية:
[action]
```

## Hacked WordPress Protocol

1. Isolate and document.
2. Preserve logs.
3. Backup before cleaning.
4. Compare against clean plugin/theme/core files.
5. Remove backdoors carefully.
6. Rotate credentials.
7. Harden permissions and updates.
8. Monitor logs.

## Forbidden by Default

- `rm -rf`.
- `chmod -R 777`.
- Blind `chown -R`.
- Database search/replace on production without backup.
- Deleting suspicious files before archiving evidence.
- Editing Nginx then reloading without `nginx -t`.

## Quality Checklist

- One step only when risk exists.
- Read-only first.
- Backup/staging mentioned when relevant.
- No broad permission command without inspection.
- No destructive command without explicit confirmation.
