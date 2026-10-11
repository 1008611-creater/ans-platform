// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as a from "react/jsx-runtime";
import * as r from "react";
import * as u from "react-dom";
import * as g from "./themes.js";
function d(e) {
  let {
      id: t,
      isEn: n,
      onClose: i,
      qrCodes: o,
      returnFocusRef: c,
      heading: l,
      title: s
    } = e,
    d = (0, r.useRef)(null),
    m = (0, r.useRef)(null);
  return (0, r.useEffect)(() => {
    var e;
    let t = c.current,
      n = document.body.style.overflow;
    document.body.style.overflow = "hidden", null == (e = m.current) || e.focus();
    let a = e => {
      var t, n;
      if ("Escape" === e.key && (e.preventDefault(), i()), "Tab" !== e.key) return;
      let a = null == (t = d.current) ? void 0 : t.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]'),
        r = null == a ? void 0 : a[0],
        o = null == a ? void 0 : a[a.length - 1];
      r && o && ((null == (n = d.current) ? void 0 : n.contains(document.activeElement)) && (!e.shiftKey || document.activeElement !== r) ? e.shiftKey || document.activeElement !== o || (e.preventDefault(), r.focus()) : (e.preventDefault(), (e.shiftKey ? o : r).focus()));
    };
    return window.addEventListener("keydown", a), () => {
      window.removeEventListener("keydown", a), document.body.style.overflow = n, (null == t ? void 0 : t.isConnected) && t.focus({
        preventScroll: !0
      });
    };
  }, [i, c]), (0, u.createPortal)((0, a.jsx)("div", {
    className: "community-dialog-backdrop",
    onMouseDown: e => {
      e.target === e.currentTarget && i();
    },
    children: (0, a.jsxs)("section", {
      ref: d,
      className: "community-dialog",
      id: t,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": s || (n ? "Join the community" : "加入交流群"),
      children: [(0, a.jsxs)("header", {
        className: "community-dialog-header",
        children: [(0, a.jsx)("span", {
          children: l || (n ? "COMMUNITY / WECHAT" : "交流群 / COMMUNITY")
        }), (0, a.jsx)("button", {
          ref: m,
          type: "button",
          "aria-label": n ? "Close community dialog" : "关闭交流群弹窗",
          onClick: i,
          children: "\xd7"
        })]
      }), (0, a.jsx)("div", {
        className: "community-dialog-body",
        children: (0, a.jsx)("div", {
          className: "community-dialog-qr-grid",
          children: o.map(e => (0, a.jsxs)("div", {
            className: "community-dialog-qr-item",
            children: [e.title && (0, a.jsxs)("div", {
              className: "community-dialog-qr-caption",
              children: [(0, a.jsx)("h2", {
                children: n ? e.titleEn : e.title
              }), (0, a.jsx)("p", {
                children: n ? e.descriptionEn : e.description
              })]
            }), (0, a.jsx)("img", {
              src: e.src,
              alt: n ? e.altEn : e.alt
            }), (0, a.jsxs)("a", {
              className: "community-dialog-save",
              href: e.src,
              download: e.filename,
              children: [(0, a.jsx)("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true",
                children: (0, a.jsx)("path", {
                  d: "M12 3v11m0 0 4-4m-4 4-4-4M5 17v2h14v-2"
                })
              }), (0, a.jsx)("span", {
                children: n ? "Save" : "保存"
              })]
            })]
          }, e.src))
        })
      })]
    })
  }), c.current?.closest(".vibehub-source") || document.body);
}
let m = [{
  src: "/vibe-hub/source/assets/vibehub-group-qr-8-20260927.png",
  filename: "vibehub-community-group-8.png",
  alt: "VibeHub 交流 8 群微信二维码",
  altEn: "VibeHub community group 8 WeChat QR code",
  title: "VibeHub 交流 8 群",
  titleEn: "VibeHub community \xb7 Group 8",
  description: "交流 AI 工具使用经验与项目实践。",
  descriptionEn: "Share AI tool tips and discuss your projects."
}];
function h(e) {
  let {
      isEn: t
    } = e,
    [n, i] = (0, r.useState)(!1),
    o = (0, r.useRef)(null),
    c = (0, r.useCallback)(() => i(!1), []);
  return (0, a.jsxs)(a.Fragment, {
    children: [(0, a.jsxs)("button", {
      ref: o,
      className: "nav-primary-item nav-community-entry",
      type: "button",
      "aria-label": t ? "Community" : "交流群",
      "aria-haspopup": "dialog",
      "aria-expanded": n,
      "aria-controls": "community-dialog",
      onClick: () => i(!0),
      children: [(0, a.jsx)("svg", {
        viewBox: "0 0 24 24",
        "aria-hidden": "true",
        children: (0, a.jsx)("path", {
          d: "M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.2-1.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM2.8 19c.4-3.4 2.3-5.2 5.7-5.2s5.3 1.8 5.7 5.2H2.8Zm11.2-5.6c3.9-.5 6.2 1.4 6.6 4.6h-4.8"
        })
      }), (0, a.jsx)("span", {
        className: "nav-community-label",
        children: t ? "Community" : "交流群"
      })]
    }), n && (0, a.jsx)(d, {
      id: "community-dialog",
      isEn: t,
      onClose: c,
      returnFocusRef: o,
      qrCodes: m
    })]
  });
}
let b = {
  klein: "Indigo",
  violet: "Violet",
  teal: "Teal",
  amber: "Orange",
  rose: "Rose",
  pink: "Pink",
  yellow: "Gold",
  zinc: "Graphite"
};
let f = "vibehub:nav-picker-open";
function v(e, t) {
  let [n, a] = (0, r.useState)(!1),
    i = (0, r.useRef)(null);
  return (0, r.useEffect)(() => {
    let t = t => {
      t instanceof CustomEvent && t.detail === e || a(!1);
    };
    return document.addEventListener(f, t), () => document.removeEventListener(f, t);
  }, [e]), (0, r.useEffect)(() => {
    if (!n) return;
    let e = e => {
        e.target instanceof Element && e.target.closest(t) || a(!1);
      },
      r = e => {
        var t;
        "Escape" === e.key && (a(!1), null == (t = i.current) || t.focus());
      };
    return document.addEventListener("pointerdown", e), document.addEventListener("keydown", r), () => {
      document.removeEventListener("pointerdown", e), document.removeEventListener("keydown", r);
    };
  }, [n, t]), {
    open: n,
    setOpen: a,
    toggleOpen: () => {
      n || document.dispatchEvent(new CustomEvent(f, {
        detail: e
      })), a(e => !e);
    },
    triggerRef: i
  };
}
function y(e) {
  let {
      theme: t,
      onPick: n,
      isEn: i
    } = e,
    {
      open: r,
      setOpen: o,
      toggleOpen: c,
      triggerRef: l
    } = v("theme", ".nav-theme");
  return (0, a.jsxs)("div", {
    className: "nav-theme",
    children: [(0, a.jsx)("button", {
      ref: l,
      className: "nav-circle",
      title: i ? "Theme color" : "主题色",
      "aria-label": i ? "Theme color" : "主题色",
      "aria-haspopup": "menu",
      "aria-expanded": r,
      onClick: e => {
        e.stopPropagation(), c();
      }
    }), r && (0, a.jsx)("div", {
      className: "nav-popover right",
      role: "menu",
      "aria-label": i ? "Theme color" : "主题色",
      children: g.zG.map(e => (0, a.jsx)("button", {
        className: "ts-dot".concat(t === e.id ? " on" : ""),
        style: {
          "--c": e.brand
        },
        title: i ? b[e.id] : e.name,
        "aria-label": i ? b[e.id] : e.name,
        role: "menuitemradio",
        "aria-checked": t === e.id,
        onClick: () => {
          n(e), o(!1);
        }
      }, e.id))
    })]
  });
}
function w(e) {
  let {
      locale: t,
      onSelect: n
    } = e,
    {
      open: i,
      setOpen: r,
      toggleOpen: o,
      triggerRef: c
    } = v("language", ".nav-language"),
    l = "en" === t;
  return (0, a.jsxs)("div", {
    className: "nav-language",
    children: [(0, a.jsxs)("button", {
      ref: c,
      className: "nav-lang",
      type: "button",
      "aria-label": l ? "Choose language" : "选择语言",
      "aria-haspopup": "menu",
      "aria-expanded": i,
      onClick: e => {
        e.stopPropagation(), o();
      },
      children: [(0, a.jsx)("span", {
        children: l ? "English" : "中文"
      }), (0, a.jsx)("i", {
        "aria-hidden": "true"
      })]
    }), i && (0, a.jsx)("div", {
      className: "nav-popover nav-language-popover right",
      role: "menu",
      "aria-label": l ? "Choose language" : "选择语言",
      children: [{
        id: "zh",
        label: "中文"
      }, {
        id: "en",
        label: "English"
      }].map(e => {
        let i = e.id === t,
          o = "nav-language-option".concat(i ? " is-selected" : ""),
          c = (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("span", {
              children: e.label
            }), (0, a.jsx)("i", {
              "aria-hidden": "true",
              children: i ? "✓" : ""
            })]
          });
        return i ? (0, a.jsx)("button", {
          className: o,
          type: "button",
          role: "menuitemradio",
          "aria-checked": "true",
          onClick: () => r(!1),
          children: c
        }, e.id) : (0, a.jsx)("button", {
          className: o,
          type: "button",
          role: "menuitemradio",
          "aria-checked": "false",
          onClick: () => {
            r(!1), n(e.id);
          },
          children: c
        }, e.id);
      })
    })]
  });
}
export { h as CommunityButton, y as ThemePicker, w as LanguagePicker };
