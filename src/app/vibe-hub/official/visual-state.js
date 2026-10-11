// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react";
function i(e) {
  let a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 3200,
    [s, i] = (0, n.useState)(0),
    [r, t] = (0, n.useState)(!1),
    [c, d] = (0, n.useState)(!1);
  return (0, n.useEffect)(() => {
    var s, n;
    if (r || c || (null == (s = (n = window).matchMedia) ? void 0 : s.call(n, "(prefers-reduced-motion: reduce)").matches)) return;
    let t = setTimeout(() => i(a => (a + 1) % e), a);
    return () => clearTimeout(t);
  }, [s, r, c, e, a]), {
    index: s,
    select: a => {
      d(!0), i(Math.max(0, Math.min(e - 1, a)));
    },
    nudge: a => {
      d(!0), i(s => Math.max(0, Math.min(e - 1, s + a)));
    },
    stageProps: {
      onPointerEnter: () => t(!0),
      onPointerLeave: () => t(!1)
    }
  };
}
function r(e) {
  let [a, s] = (0, n.useState)(0);
  return {
    index: a,
    select: a => {
      s(Math.max(0, Math.min(e - 1, a)));
    }
  };
}
export { r as B, i as U };
