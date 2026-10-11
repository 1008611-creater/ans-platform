// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let a = function () {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 2,
    t = new Set(),
    n = 0,
    a = () => {
      for (let i of t) {
        if (n >= e) break;
        t.delete(i), n += 1, Promise.resolve().then(i.run).catch(() => {}).finally(() => {
          n -= 1, a();
        });
      }
    };
  return function (e) {
    let n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 140,
      i = {
        run: e
      },
      r = setTimeout(() => {
        t.add(i), a();
      }, n);
    return () => {
      clearTimeout(r), t.delete(i);
    };
  };
}();
export { a as b };
