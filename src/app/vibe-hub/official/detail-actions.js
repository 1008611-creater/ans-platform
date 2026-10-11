// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react/jsx-runtime";
import * as i from "react";
function o(e) {
  return String(e || "").split("\n").map(e => "> ".concat(e)).join("\n");
}
function s(e) {
  return "flow" === e.detailTemplate;
}
function r(e) {
  return !!(e.detailKind && "component" !== e.detailKind);
}
function l(e) {
  let {
    className: t = ""
  } = e;
  return (0, n.jsx)("svg", {
    className: "ui-icon ".concat(t).trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    children: (0, n.jsx)("path", {
      d: "m5 12.5 4.2 4.2L19 7"
    })
  });
}
function c(e) {
  let {
    className: t = ""
  } = e;
  return (0, n.jsx)("svg", {
    className: "ui-icon ".concat(t).trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    children: (0, n.jsx)("path", {
      d: "M7 7l10 10M17 7 7 17"
    })
  });
}
function d(e) {
  let {
    className: t = ""
  } = e;
  return (0, n.jsxs)("svg", {
    className: "ui-icon ".concat(t).trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    children: [(0, n.jsx)("rect", {
      x: "8",
      y: "8",
      width: "11",
      height: "11",
      rx: "2"
    }), (0, n.jsx)("path", {
      d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
    })]
  });
}
function h() {
  return (0, n.jsx)("svg", {
    className: "ui-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    children: (0, n.jsx)("path", {
      d: "M19 12H5m6-6-6 6 6 6"
    })
  });
}
let u = ".dh-demo,.anat-stage,.variant-demo,.scene-shot,.mk,.concept-practice-page,.prompt-copy,.pronunciation-button,.oil-ui-pro-recommendation,.selector-recommendation,[aria-hidden='true']";
function m(e) {
  if (!e) return "";
  if (e.nodeType === Node.TEXT_NODE) return String(e.nodeValue || "").replace(/\s+/g, " ");
  if (!(e instanceof Element) || e.matches(u)) return "";
  let t = e.tagName.toLowerCase(),
    a = [...e.childNodes].map(m).join("").trim();
  if (!a && "br" !== t) return "";
  if ("br" === t) return "\n";
  if ("a" === t) {
    let t = e.getAttribute("href");
    return t ? "[".concat(a, "](").concat(t, ")") : a;
  }
  return "strong" === t || "b" === t ? "**".concat(a, "**") : "code" === t ? "`".concat(a.replace(/`/g, "\\`"), "`") : "em" === t ? "*".concat(a, "*") : a;
}
function p(e) {
  var t, a, n, i, o, s, r, l, c, d, h, g, f, y, b, v, w;
  if (!e) return "";
  if (e.nodeType === Node.TEXT_NODE) return String(e.nodeValue || "").trim();
  if (!(e instanceof Element) || e.matches(u)) return "";
  let k = e.tagName.toLowerCase(),
    x = e.classList,
    S = () => m(e).trim();
  if (/^h[1-6]$/.test(k)) {
    let t = "h1" === k ? 1 : Math.max(2, Number(k.slice(1))),
      i = null == (n = e.querySelector(":scope > span")) || null == (a = n.textContent) ? void 0 : a.trim(),
      o = [...e.childNodes].filter(e => e.nodeType === Node.TEXT_NODE).map(e => {
        var t;
        return (null == (t = e.nodeValue) ? void 0 : t.trim()) || "";
      }).filter(Boolean).join(" "),
      s = o ? [o, i].filter(Boolean).join(" ") : S();
    return "".concat("#".repeat(t), " ").concat(s);
  }
  if (x.contains("section-title")) return "## ".concat(S());
  if (x.contains("dh-quote")) {
    let t = null == (o = e.querySelector(".dh-quote-label")) || null == (i = o.textContent) ? void 0 : i.trim(),
      a = null == (r = e.querySelector(".dh-quote-text")) || null == (s = r.textContent) ? void 0 : s.trim();
    return [t ? "> **".concat(t, "**") : "", a ? "> ".concat(a) : ""].filter(Boolean).join("\n");
  }
  if (x.contains("usage-box")) {
    let t = null == (c = e.querySelector("h3")) || null == (l = c.textContent) ? void 0 : l.trim(),
      a = [...e.querySelectorAll(":scope > ul > li")].map(e => {
        let t = e.querySelector(":scope > .usage-text") || e;
        return "- ".concat(m(t).trim());
      }).filter(e => "- " !== e);
    return [t ? "## ".concat(t) : "", ...a].filter(Boolean).join("\n");
  }
  if (x.contains("anat-part")) {
    let t = [null == (h = e.querySelector(".pn")) || null == (d = h.textContent) ? void 0 : d.trim(), null == (f = e.querySelector(".pe")) || null == (g = f.textContent) ? void 0 : g.trim()].filter(Boolean).join(" "),
      a = e.querySelector(".pd") ? m(e.querySelector(".pd")).trim() : "";
    return [t ? "### ".concat(t) : "", a].filter(Boolean).join("\n\n");
  }
  if (x.contains("variant-card")) {
    let t = e.querySelector(".variant-name"),
      a = null == t || null == (b = t.querySelector(":scope > span")) || null == (y = b.textContent) ? void 0 : y.trim(),
      n = [t ? [...t.childNodes].filter(e => e.nodeType === Node.TEXT_NODE).map(e => {
        var t;
        return (null == (t = e.nodeValue) ? void 0 : t.trim()) || "";
      }).filter(Boolean).join(" ") : "", a].filter(Boolean).join(" "),
      i = e.querySelector(".variant-when") ? m(e.querySelector(".variant-when")).trim() : "";
    return [n ? "### ".concat(n) : "", i].filter(Boolean).join("\n\n");
  }
  if (x.contains("scene-item")) {
    let t = null == (w = e.querySelector(".scene-cap")) || null == (v = w.textContent) ? void 0 : v.trim();
    return t ? "### ".concat(t) : "";
  }
  if (x.contains("reference-list")) return [...e.querySelectorAll(":scope > a")].map(e => {
    var t, a, n, i;
    let o = (null == (a = e.querySelector(".reference-title")) || null == (t = a.textContent) ? void 0 : t.trim()) || e.textContent.trim(),
      s = null == (i = e.querySelector(".reference-source")) || null == (n = i.textContent) ? void 0 : n.replace(/\s*↗\s*$/, "").trim();
    return "- [".concat(o, "](").concat(e.getAttribute("href"), ")").concat(s ? " — ".concat(s) : "");
  }).join("\n");
  if ("blockquote" === k) return S().split("\n").map(e => "> ".concat(e)).join("\n");
  if ("pre" === k) return "```\n".concat((null == (t = e.textContent) ? void 0 : t.trim()) || "", "\n```");
  if ("p" === k) return S();
  if ("li" === k) return "- ".concat(S());
  if ("ul" === k || "ol" === k) return [...e.children].map(p).filter(Boolean).join("\n");
  let T = [...e.children].filter(e => !e.matches(u));
  return T.length ? T.map(p).filter(Boolean).join("\n\n") : S();
}
function g(e) {
  return String(e || "").replace(/[ \t]+([，。！？；：、,.!?;:])/g, "$1").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function f(e) {
  let {
    flowLesson: t,
    isEn: a = !1
  } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
  if (t) {
    let n = p((null == e ? void 0 : e.querySelector(".detail-hero")) || null),
      i = p((null == e ? void 0 : e.querySelector(".references-section")) || null);
    return g([n, function (e) {
      let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
      if (!e) return "";
      let a = new Set(e.focusStepIds || []),
        n = (e.steps || []).map((e, n) => {
          let i = [e.owner || "", a.has(e.id) ? t ? "Focus" : "本页重点" : ""].filter(Boolean).join(" \xb7 "),
            o = e.detail ? "".concat(t ? ": " : "：").concat(e.detail) : "";
          return "".concat(n + 1, ". **").concat(e.label, "**").concat(i ? "".concat(t ? " (" : "（").concat(i).concat(t ? ")" : "）") : "").concat(o);
        }),
        i = e.practice,
        s = ((null == i ? void 0 : i.options) || []).map((e, t) => "".concat(t + 1, ". ").concat(e.label));
      return [e.title ? "## ".concat(e.title) : "", e.instruction || "", n.length ? "### ".concat(t ? "Flow steps" : "流程步骤", "\n").concat(n.join("\n")) : "", function (e, t) {
        if (!e) return "";
        if ("string" == typeof e) return "> **".concat(t ? "Important boundary" : "重要边界", "**\n").concat(o(e));
        let a = e.title || (t ? "Important boundary" : "重要边界"),
          n = e.detail || e.text || e.label;
        return [a ? "> **".concat(a, "**") : "", n ? o(n) : ""].filter(Boolean).join("\n");
      }(e.boundary, t), i ? ["## ".concat(t ? "Quick check" : "选择题"), i.title ? "### ".concat(i.title) : "", s.join("\n")].filter(Boolean).join("\n\n") : "", e.agentPrompt ? ["## ".concat(t ? "You can say this to an AI Agent" : "你可以这样告诉 AI Agent"), o(e.agentPrompt)].join("\n\n") : ""].filter(Boolean).join("\n\n");
    }(null != t ? t : null, a), i].filter(Boolean).join("\n\n"));
  }
  return g(p(e));
}
function y(e) {
  let {
      practice: t,
      isEn: a
    } = e,
    [o, s] = (0, i.useState)(void 0),
    r = a && t.en ? t.en : t,
    l = r.options || [],
    c = l.find(e => e.id === o),
    d = c || r.initial;
  return (0, n.jsxs)("section", {
    className: "concept-practice ".concat(t.className || "").trim(),
    children: [(0, n.jsxs)("div", {
      className: "concept-practice-heading",
      children: [(0, n.jsx)("h2", {
        children: r.title
      }), (0, n.jsx)("p", {
        children: r.instruction
      })]
    }), (0, n.jsx)("div", {
      className: "concept-practice-page",
      "aria-label": r.pageLabel,
      children: l.map(e => {
        let t = o === e.id,
          a = t ? e.correct ? " is-correct" : " is-retry" : "";
        return (0, n.jsxs)("button", {
          className: "concept-practice-region practice-region-".concat(e.id).concat(a),
          type: "button",
          "aria-pressed": t,
          "aria-label": e.ariaLabel || e.label,
          onClick: () => s(e.id),
          children: [(0, n.jsx)("span", {
            className: "concept-practice-region-label",
            children: e.label
          }), (0, n.jsx)("span", {
            className: "concept-practice-region-content",
            dangerouslySetInnerHTML: {
              __html: e.html || ""
            }
          })]
        }, e.id);
      })
    }), (0, n.jsxs)("div", {
      className: "concept-practice-feedback".concat(c ? c.correct ? " is-correct" : " is-retry" : ""),
      role: "status",
      "aria-live": "polite",
      children: [(0, n.jsx)("b", {
        children: d.title
      }), (0, n.jsx)("span", {
        children: d.feedback
      })]
    })]
  });
}
function b(e) {
  let {
      entry: t,
      isEn: a,
      strings: i,
      onCopy: o
    } = e,
    s = a && t.prompt_en ? t.prompt_en : t.prompt || "",
    r = a && t.promptTitle_en || t.promptTitle || i.prompt,
    l = t.promptKind || "dialogue";
  return (0, n.jsxs)("section", {
    className: "prompt-section prompt-section-".concat(l),
    children: [(0, n.jsx)("div", {
      className: "section-title",
      children: r
    }), (0, n.jsxs)("div", {
      className: "prompt-box prompt-box-".concat(l),
      children: ["code" === l ? (0, n.jsx)("code", {
        children: s
      }) : (0, n.jsx)("blockquote", {
        children: (0, n.jsx)("p", {
          children: s
        })
      }), (0, n.jsx)("button", {
        type: "button",
        className: "prompt-copy",
        "aria-label": i.copyPrompt,
        title: i.copyPrompt,
        onClick: () => {
          var e;
          let t = null == (e = navigator.clipboard) ? void 0 : e.writeText(s);
          (null == t ? void 0 : t.then) ? t.then(o, o) : o();
        },
        children: (0, n.jsx)(d, {})
      })]
    })]
  });
}
export { h as A6, l as Sr, c as US, y as MS, d as Td, b as mL, f as oe, r as Rc, s as z };
