// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

function n(e, t) {
  if (e.length <= 1) return e;
  let r = 0x811c9dc5;
  for (let e = 0; e < t.length; e += 1) r ^= t.charCodeAt(e), r = Math.imul(r, 0x1000193);
  let n = (r >>> 0) % e.length;
  return e.map((t, r) => e[(r + n) % e.length]);
}
export { n as T };
