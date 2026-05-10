---
id: android_tv_app_helper
version: 0.2.0
priority: high
language: ar-EG-first
output_language: Arabic guidance + Kotlin/Flutter code when requested
safety_level: medium
use_when:
  - Android TV أو Kotlin أو Flutter TV أو ExoPlayer/Media3 أو HLS/m3u8
  - Daawah TV أو Streamit API أو BrowseSupportFragment أو MainFragment
  - TV remote أو D-pad أو FocusNode أو focusable views
  - TvShowDetailsActivity أو PlaybackActivity
do_not_use_when:
  - المطلوب أمر للايجنت؛ استخدم safe_agent_command مع قواعد هذه المهارة داخل الأمر
  - المطلوب سيرفر/ووردبريس لا تطبيق؛ استخدم wordpress_server_safety_helper
  - المطلوب اختيار أداة AI لا تطوير تطبيق؛ استخدم ai_tool_selection_advisor
conflicts_with:
  - safe_agent_command
  - wordpress_server_safety_helper
  - ai_tool_selection_advisor
---

# Skill: android_tv_app_helper

## Purpose

Help Hossam build and improve Android TV apps using Kotlin Native or Flutter, especially Daawah TV streaming, HLS playback, and API-based TV content apps.

## Mandatory Focus Checklist

Every TV screen must be designed for remote/D-pad navigation.

### Flutter
- Use `FocusNode()` for every navigable element.
- Set `autofocus: true` on the first visible actionable element.
- Use `FocusTraversalGroup` where helpful.
- Test with keyboard D-pad/remote, not mouse.
- Make focus state visible.
- Dispose all `FocusNode`s.

### Kotlin Android TV
- Ensure actionable views are `focusable` and `focusableInTouchMode` when needed.
- Define predictable `nextFocus*` behavior when layout is complex.
- Keep back behavior clear.
- Highlight focused cards/buttons visibly.
- Avoid tiny click-only UI.

## Playback Rules

### Kotlin
- Prefer Media3/ExoPlayer.
- Handle lifecycle: create, prepare, play, pause, release.
- Handle HLS `.m3u8` streams.
- Keep full-screen back/exit behavior predictable.

### Flutter
- Use TV-compatible player package only after checking D-pad and lifecycle behavior.
- Avoid WebView unless Hossam explicitly asks.

## Daawah TV API Rule

For Daawah TV content, use only:

```text
https://daawah.tv/wp-json/streamit/api/v1/content
```

- Do not use WordPress default REST API unless Hossam explicitly requests it.
- Do not assume ACF fields.
- TV Shows and episodes should come from the same Streamit API.

## Common Hossam Screens

- `MainFragment`
- `BrowseSupportFragment`
- `PlaybackActivity`
- `TvShowDetailsActivity`
- Splash screen
- Live broadcast screen
- Program grid
- Episode grid, often 5 columns

## Response Rules

- Preserve existing architecture.
- Do not rewrite the whole app unless requested.
- For full code requests, provide complete files.
- For agent execution, hand off to `safe_agent_command` and include backup first.
- If app code is missing, ask for the relevant file once; if enough context exists, continue with assumptions.

## Quality Checklist

- Remote navigation considered.
- Focus state visible.
- First focus set.
- HLS playback lifecycle safe.
- Daawah API rule respected.
- No WebView unless requested.
