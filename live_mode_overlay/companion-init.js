/*
 * Companion-mode bootstrap
 * ------------------------
 * Runs only when the page was loaded with `?mode=companion`. Three jobs:
 *
 *   1. Inject a "×" close pill (Electron window has no native frame).
 *
 *   2. Find the Live2D <canvas> inside #root, walk back up to its
 *      top-level child of #root, mark it with .gl-companion-keep, and
 *      mark every other top-level child of #root with .gl-companion-hidden.
 *      That single structural rule eliminates the sidebar, the background
 *      image wrapper, the connected pill, the speech bubble, and the
 *      bottom controls in one move — without depending on any specific
 *      Chakra UI class name.
 *
 *   3. Keep watching the DOM with a MutationObserver: when React
 *      re-renders and the canvas moves under a new sibling, we re-tag
 *      siblings so chrome stays hidden.
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

  // ---- Find the top-level child of #root that contains the canvas ------
  function topLevelAncestor(el, root) {
    let cur = el;
    while (cur && cur.parentElement !== root) cur = cur.parentElement;
    return cur;
  }

  function refreshLayout() {
    const root = document.getElementById("root");
    if (!root) return;
    const canvas = root.querySelector("canvas");
    if (!canvas) return;

    const keeper = topLevelAncestor(canvas, root);
    if (!keeper) return;

    for (const child of root.children) {
      if (child === keeper) {
        if (!child.classList.contains("gl-companion-keep")) {
          child.classList.add("gl-companion-keep");
        }
        child.classList.remove("gl-companion-hidden");
      } else {
        // Don't hide our own overlay elements if they ever land here.
        if (child.classList.contains("gl-overlay-root")) continue;
        if (child.classList.contains("gl-companion-close")) continue;
        if (!child.classList.contains("gl-companion-hidden")) {
          child.classList.add("gl-companion-hidden");
        }
      }
    }
  }

  function start() {
    injectCloseButton();
    refreshLayout();

    // React keeps re-rendering — keep re-applying our structural rule,
    // throttled with requestAnimationFrame to avoid burning CPU.
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refreshLayout();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
