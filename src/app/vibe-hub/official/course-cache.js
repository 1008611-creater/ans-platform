// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as r from "./course-catalog.js";
function s() {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : r.bZ,
    t = new Map(),
    i = new Map(),
    s = (e, t) => "".concat(e, ":").concat(t);
  return {
    get(e, i) {
      var r;
      return null != (r = t.get(s(e, i))) ? r : null;
    },
    seed(e, i) {
      t.set(s(e, i.id), i);
    },
    load(r, a) {
      let n = s(r, a),
        o = t.get(n);
      if (o) return Promise.resolve(o);
      let l = i.get(n);
      if (l) return l;
      let h = e(r, a).then(e => {
        if (!e) throw Error("课程章节不存在：".concat(n));
        return t.set(n, e), e;
      }).finally(() => i.delete(n));
      return i.set(n, h), h;
    }
  };
}
let a = s();
function n(e, t) {
  a.load(e, t).catch(() => {});
}
export { a as courseChapters, s as createCourseChapterCache, n as prefetchCourseChapter };
