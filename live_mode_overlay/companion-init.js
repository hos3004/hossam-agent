/*
 * Companion-mode bootstrap
 * ------------------------
 * Runs only when the page was loaded with `?mode=companion`. Jobs:
 *
 *   1. Inject a "×" close pill (Electron window has no native frame).
 *   2. Inject a chat-toggle pill that:
 *      - flips `body.gl-chat-open` to show/hide the chat panel,
 *      - asks Electron (via window.electronAPI.toggleChat) to grow or
 *        shrink the window to fit the chat layout.
 *   3. Find the Live2D <canvas> inside #root and walk back up to its
 *      top-level child of #root → tag it .gl-companion-keep.
 *      Every other top-level child gets .gl-companion-chrome so that
 *      companion.css can hide it (default) or show it as a chat panel
 *      (when body.gl-chat-open is set).
 *   4. A MutationObserver re-applies the structural rule on every
 *      React render.
 */
(function () {
  "use strict";
  if (window.__geminiCompanionInitLoaded) return;
  window.__geminiCompanionInitLoaded = true;

  // ---- Helpers ------------------------------------------------------------
  function topLevelAncestor(el, root) {
    let cur = el;
    while (cur && cur.parentElement !== root) cur = cur.parentElement;
    return cur;
  }

  // ---- Close button ------------------------------------------------------
  function injectCloseButton() {
    if (document.querySelector(".gl-companion-close")) return;
    const btn = document.createElement("button");
    btn.className = "gl-companion-close";
    btn.title = "Close (stays in tray)";
    btn.innerHTML = "×";
    btn.addEventListener("click", () => window.close());
    document.body.appendChild(btn);
  }

  // ---- Chat-toggle button ------------------------------------------------
  // Speech-bubble SVG (right-pointing tail → fits RTL UI)
  const ICON_CHAT_OPEN =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const ICON_CHAT_CLOSE =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function injectChatToggle() {
    if (document.querySelector(".gl-chat-toggle")) return;
    const btn = document.createElement("button");
    btn.className = "gl-chat-toggle";
    btn.title = "إظهار/إخفاء المحادثة (Toggle chat)";
    btn.innerHTML = ICON_CHAT_OPEN;
    btn.addEventListener("click", () => {
      const open = document.body.classList.toggle("gl-chat-open");
      btn.innerHTML = open ? ICON_CHAT_CLOSE : ICON_CHAT_OPEN;
      try {
        if (window.electronAPI && typeof window.electronAPI.toggleChat === "function") {
          window.electronAPI.toggleChat(open);
        }
      } catch (_) {}
    });
    document.body.appendChild(btn);
  }

  // ---- Structural keep/chrome tagging on #root children ----------------
  const OURS = new Set(["gl-overlay-root", "gl-companion-close", "gl-chat-toggle"]);

  function refreshLayout() {
    const root = document.getElementById("root");
    if (!root) return;
    const canvas = root.querySelector("canvas");
    if (!canvas) return;
    const keeper = topLevelAncestor(canvas, root);
    if (!keeper) return;

    for (const child of root.children) {
      const cls = child.classList;
      if (child === keeper) {
        cls.add("gl-companion-keep");
        cls.remove("gl-companion-chrome");
      } else {
        // Don't touch our own injected elements if they ever land under #root.
        if ([...cls].some((c) => OURS.has(c))) continue;
        cls.add("gl-companion-chrome");
        cls.remove("gl-companion-keep");
      }
    }
  }

  // ---- Boot --------------------------------------------------------------
  function start() {
    injectCloseButton();
    injectChatToggle();
    refreshLayout();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refreshLayout();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
