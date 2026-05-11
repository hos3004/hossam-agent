/**
 * Hossam Agent — Desktop Companion shell (Electron).
 *
 * Responsibilities:
 *   1. Spawn the Python backend (`uv run run_server.py`) as a child process.
 *   2. Wait until the FastAPI server is responsive on port 12393.
 *   3. Open a transparent, frameless, always-on-top BrowserWindow on
 *      http://localhost:12393/?mode=companion .
 *   4. Provide a tray icon with: Open Full App, Toggle Always on Top,
 *      Toggle Click Through, Restart Backend, Quit.
 *   5. Clean up the backend child process on quit.
 *
 * This shell does NOT modify the existing core. Companion UI tweaks live
 * server-side as a `?mode=companion` query branch in the existing `/`
 * route (see src/open_llm_vtuber/server.py).
 */

"use strict";

const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, "..");
const BACKEND_PORT = 12393;
const BACKEND_HOST = "127.0.0.1";
const COMPANION_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/?mode=companion`;
const FULL_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/`;
const BACKEND_READY_PATH = "/openapi.json";
const BACKEND_BOOT_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let mainWindow = null;
let tray = null;
let backendProcess = null;
let clickThrough = false;
let alwaysOnTop = true;
let backendStarting = false;

// ---------------------------------------------------------------------------
// Backend lifecycle
// ---------------------------------------------------------------------------
function spawnBackend() {
  console.log(`[backend] cwd=${REPO_ROOT}`);
  console.log(`[backend] cmd: uv run run_server.py`);
  const proc = spawn("uv", ["run", "run_server.py"], {
    cwd: REPO_ROOT,
    shell: true,
    windowsHide: true,
    env: { ...process.env },
  });
  proc.stdout.on("data", (d) => process.stdout.write(`[backend] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[backend] ${d}`));
  proc.on("close", (code) => {
    console.log(`[backend] exited with code ${code}`);
  });
  proc.on("error", (err) => {
    console.error("[backend] spawn error:", err.message);
  });
  return proc;
}

function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: BACKEND_HOST, port: BACKEND_PORT, path: BACKEND_READY_PATH, timeout: 1500 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(timeoutMs = BACKEND_BOOT_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await pingBackend()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureBackend() {
  if (await pingBackend()) {
    console.log("[backend] already running externally; reusing");
    return true;
  }
  if (backendStarting) return waitForBackend();
  backendStarting = true;
  backendProcess = spawnBackend();
  const ok = await waitForBackend();
  backendStarting = false;
  return ok;
}

async function restartBackend() {
  console.log("[backend] restart requested");
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 2000));
    backendProcess = null;
  }
  const ok = await ensureBackend();
  if (ok && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(COMPANION_URL);
  }
  refreshTray();
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 280,
    minHeight: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: alwaysOnTop,
    backgroundColor: "#00000000",
    hasShadow: false,
    skipTaskbar: false,
    show: false,
    icon: path.join(__dirname, "app-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  // Keep the window pinned. Re-apply after focus changes in case Windows
  // demotes the level.
  mainWindow.on("blur", () => {
    if (mainWindow && alwaysOnTop) mainWindow.setAlwaysOnTop(true, "screen-saver");
  });
  mainWindow.loadURL(COMPANION_URL);
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Show / Hide",
      click: () => {
        if (!mainWindow) return createWindow();
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      },
    },
    { label: "Open Full App", click: () => shell.openExternal(FULL_URL) },
    { type: "separator" },
    {
      label: "Always on Top",
      type: "checkbox",
      checked: alwaysOnTop,
      click: () => {
        alwaysOnTop = !alwaysOnTop;
        if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop, "screen-saver");
        refreshTray();
      },
    },
    {
      label: "Click Through",
      type: "checkbox",
      checked: clickThrough,
      click: () => {
        clickThrough = !clickThrough;
        if (mainWindow) {
          mainWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
        }
        refreshTray();
      },
    },
    { type: "separator" },
    { label: "Restart Backend", click: restartBackend },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function refreshTray() {
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(buildMenu());
  }
}

function createTray() {
  const iconPath = path.join(__dirname, "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Hossam Agent — Desktop Companion");
  tray.setContextMenu(buildMenu());
  tray.on("click", () => {
    if (!mainWindow) return createWindow();
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  console.log("[main] booting Hossam Agent Desktop");
  createTray();

  console.log("[main] ensuring backend is up...");
  const ok = await ensureBackend();
  if (!ok) {
    console.error("[main] backend failed to come up in time");
    // Still show the window so the user can see the error via /openapi
    // path failing; they can manually start the backend and click Restart.
  }
  createWindow();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (_) {}
  }
});

app.on("window-all-closed", () => {
  // Stay running in tray even when window is closed.
  // The user can quit explicitly via the tray menu.
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

// Single-instance lock so spawning a second .exe just focuses the existing one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}
