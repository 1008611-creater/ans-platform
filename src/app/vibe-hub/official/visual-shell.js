// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as t from "react/jsx-runtime";
import * as a from "react";
import * as i from "./visual-language.js";
function r(e) {
  let {
      label: s,
      children: n,
      onPrevious: r,
      onNext: l,
      className: c = "",
      ...o
    } = e,
    d = (0, a.useContext)(i.gq),
    h = "en" === d && i.A8[s] || s;
  return (0, t.jsx)("div", {
    className: "concept-stage interactive-demo ".concat(c).trim(),
    tabIndex: 0,
    "aria-label": "".concat(h).concat(l ? "en" === d ? ", use the left and right arrow keys to switch steps" : "，可用左右方向键切换" : ""),
    onKeyDown: e => {
      ("ArrowLeft" === e.key || "ArrowRight" === e.key) && (e.preventDefault(), e.stopPropagation(), "ArrowLeft" === e.key && (null == r || r()), "ArrowRight" === e.key && (null == l || l()));
    },
    ...o,
    children: (0, t.jsx)(i.vy, {
      children: n
    })
  });
}
function l(e) {
  let {
    items: s,
    index: n,
    onSelect: a,
    label: i,
    className: r = ""
  } = e;
  return (0, t.jsx)("div", {
    className: "visual-choice-list ".concat(r).trim(),
    role: "group",
    "aria-label": i,
    children: s.map((e, s) => (0, t.jsxs)("button", {
      type: "button",
      className: "visual-selectable".concat(s === n ? " on" : ""),
      "aria-pressed": s === n,
      onClick: () => a(s),
      children: [(0, t.jsx)("i", {
        children: s + 1
      }), (0, t.jsx)("span", {
        children: e
      })]
    }, "".concat(e, "-").concat(s)))
  });
}
function c(e) {
  let {
      items: s,
      value: n,
      onChange: r,
      label: l = "切换图解状态"
    } = e,
    c = (0, a.useContext)(i.gq);
  return (0, t.jsx)("div", {
    className: "scene-controls",
    role: "group",
    "aria-label": (0, i.M8)(l, c),
    children: s.map((e, s) => (0, t.jsx)("button", {
      type: "button",
      className: n === s ? "on" : "",
      "aria-pressed": n === s,
      onClick: () => r(s),
      children: e
    }, e))
  });
}
function o(e) {
  let {
    filename: s,
    children: n,
    tone: a = ""
  } = e;
  return (0, t.jsxs)("div", {
    className: "real-editor ".concat(a).trim(),
    children: [(0, t.jsxs)("div", {
      className: "real-editor-head",
      children: [(0, t.jsx)("span", {}), (0, t.jsx)("span", {}), (0, t.jsx)("span", {}), (0, t.jsx)("b", {
        children: s
      })]
    }), (0, t.jsx)("div", {
      className: "real-code",
      children: n
    })]
  });
}
function d(e) {
  let {
    n: s,
    active: n = !1,
    error: a = !1,
    children: i
  } = e;
  return (0, t.jsxs)("div", {
    className: "".concat(n ? "active" : "").concat(a ? " error" : "").trim(),
    children: [(0, t.jsx)("i", {
      children: s
    }), (0, t.jsx)("code", {
      children: i
    })]
  });
}
function h(e) {
  let {
    url: s = "localhost:3000",
    children: n,
    status: a
  } = e;
  return (0, t.jsxs)("div", {
    className: "real-browser",
    children: [(0, t.jsxs)("div", {
      className: "real-browser-bar",
      children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
        children: s
      })]
    }), (0, t.jsx)("div", {
      className: "real-browser-page",
      children: n
    }), a && (0, t.jsx)("div", {
      className: "real-browser-status",
      "aria-live": "polite",
      children: a
    })]
  });
}
function x(e) {
  let {
    children: s
  } = e;
  return (0, t.jsxs)("div", {
    className: "real-terminal",
    children: [(0, t.jsxs)("div", {
      children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("b", {
        children: "Terminal"
      })]
    }), (0, t.jsx)("pre", {
      children: s
    })]
  });
}
export { x as BK, o as KE, d as SH, h as Tb, l as hV, c as tk, r as xc };
