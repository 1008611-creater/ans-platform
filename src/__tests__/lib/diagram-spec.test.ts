import { describe, expect, it } from "vitest";
import { renderLayeredDiagram } from "@/server/companion/diagram-spec";

const diagram = {
  layers: [
    { label: "应用层", items: [{ label: "农事管理", hint: "作业 / 记录" }, { label: "设备监控" }] },
    { label: "数据层", items: [{ label: "时序数据库" }] },
  ],
};

describe("renderLayeredDiagram", () => {
  it("渲染出每一层的层名与节点标签", () => {
    const svg = renderLayeredDiagram(diagram);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("应用层");
    expect(svg).toContain("农事管理");
    expect(svg).toContain("作业 / 记录");
    expect(svg).toContain("时序数据库");
  });

  it("转义 XML 特殊字符，避免注入破坏 SVG", () => {
    const svg = renderLayeredDiagram({ layers: [{ label: "<script>", items: [{ label: "a&b\"c" }] }] });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("a&amp;b&quot;c");
  });

  it("层数上限 5，列数按最长一层决定", () => {
    const many = { layers: Array.from({ length: 8 }, (_, i) => ({ label: "L" + i, items: [{ label: "x" }] })) };
    const svg = renderLayeredDiagram(many);
    expect(svg).toContain("L4");
    expect(svg).not.toContain("L5");
  });
});
