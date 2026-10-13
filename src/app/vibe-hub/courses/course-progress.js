// Extracted from the retained VibeHub course renderer; source: src/data/vibehub/provenance.json.
// Keep the v3 storage format and v2 migration compatible across ANS course surfaces.
"use client";
import * as t from "react";
let d = {
  "product-website": ["vibehub.course.product-website.v2"],
  "git-workflow": ["vibehub.course.git-workflow.v1"]
};
function u(e) {
  return "vibehub.course.".concat(e, ".v3");
}
let h = {
  version: 3,
  chapters: {},
  views: {}
};
function m() {
  return {
    status: "not-started",
    readCompleted: !1,
    updatedAt: 0
  };
}
function p(e) {
  return "object" == typeof e && null !== e && !Array.isArray(e);
}
function x(e, s) {
  try {
    window.localStorage.setItem(u(e), JSON.stringify(s));
    return true;
  } catch { return false; }
}
function j(e) {
  let [s, r] = (0, t.useState)(h),
    [a, n] = (0, t.useState)(!1),
    i = (0, t.useRef)(s);
  const [persisted, setPersisted] = (0,t.useState)(true);
  const [loadedCourse, setLoadedCourse] = (0,t.useState)(null);
  (0, t.useEffect)(() => {
    n(!1);
    let s = function (e) {
      try {
        var s, r;
        let a = null != (r = null != (s = window.localStorage.getItem(u(e))) ? s : d[e].map(e => window.localStorage.getItem(e)).find(e => null !== e)) ? r : null;
        if (!a) return h;
        let t = JSON.parse(a),
          n = p(t) && 3 === t.version && p(t.chapters) && p(t.views) && Object.values(t.chapters).every(e => p(e) && ["not-started", "in-progress", "completed"].includes(String(e.status)) && "boolean" == typeof e.readCompleted && "number" == typeof e.updatedAt) && Object.values(t.views).every(e => p(e) && "number" == typeof e.articleScrollTop && (null === e.selectedTermId || "string" == typeof e.selectedTermId) && p(e.termScrollTopById) && Object.values(e.termScrollTopById).every(e => "number" == typeof e)) ? t : function (e) {
            if (!p(e) || 2 !== e.version || !p(e.chapters) || !p(e.views)) return null;
            let s = {};
            for (let [r, a] of Object.entries(e.chapters)) {
              if (!p(a) || "number" != typeof a.updatedAt) continue;
              let e = !0 === a.exercisePassed || "completed" === a.status;
              s[r] = {
                status: e ? "completed" : "not-started" === a.status ? "not-started" : "in-progress",
                readCompleted: e,
                updatedAt: a.updatedAt
              };
            }
            let r = {};
            for (let [s, a] of Object.entries(e.views)) p(a) && "number" == typeof a.articleScrollTop && (null === a.selectedTermId || "string" == typeof a.selectedTermId) && p(a.termScrollTopById) && Object.values(a.termScrollTopById).every(e => "number" == typeof e) && (r[s] = {
              articleScrollTop: a.articleScrollTop,
              selectedTermId: a.selectedTermId,
              termScrollTopById: a.termScrollTopById
            });
            return {
              version: 3,
              chapters: s,
              views: r
            };
          }(t);
        if (!n) return h;
        return {
          ...n,
          chapters: Object.fromEntries(Object.entries(n.chapters).map(e => {
            let [s, r] = e;
            return [s, {
              ...r,
              status: r.readCompleted ? "completed" : "not-started" === r.status && 0 === r.updatedAt ? "not-started" : "in-progress"
            }];
          }))
        };
      } catch (e) {
        return h;
      }
    }(e);
    i.current = s, r(s), setLoadedCourse(e), n(!0);
  }, [e]), (0, t.useEffect)(() => {
    if (a && loadedCourse === e) setPersisted(x(e, s));
  }, [e, a, s, loadedCourse]);
  let l = (0, t.useCallback)((e, s) => {
      var a;
      let t = i.current,
        n = null != (a = t.chapters[e]) ? a : m(),
        l = {
          ...n,
          ...s,
          status: {
            ...n,
            ...s
          }.readCompleted ? "completed" : "in-progress",
          updatedAt: Date.now()
        },
        c = {
          ...t,
          chapters: {
            ...t.chapters,
            [e]: l
          }
        };
      i.current = c, r(c);
    }, []),
    c = (0, t.useCallback)((s, r) => {
      var a, t;
      let n = i.current,
        l = null != (a = n.views[s]) ? a : {
          articleScrollTop: 0,
          selectedTermId: null,
          termScrollTopById: {}
        },
        c = {
          ...l,
          ...r,
          termScrollTopById: null != (t = r.termScrollTopById) ? t : l.termScrollTopById
        },
        o = {
          ...n,
          views: {
            ...n.views,
            [s]: c
          }
        };
      return i.current = o, setPersisted(x(e, o)), c;
    }, [e]);
  return (0, t.useMemo)(() => ({
    hydrated: a,
    persisted,
    progress: s,
    updateChapter: l,
    updateView: c
  }), [a, s, l, c, persisted]);
}
export {j as useCourseProgress,m as emptyChapterProgress};
