# Hossam Desk Companion — Project Map

## Overview
Open-LLM-VTuber v1.2.1 customized as an **Arabic-first desktop AI companion** for Hossam, fully migrated to **Google Gemini** for LLM, ASR, TTS, translation, and real-time bidirectional voice. Skill prompts are injected at the system-prompt layer — no core engine modifications.

## Key Files

| File | Purpose |
|------|---------|
| `conf.yaml` | Main config — Hossam persona + Gemini LLM/ASR/TTS/Live settings |
| `.env` | `GEMINI_API_KEY` for the lab; the main app reads keys from `conf.yaml` |
| `characters/hossam_desk_companion.yaml` | Alt character config for runtime switching |
| `hdc/skill_loader.py` | Parses `/skills/*/SKILL.md` with YAML frontmatter via `yaml.safe_load()` |
| `hdc/hdc_logger.py` | Structured logger for HDC operations |
| `src/open_llm_vtuber/service_context.py` | Injects skills section in `construct_system_prompt()` |
| `skills/` | 18 skill subdirectories, each with `SKILL.md` |
| `labs/gemini-live-voice-lab/` | Standalone Node+React reference for Gemini Live patterns |
| `doc/LIVE_MODE.md` | Wire protocol + frontend integration guide for Live Mode |
| `live_mode_overlay/overlay.js` | Floating "Live Mode" button injected into the main UI |

## Architecture

```
conf.yaml ───────────────┐
  character_config ──┐   │
    persona_prompt ┐ │   │
                   ▼ ▼   ▼
service_context.py::construct_system_prompt()
  ├── loads persona_prompt from config
  ├── appends tool prompts (live2d, mcp, etc.)
  ├── appends skills section  ← HDC injection
  └── returns final system_prompt → AgentFactory → Agent (LLM)

  AgentFactory   ┌── basic_memory_agent → gemini_native_llm  (normal mode)
                 └── gemini_live_agent                      (Live Mode)

  /client-ws  ──── normal turn-based flow  (mic-audio-data → ASR → LLM → TTS)
  /live-ws    ──── Gemini Live (bidirectional)  (live-mic-audio → Live → live-audio)
```

## Gemini Stack (all defaults)

| Layer | Provider | Model | Notes |
|---|---|---|---|
| **LLM** | `gemini_native_llm` | `gemini-2.5-flash` | Native google-genai SDK |
| **ASR** | `gemini_asr` | `gemini-2.5-flash` | Multimodal audio understanding |
| **TTS** | `gemini_tts` | `gemini-2.5-flash-preview-tts` | Prebuilt voice "Kore", `ar-XA` |
| **Live** | `gemini_live_agent` | `gemini-live-2.5-flash-preview` | Voice "Aoede", `ar-XA` |
| **Translate** | `gemini` provider | `gemini-2.5-flash-lite` | For audio translation feature |

All other engines (Ollama, Edge-TTS, Faster-Whisper, Sherpa-ONNX, Claude, …) remain installed as fallback — switching is one line in `conf.yaml`.

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

## Live Mode

A floating button injected into the main page lets the user open a real-time
voice channel with Gemini Live without switching the main conversation agent.

- **Backend**: `src/open_llm_vtuber/agent/agents/gemini_live_agent.py` +
  `routes.py::init_live_mode_route` (the `/live-ws` endpoint).
- **Frontend overlay**: `live_mode_overlay/overlay.js`, served at
  `/live-mode-overlay/overlay.js` and injected into `frontend/index.html`
  by a custom `/` route in `server.py`. No edits to the frontend submodule.
- **Wire protocol**: documented in `doc/LIVE_MODE.md`.
- **Lip-sync**: best-effort client-side, drives `ParamMouthOpenY` from PCM
  RMS of each audio chunk if the Live2D model is reachable on `window`.

## Customization Points

### Skill Injection Layer (system prompt)
- `service_context.py:construct_system_prompt()` appends skills section after tool prompts
- The same system_prompt is passed to both `basic_memory_agent` and `gemini_live_agent`,
  so skills are active in both normal and Live modes.

### Persona
- Arabic-first (Egyptian Arabic), practical productivity companion
- Configurable via `conf.yaml` character_config or `characters/*.yaml`

## Configuration

- **LLM**: `gemini_native_llm` with `gemini-2.5-flash`
- **ASR**: `gemini_asr` (auto-language with "Arabic" hint)
- **TTS**: `gemini_tts` with voice "Kore" at `ar-XA`
- **Live**: `gemini_live_agent` with voice "Aoede" at `ar-XA`
- **VAD**: Silero VAD (still local)

## One-click Launch

- `start.bat` at repo root — checks `uv`, syncs deps, creates `conf.yaml` from
  template if missing, starts `run_server.py`, opens browser at port 12393.
- `labs/gemini-live-voice-lab/start.bat` — launches the standalone Gemini
  Live reference at port 5173.

## Git Branches

- `main` — production branch with HDC + Gemini stack customizations
- `claude/condescending-easley-5f3fe8` — active worktree where the Gemini
  migration was implemented; should be merged into `main`
- `feature/gemini-live-lab-import` — parallel branch with an alternative
  AudioWorklet-based lab; kept as a reference, not merged
- `backup-hossam-desk-companion-initial` — clean v1.2.1 backup at `3afa410`
- `backup-before-arabic-tts-config` — backup taken before HDC TTS work

## Orphans & Pending

### Deferred Features
- **Desktop pet/window mode** — overlay/standalone companion window is a future
  enhancement; the floating Live Mode button is a step in that direction but
  still lives inside the main browser tab.

### Do Not Commit
- `conf.yaml.backup`, `conf.yaml.before-gemini-stack` — local backups taken
  before reconfiguration; keep outside git
- `hossam_desk_companion_skills_v0_2/` — redundant source copy; only `skills/`
  should be deployed.
- `startup.log`, `startup.err` — stale runtime artifacts.
- `cache/`, `chat_history/`, `logs/` — runtime data.

### Future Improvements (not implemented)
- Priority-based skill truncation: when context is tight, skip `medium`-priority
  skills or compress to ID + purpose only.
- `SkillLoader.skills_dir` configurable via conf.yaml rather than hardcoded.
- MCP / tool-calling in Live Mode (currently only the normal agent path supports
  it; the Live agent has the plumbing but doesn't wire MCP yet).
- Session resumption for Live Mode (long sessions > 15 min).
- AudioWorklet replacement for the deprecated `ScriptProcessorNode` in the
  overlay (see `feature/gemini-live-lab-import` for a reference impl).
- Persistent chat history for Live Mode turns (currently in-memory only).
