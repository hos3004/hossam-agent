# Hossam Desk Companion — Project Map

## Overview
Open-LLM-VTuber v1.2.1 customized as an Arabic-first desktop AI companion for Hossam. Skills injection at the system prompt layer — no core engine modifications.

## Key Files

| File | Purpose |
|------|---------|
| `conf.yaml` | Main config — Hossam persona, LLM/ASR/TTS/VAD settings |
| `characters/hossam_desk_companion.yaml` | Alt character config for runtime switching |
| `hdc/skill_loader.py` | Parses `/skills/*/SKILL.md` with YAML frontmatter via `yaml.safe_load()` |
| `hdc/hdc_logger.py` | Structured logger for HDC operations |
| `hdc/__init__.py` | Exports `SkillLoader`, `SkillEntry`, `HDCLogger` |
| `src/open_llm_vtuber/service_context.py` | Injected `_get_skill_section()` in `construct_system_prompt()` (lines 43-50, 479-481) |
| `skills/` | 18 skill subdirectories, each with `SKILL.md` |

## Architecture

```
conf.yaml ──────────────────┐
  character_config ──────┐  │
    persona_prompt ────┐ │  │
                       ▼ ▼  ▼
service_context.py::construct_system_prompt()
  ├── loads persona_prompt from config
  ├── appends tool prompts (live2d, mcp, etc.)
  ├── appends skills section ← HDC injection
  └── returns final system_prompt → AgentFactory → LLM
                          ▲
hdc/skill_loader.py ──────┘
  └── reads skills/*/SKILL.md
  └── parses YAML frontmatter
  └── build_skills_section() → markdown string
```

## Skills System

18 skills loaded from `skills/*/SKILL.md`, each with YAML frontmatter:
- `id`, `version`, `priority`, `language`, `safety_level`
- `triggers`, `rules`, `conflicts_with`, `wins_over`, `do_not_use_when`
- Sections parsed: Purpose, Trigger, Rules, Output

### All Skills

| Skill | Priority | Domain |
|-------|----------|--------|
| ai_tool_selection_advisor | medium | AI tool recommendation |
| android_tv_app_helper | high | Android TV dev guidance |
| arabic_keyboard_typo_decoder | medium | Arabic keyboard typos |
| arabic_text_layout_for_design | high | Arabic RTL layout |
| arabic_voiceover_script_editor | high | Arabic voiceover scripts |
| daily_work_companion | medium | Daily productivity |
| desktop_companion_project_manager | high | Project scoping |
| image_prompt_builder | critical | Image gen prompts |
| infographic_slide_planner | high | Slide/info design |
| project_brief_to_agent | high | Agent briefs |
| prompt_refiner_full_output | high | Prompt refinement |
| reference_character_consistency | high | Consistent characters |
| research_fact_checker | high | Fact checking |
| safe_agent_command | critical | Safe agent commands |
| script_shortener_30sec | high | Script timing/shortening |
| story_to_scene_generator | high | Story breakdown |
| veo_video_prompt_builder | critical | Video gen prompts |
| wordpress_server_safety_helper | critical | WordPress/server safety |

## Customization Points

### Skill Injection Layer (system prompt)
- `service_context.py:479-481` — appends skills section after tool prompts
- No changes to `websocket_handler.py`, no MCP, no code execution

### Persona
- Arabic-first (Egyptian Arabic), practical productivity companion
- Configurable via `conf.yaml` character_config or `characters/*.yaml`

## Configuration

- **LLM**: Defaults to `ollama_llm` with `qwen2.5-coder:7b` (configurable)
- **ASR**: Defaults to `sherpa_onnx_asr` (SenseVoice)
- **TTS**: Defaults to `edge_tts` (en-US-AvaMultilingualNeural)
- **VAD**: Disabled by default (`null`), Silero VAD configured

## Git Branches

- `main` — production branch with HDC customizations
- `backup-hossam-desk-companion-initial` — clean v1.2.1 backup at commit `3afa410`
- `feature/gemini-live-lab-import` — Gemini Live Voice Lab (isolated)

## Gemini Live Voice Lab
- Imported under `labs/gemini-live-voice-lab/`
- Isolated from main Open-LLM-VTuber app
- Uses local WebSocket bridge (`/ws/gemini-live`)
- `GEMINI_API_KEY` remains backend-only
- Not merged into main voice flow yet
- Future task: connect lab voice events to avatar states

## Orphans & Pending

### Deferred Features
- **Arabic TTS voice** — not configured yet. Current TTS uses `en-US-AvaMultilingualNeural`. Should switch to e.g. `ar-EG-SalmaNeural` when Arabic voice output is needed.
- **Arabic ASR optimization** — not configured yet. Current ASR uses SenseVoice (multilingual, supports Arabic).
- **Desktop pet/window mode** — not finalized yet. Overlay/standalone companion window is a future enhancement.

### Do Not Commit
- `hossam_desk_companion_skills_v0_2/` — redundant source copy; only `skills/` should be deployed.
- `startup.log`, `startup.err` — stale runtime artifacts from test runs.

### Future Improvements (not implemented)
- Priority-based skill truncation: when context is tight, skip `medium`-priority skills or compress to ID + purpose only.
- `SkillLoader.skills_dir` should be configurable via conf.yaml rather than hardcoded relative path.
- Full skills text (not just summary) could be injected for high/critical skills via a separate configuration flag.
