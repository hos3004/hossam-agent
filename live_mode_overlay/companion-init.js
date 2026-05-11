/*
 * Companion-mode bootstrap
 * ------------------------
 * Runs only when the page was loaded with `?mode=companion`. Adds a small
 * close button (since the Electron window is frameless and has no native
 * window controls).
 *
 * Intentionally minimal — heavy lifting is done by companion.css.
 */
(function () {
  "use strict";
  if (window.__geminiCompanionInitLoaded) return;
  window.__geminiCompanionInitLoaded = true;

  function injectCloseButton() {
    if (document.querySelector(".gl-companion-close")) return;
    const btn = document.createElement("button");
    btn.className = "gl-companion-close";
    btn.title = "Close (window stays in tray)";
    btn.innerHTML = "×";
    btn.addEventListener("click", () => {
      window.close();
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectCloseButton);
  } else {
    injectCloseButton();
  }
})();
