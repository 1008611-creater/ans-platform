// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react/jsx-runtime";
import * as i from "react";
import * as o from "./technology-icons.js";
import * as upstream5323 from "./visual-kinds.js";
let s = {
  javascript: o.wAf,
  typescript: o.k8A,
  python: o.FRF,
  react: o.usQ,
  vue: o.psU,
  nextjs: o.iaw,
  "tailwind-css": o.AN7,
  "shadcn-ui": o.__M
};
let c = new Set(["domain", "dns", "url", "http", "https", "cdn", ...upstream5323.p]);
let d = new Set(["mini-program", "wxml", "wxss", "rpx", "page-lifecycle", "subpackage"]);
let h = function () {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 12,
    t = new Set();
  return {
    has: e => t.has(e),
    update(a, n) {
      if (t.delete(a), n) for (t.add(a); t.size > e;) {
        let e = t.values().next().value;
        if (void 0 === e) break;
        t.delete(e);
      }
    }
  };
}();
let u = new Map();
let m = {
  preloadObserver: null,
  visibilityObserver: null,
  fallbackListening: !1,
  frameId: 0,
  targets: new Map(),
  pendingTargets: new Set(),
  intersectionQueue: new Set(),
  ensureFallback() {
    this.fallbackListening || (window.addEventListener("scroll", this.handleFallbackViewportChange, {
      passive: !0
    }), window.addEventListener("resize", this.handleFallbackViewportChange), this.fallbackListening = !0);
  },
  ensure() {
    if (!this.fallbackListening && (!this.preloadObserver || !this.visibilityObserver)) {
      if ("undefined" == typeof IntersectionObserver) return void this.ensureFallback();
      try {
        this.preloadObserver = new IntersectionObserver(e => {
          let t = !1;
          for (let a of e) {
            let e = this.targets.get(a.target);
            if (e && !e.active) {
              if (e.isInPreloadRange = a.isIntersecting, !a.isIntersecting) {
                this.intersectionQueue.delete(a.target);
                continue;
              }
              this.intersectionQueue.add(a.target), t = !0;
            }
          }
          t && this.schedule();
        }, {
          root: null,
          rootMargin: "".concat(320, "px 0px"),
          threshold: 0
        }), this.visibilityObserver = new IntersectionObserver(e => {
          for (let t of e) {
            let e = this.targets.get(t.target);
            e && e.active && (e.isVisible = t.isIntersecting, e.onVisibilityChange(t.isIntersecting));
          }
        }, {
          root: null,
          rootMargin: "0px",
          threshold: 0
        });
      } catch (e) {
        this.stopObservers(), this.ensureFallback();
      }
    }
  },
  handleFallbackViewportChange: () => {
    m.schedule();
  },
  stopObservers() {
    var e, t;
    null == (e = this.preloadObserver) || e.disconnect(), null == (t = this.visibilityObserver) || t.disconnect(), this.preloadObserver = null, this.visibilityObserver = null, this.intersectionQueue.clear();
  },
  stopFallback() {
    this.fallbackListening && (window.removeEventListener("scroll", this.handleFallbackViewportChange), window.removeEventListener("resize", this.handleFallbackViewportChange), this.fallbackListening = !1);
  },
  hasObservers() {
    return !!(this.preloadObserver && this.visibilityObserver);
  },
  schedule() {
    this.frameId || (this.frameId = window.requestAnimationFrame(() => {
      this.frameId = 0, this.hasObservers() ? this.processIntersectionQueue() : this.checkAll();
    }));
  },
  checkAll() {
    if (this.hasObservers()) return;
    let e = 0;
    for (let t of [...this.targets.keys()]) {
      let a = this.targets.get(t);
      if (!a) continue;
      if (!t.isConnected) {
        this.unobserve(t);
        continue;
      }
      let n = function (e, t) {
        if (!e) return null;
        let a = e.getBoundingClientRect();
        return a.width <= 0 && a.height <= 0 ? null : {
          near: a.top < window.innerHeight + 320 && a.bottom > -t,
          visible: a.top < window.innerHeight && a.bottom > 0
        };
      }(t, 320);
      n && (a.active ? a.isVisible !== n.visible && (a.isVisible = n.visible, a.onVisibilityChange(n.visible)) : n.near && e < 2 && (a.isVisible = n.visible, a.onVisibilityChange(n.visible), this.fire(t, a), e += 1));
    }
    e >= 2 && this.pendingTargets.size && this.schedule();
  },
  processIntersectionQueue() {
    let e = 0;
    for (let t of this.intersectionQueue) {
      this.intersectionQueue.delete(t);
      let a = this.targets.get(t);
      if (a && !a.active && a.isInPreloadRange) {
        if (!t.isConnected) {
          this.unobserve(t);
          continue;
        }
        if (this.fire(t, a), (e += 1) >= 2) break;
      }
    }
    this.intersectionQueue.size && this.schedule();
  },
  fire(e, t) {
    var a;
    if (!t.active) {
      if (t.active = !0, this.pendingTargets.delete(e), null == (a = this.preloadObserver) || a.unobserve(e), this.visibilityObserver) try {
        this.visibilityObserver.observe(e);
      } catch (e) {
        this.stopObservers(), this.ensureFallback(), this.schedule();
      }
      t.activate();
    }
  },
  observe(e, t, a) {
    let n = arguments.length > 3 && void 0 !== arguments[3] && arguments[3];
    if (!e || "function" != typeof t) return () => {};
    this.ensure(), this.targets.set(e, {
      activate: t,
      onVisibilityChange: a,
      active: n,
      isInPreloadRange: !1,
      isVisible: !1
    }), n || this.pendingTargets.add(e);
    try {
      if (this.hasObservers()) {
        var i;
        null == (i = n ? this.visibilityObserver : this.preloadObserver) || i.observe(e);
      } else this.ensureFallback();
    } catch (e) {
      this.stopObservers(), this.ensureFallback();
    }
    return this.hasObservers() || this.schedule(), () => this.unobserve(e);
  },
  unobserve(e) {
    if (e) {
      try {
        var t, a;
        null == (t = this.preloadObserver) || t.unobserve(e), null == (a = this.visibilityObserver) || a.unobserve(e);
      } catch (e) {}
      this.intersectionQueue.delete(e), this.pendingTargets.delete(e), this.targets.delete(e), !this.targets.size && (this.stopObservers(), this.stopFallback(), this.frameId && (window.cancelAnimationFrame(this.frameId), this.frameId = 0));
    }
  }
};
function p(e) {
  let {
      entry: t
    } = e,
    a = s[t.id];
  return a ? (0, n.jsx)("span", {
    className: "tech-brand-icon",
    style: {
      "--tech-brand-color": "#".concat(a.hex)
    },
    title: "".concat(a.title, " Logo \xb7 Simple Icons"),
    "aria-hidden": "true",
    children: (0, n.jsx)("svg", {
      viewBox: "0 0 24 24",
      focusable: "false",
      children: (0, n.jsx)("path", {
        d: a.path
      })
    })
  }) : null;
}
let g = new Map([["设计风格", "style"], ["官网区块", "site"], ["网页基础", "diagram"], ["小程序", "diagram"], ["页面布局", "diagram"], ["网络与地址", "diagram"], ["接口与数据", "diagram"], ["数据库", "diagram"], ["后端开发", "diagram"], ["账号与权限", "diagram"], ["上线与排错", "diagram"], ["开发工具", "diagram"], ["测试", "diagram"], ["Git", "diagram"]]);
let f = {
  style: 640,
  site: 560,
  diagram: 400
};
function y(e) {
  let {
      entry: t,
      html: a
    } = e,
    o = (0, i.useRef)(null),
    s = c.has(t.id),
    r = s || d.has(t.id) ? null : g.get(t.cat) || null,
    l = !!r,
    [p, y] = (0, i.useState)(() => h.has(t.id)),
    [b] = (0, i.useState)(() => {
      if (l || s) return;
      let e = u.get(t.id);
      return e && 1 > Math.abs(e.viewportWidth - window.innerWidth) ? e.height : void 0;
    });
  return ((0, i.useEffect)(() => {
    let e = o.current;
    if (e) return m.observe(e, () => {
      y(!0);
    }, a => {
      h.update(t.id, a), e.classList.toggle("preview-animations-paused", !a);
    }, p);
  }, [p, t.id]), (0, i.useLayoutEffect)(() => {
    let e = o.current;
    if (!p || l || s || !e) return;
    let a = () => {
      let a = e.getBoundingClientRect().height;
      a > 0 && u.set(t.id, {
        height: a,
        viewportWidth: window.innerWidth
      });
    };
    a();
    let n = new ResizeObserver(a);
    return n.observe(e), () => n.disconnect();
  }, [p, s, t.id, l]), (0, i.useLayoutEffect)(() => {
    let e = o.current;
    if (!p || !l || !e) return;
    let t = () => {
      let t = e.clientWidth,
        a = e.clientHeight;
      if (!t || !a) return;
      let n = window.getComputedStyle(e),
        i = t - parseFloat(n.paddingLeft) - parseFloat(n.paddingRight),
        o = a - parseFloat(n.paddingTop) - parseFloat(n.paddingBottom),
        s = f[r];
      e.style.setProperty("--preview-scale", String(Math.min(1, i / s, o / (9 * s / 16))));
    };
    t();
    let a = new ResizeObserver(t);
    return a.observe(e), () => a.disconnect();
  }, [p, t.id, r, l]), l) ? (0, n.jsx)("div", {
    className: "card-demo scaled-preview ".concat(r, "-preview"),
    ref: o,
    "aria-hidden": "true",
    children: p ? (0, n.jsx)("div", {
      className: "scaled-preview-canvas ".concat(r, "-preview-canvas"),
      dangerouslySetInnerHTML: {
        __html: a
      }
    }) : null,
    inert: true
  }) : (0, n.jsx)("div", {
    className: "card-demo".concat(s ? " compact-preview" : ""),
    ref: o,
    "aria-hidden": "true",
    style: b ? {
      height: b,
      flexBasis: b
    } : void 0,
    children: p ? (0, n.jsx)("div", {
      className: "card-demo-mount",
      dangerouslySetInnerHTML: {
        __html: a
      },
      inert: true
    }) : null,
    inert: true
  });
}
export { y as CatalogPreview, p as TechnologyIcon };
