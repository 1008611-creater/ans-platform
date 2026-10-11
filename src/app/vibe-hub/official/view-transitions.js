// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let a = "vh:view-transition-start";
let i = "vh:view-transition-end";
function r() {
  return "undefined" != typeof document && "function" == typeof document.startViewTransition && window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
let o = 0;
function c(e) {
  if (!r()) return e(), {
    finished: Promise.resolve()
  };
  0 == o++ && document.dispatchEvent(new Event(a));
  let t = () => {
    0 == --o && document.dispatchEvent(new Event(i));
  };
  try {
    let n = document.startViewTransition(e);
    return n.finished.then(t, t), n;
  } catch (e) {
    throw t(), e;
  }
}
export { r as Qo, c as _V, a as bj, i as wX };
