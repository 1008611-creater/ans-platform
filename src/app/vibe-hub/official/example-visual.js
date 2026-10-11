// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as l from "react/jsx-runtime";
import * as r from "react";
function n(e) {
  let {
      example: t,
      locale: a
    } = e,
    [n, s] = (0, r.useState)(0),
    o = (0, r.useId)(),
    c = (0, r.useRef)(null),
    i = t.steps[n];
  return i ? (0, l.jsxs)("section", {
    className: "interactive-demo record-example",
    "aria-label": t.label,
    children: [(0, l.jsx)("div", {
      ref: c,
      className: "scene-controls",
      role: "group",
      "aria-label": "en" === a ? "Change example state" : "切换示例状态",
      onKeyDown: e => {
        var a;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault(), e.stopPropagation();
        let l = e.currentTarget.querySelectorAll("button"),
          r = Array.from(l).findIndex(e => e === document.activeElement),
          o = "Home" === e.key ? 0 : "End" === e.key ? t.steps.length - 1 : Math.max(0, Math.min(t.steps.length - 1, (r < 0 ? n : r) + ("ArrowRight" === e.key ? 1 : -1)));
        s(o), null == (a = l[o]) || a.focus();
      },
      children: t.steps.map((e, t) => (0, l.jsx)("button", {
        type: "button",
        className: n === t ? "on" : "",
        "aria-pressed": n === t,
        "aria-controls": o,
        onClick: () => s(t),
        children: e.label
      }, e.id))
    }), (0, l.jsxs)("div", {
      id: o,
      className: "record-example-body",
      "data-step": i.id,
      children: [(0, l.jsx)("div", {
        className: "record-example-scene",
        dangerouslySetInnerHTML: {
          __html: i.demo
        }
      }), (0, l.jsx)("div", {
        className: "record-example-feedback",
        role: "status",
        "aria-atomic": "true",
        children: (0, l.jsx)("p", {
          children: i.caption
        })
      }), i.action && (0, l.jsx)("button", {
        type: "button",
        className: "record-example-action",
        "aria-controls": o,
        onClick: () => {
          var e, a;
          let l = t.steps.findIndex(e => {
            var t;
            return e.id === (null == (t = i.action) ? void 0 : t.target);
          });
          l < 0 || (s(l), null == (a = c.current) || null == (e = a.querySelectorAll("button")[l]) || e.focus());
        },
        children: i.action.label
      })]
    })]
  }) : null;
}
export {};
export default n;
