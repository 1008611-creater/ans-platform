// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let a = [{
  id: "klein",
  name: "靛蓝",
  brand: "#3559d8",
  hover: "#2a46b4",
  accent: "#7b93ea"
}, {
  id: "violet",
  name: "紫罗兰",
  brand: "#7c3aed",
  hover: "#6d28d9",
  accent: "#a78bfa"
}, {
  id: "teal",
  name: "黛绿",
  brand: "#0f766e",
  hover: "#115e59",
  accent: "#2dd4bf"
}, {
  id: "amber",
  name: "蜜橙",
  brand: "#c2410c",
  hover: "#9a3412",
  accent: "#fb923c"
}, {
  id: "rose",
  name: "玫红",
  brand: "#e11d48",
  hover: "#be123c",
  accent: "#fb7185"
}, {
  id: "pink",
  name: "樱粉",
  brand: "#db2777",
  hover: "#be185d",
  accent: "#f472b6"
}, {
  id: "yellow",
  name: "赤金",
  brand: "#b45309",
  hover: "#92400e",
  accent: "#fbbf24"
}, {
  id: "zinc",
  name: "石墨",
  brand: "#525963",
  hover: "#414751",
  accent: "#646d78"
}];
function i(e) {
  return {
    "--theme-brand": e.brand,
    "--theme-brand-hover": e.hover,
    "--theme-dark-brand": "zinc" === e.id ? "#b7bec9" : e.accent
  };
}
export { i as vS, a as zG };
