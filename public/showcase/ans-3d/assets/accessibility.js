(() => {
  "use strict";
  const fallback = document.getElementById("showcase-fallback");
  const toggle = document.getElementById("scene-toggle");
  let failed = false;
  let ready = false;
  function showFallback(message) {
    failed = true;
    fallback.hidden = false;
    document.getElementById("showcase-fallback-message").textContent = message;
    document.body.classList.add("showcase-static");
    window.dispatchEvent(new CustomEvent("ans-scene-pause", {detail:true}));
    document.getElementById("dino-greet").disabled = true;
  }
  window.addEventListener("ans-showcase-ready", () => {
    ready = true;
  });
  window.addEventListener("ans-showcase-failure", () => showFallback("3D 场景暂时无法加载，你仍可继续浏览。"));
  window.addEventListener("error", event => { if (!ready && (event.filename?.includes("/showcase/ans-3d/assets/") || event.target?.tagName === "SCRIPT")) showFallback("3D 场景暂时无法加载，你仍可继续浏览。"); }, true);
  window.addEventListener("unhandledrejection", event => {
    if (ready) return;
    const msg = String(event?.reason?.message || event?.reason || "");
    if (/clipboard|play\(\)|audio|gesture|NotAllowedError|AbortError/i.test(msg)) return;
    showFallback("3D 场景暂时无法加载，你仍可继续浏览。");
  });
  document.getElementById("scene-retry").addEventListener("click", () => window.location.reload());
  toggle.addEventListener("click", () => {
    if (failed) return;
    const paused = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "继续 3D" : "暂停 3D";
    window.dispatchEvent(new CustomEvent("ans-scene-pause", {detail:paused}));
  });
  document.getElementById("dino-greet").addEventListener("click", () => window.dispatchEvent(new Event("ans-dino-greet")));
  // Focus enters each actual overlay, stays inside while open, then returns to
  // the triggering item after Framer's exit animation removes the dialog.
  let activeDialog = null, returnTarget = null;
  const focusable = node => [...node.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length > 0);
  new MutationObserver(() => {
    const dialog = document.querySelector('.wk-detail[role="dialog"]');
    if (dialog && dialog !== activeDialog) {
      returnTarget = document.activeElement;
      activeDialog = dialog;
      (focusable(dialog)[0] || dialog).focus({preventScroll:true});
    } else if (!dialog && activeDialog) {
      activeDialog = null;
      if (returnTarget?.isConnected) returnTarget.focus({preventScroll:true});
      returnTarget = null;
    }
  }).observe(document.getElementById("root"), {childList:true,subtree:true});
  document.addEventListener("keydown", event => {
    if (!activeDialog) return;
    if (event.key === "Escape") { event.preventDefault(); activeDialog.querySelector(".wk-detail-close")?.click(); return; }
    if (event.key !== "Tab") return;
    const items = focusable(activeDialog), first = items[0], last = items[items.length-1];
    if (!first) {event.preventDefault();activeDialog.focus();return;}
    if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {event.preventDefault();first.focus();}
  }, true);
  document.addEventListener("focusin", event => {
    if (activeDialog && !activeDialog.contains(event.target)) (focusable(activeDialog)[0] || activeDialog).focus({preventScroll:true});
  });
})();
