# Hossam Agent — Desktop Companion Shell

A thin Electron wrapper that turns the existing Open-LLM-VTuber web app
into a **frameless, transparent, always-on-top desktop companion**. It does
not change anything in the Python core — it just spawns the backend,
points a custom BrowserWindow at `http://localhost:12393/?mode=companion`,
and provides a tray menu for window controls.

## Architecture

```
┌─────────────────────────────────────────┐
│  Electron main process (desktop/main.js) │
│  ├── spawns:  uv run run_server.py  ────┐
│  ├── polls:   GET /openapi.json (200)   │
│  ├── opens:   /?mode=companion          │
│  └── tray:    Show/Hide • Open Full     │
│                 • Always on Top         │
│                 • Click Through         │
│                 • Restart Backend       │
│                 • Quit                  │
└─────────────────────────────────────────┘
           │                       ▲
           ▼                       │
┌────────────────────────────────────────┐
│  FastAPI on localhost:12393            │
│  /  (GET ?mode=companion)              │
│      → serves index.html + injects:    │
│        live_mode_overlay/overlay.js    │
│        live_mode_overlay/companion.css │
│        live_mode_overlay/companion-init.js │
│  /live-ws  (Gemini Live)               │
│  /client-ws  (normal chat)             │
└────────────────────────────────────────┘
```

## Companion-mode visual changes

When the page is loaded with `?mode=companion`, two extra assets are
injected by the existing `/` route:

| File | Purpose |
|---|---|
| `live_mode_overlay/companion.css` | Transparent page, 28 px drag strip at top, hides common chrome (sidebar/toolbar/settings/message-list), stretches the Live2D `<canvas>` to fill the window. |
| `live_mode_overlay/companion-init.js` | Adds a small "×" close button at the top-right (no native frame). |

The hide rules use generic attribute selectors (`[class*="sidebar" i]`,
etc.) so they don't rely on knowing exact React class names. If the
upstream frontend submodule changes, the worst-case is some chrome peeks
through — the underlying functionality is unaffected.

## Run (dev)

```bash
cd desktop
npm install
npm start
```

Or double-click the launcher at the repo root:

```
H:\projects\yama\desktop\start_desktop.bat
```

The first run installs Electron (~280 MB) and electron-builder. After
that, `npm start` is fast.

## Build a Windows installer (`.exe`)

```bash
cd desktop
npm run build:win
```

The installer is written to `desktop/dist/`. **Note**: this only packages
the Electron shell — the Python backend is still run from the repo via
`uv run run_server.py`, so the installer requires the repo to be present
on the machine. (PyInstaller-based bundling of the Python side is a
follow-up; out of scope for this feature.)

## Tray menu

| Item | Behavior |
|---|---|
| Show / Hide | Toggle window visibility (stays in tray when hidden) |
| Open Full App | Opens `http://localhost:12393/` in the default browser (full UI) |
| Always on Top | Toggle pinning the window above other windows |
| Click Through | When enabled, mouse events pass through the window to whatever is underneath. Use it to keep the avatar visible while you keep working. |
| Restart Backend | Kill the spawned `uv run run_server.py` and start it again, then reload the window |
| Quit | Stop backend + exit Electron |

## What's NOT changed

- The **frontend submodule** is not modified. All companion-mode tweaks
  live in `live_mode_overlay/` (already part of the repo) and are
  conditionally injected by the existing `/` route based on the query
  string.
- `conf.yaml`, character configs, persona prompts, and the Gemini API key
  are untouched. The desktop shell talks to the same backend the browser
  does.
- The normal browser flow at `http://localhost:12393/` continues to work
  exactly as before — only the `?mode=companion` variant is new.

## Files added by this feature

```
desktop/
├── main.js                       Electron main process
├── package.json                  npm + electron-builder config
├── tray-icon.png                 64×64 indigo "H" icon for the tray
├── app-icon.png                  256×256 icon for the window / installer
├── start_desktop.bat             one-click launcher
└── README.md                     this file

live_mode_overlay/
├── companion.css                 companion-mode visual rules
└── companion-init.js             close button injection

src/open_llm_vtuber/server.py     extended `/` route to accept ?mode=companion
```

## Known limitations / follow-ups

- The CSS hide rules are heuristic. If they miss a panel, add a more
  specific selector to `companion.css`.
- The installer (`.exe`) does not bundle Python yet — the user still
  needs `uv` available on PATH and the repo locally.
- No system tray notification badges yet (Live Mode active / mic muted).
- No system-wide hotkey to toggle the window — could be added with
  `globalShortcut.register()` later.
- Drag region is a 28 px strip at the top. A more polished drag pattern
  (e.g. drag-from-anywhere-empty) would need DOM cooperation that the
  current frontend doesn't provide.
