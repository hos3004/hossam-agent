/*
 * Companion-mode bootstrap
 * ------------------------
 * Runs only when the page was loaded with `?mode=companion`. Two jobs:
 *
 *   1. Inject a small "×" close pill (Electron window has no native frame).
 *
 *   2. Periodically strip inline-style background-image / background-color
 *      from every element except the canvas, our overlay button, our
 *      close pill, and elements that look like a speech bubble. The
 *      stylesheet (companion.css) already does this via `!important`, but
 *      React may write inline styles that win in some cases. This is a
 *      defensive fallback.
 */
(function () {
  "use strict";
  if (window.__geminiCompanionInitLoaded) return;
  window.__geminiCompanionInitLoaded = true;

  // ---- Close button -------------------------------------------------------
  function injectCloseButton() {
    if (document.querySelector(".gl-companion-close")) return;
    const btn = document.createElement("button");
    btn.className = "gl-companion-close";
    btn.title = "Close (stays in tray)";
    btn.innerHTML = "×";
    btn.addEventListener("click", () => window.close());
    document.body.appendChild(btn);
  }

  // ---- Background scrubber -----------------------------------------------
  // Allow-list: elements that may keep their inline background.
  const KEEP_BG_SELECTORS = [
    "canvas",
    ".gl-overlay-root",
    ".gl-overlay-root *",
    ".gl-companion-close",
  ];
  const KEEP_BG_CLASS_HINTS = ["bubble", "speech", "subtitle", "caption"];

  function isKeepBg(el) {
    if (KEEP_BG_SELECTORS.some((sel) => el.matches(sel))) return true;
    const cls = (el.className || "") + "";
    return KEEP_BG_CLASS_HINTS.some((h) => cls.toLowerCase().includes(h));
  }

  function stripInlineBackgrounds(root) {
    const all = root.querySelectorAll("*");
    for (const el of all) {
      if (!el.style) continue;
      if (isKeepBg(el)) continue;
      // Only touch elements that actually have an inline background set,
      // so we don't fight every React re-render unnecessarily.
      const s = el.style;
      if (
        s.backgroundImage ||
        s.background ||
        (s.backgroundColor && s.backgroundColor !== "transparent")
      ) {
        s.setProperty("background", "transparent", "important");
        s.setProperty("background-image", "none", "important");
      }
    }
  }

  function start() {
    injectCloseButton();
    stripInlineBackgrounds(document);

    // React keeps re-rendering — keep scrubbing on each DOM mutation,
    // but rate-limited so we don't burn CPU.
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        stripInlineBackgrounds(document);
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
