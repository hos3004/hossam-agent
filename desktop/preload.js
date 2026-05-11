/**
 * Preload script — exposes a tiny, safe surface to the page so the
 * companion-mode overlay can ask Electron to resize the window when
 * the chat panel is toggled.
 *
 * Runs with contextIsolation=true: only `window.electronAPI` is exposed,
 * not the full ipcRenderer.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Ask the main process to grow/shrink the window when the chat
   * panel is opened/closed.
   * @param {boolean} open
   */
  toggleChat(open) {
    ipcRenderer.send("window:toggle-chat", !!open);
  },

  /** True so the page knows it is running inside Electron. */
  isElectron: true,
});
