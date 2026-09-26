import { describe, expect, it } from "vitest";
import { generateOfficialArtifact, normalizeFactValue, renderProjectExport, snapshotText, type FactRecord } from "@/domain/projects/pack";
import { officialWorkflowIds } from "@/contracts/projects";

const facts: FactRecord[] = [
  { key: "problem", value: "校园二手教材流转慢", confirmation: "confirmed" },
  { key: "contribution", value: "负责需求整理和页面原型", confirmation: "confirmed" },
  { key: "method", value: "使用表单收集教材信息", confirmation: "confirmed" },
  { key: "result", value: "暂无", confirmation: "confirmed" },
  { key: "evidence", value: "", confirmation: "missing" },
];

describe("学生项目包", () => {
  it("区分空白和暂无", () => {
    expect(normalizeFactValue("").confirmation).toBe("missing");
    expect(normalizeFactValue("暂无")).toEqual({ value: "暂无", confirmation: "confirmed" });
  });

  it("八份材料使用不同结构且不编造成绩", () => {
    const artifacts = officialWorkflowIds.map((workflowId) => generateOfficialArtifact(workflowId, "教材流转", facts));
    const bodies = artifacts.map((artifact) => artifact.markdown.split("## 待确认")[0]);
    expect(new Set(bodies).size).toBe(8);
    expect(artifacts.find((artifact) => artifact.json.workflowId === "resume-bullets")?.markdown).toContain("不写入量化成绩");
    expect(artifacts.find((artifact) => artifact.json.workflowId === "readme-draft")?.markdown).toContain("运行方式");
    expect(artifacts.find((artifact) => artifact.json.workflowId === "project-one-pager")?.markdown).toContain("| 个人贡献 |");
    expect(artifacts.find((artifact) => artifact.json.workflowId === "contest-mvp")?.markdown).toContain("本次可演示范围");
    for (const artifact of artifacts) {
      expect(artifact.markdown).toContain("待确认");
      expect(artifact.markdown).not.toMatch(/提升\s*\d+|用户\s*\d+|第\s*\d+\s*名/);
    }
  });

  it("缺少必填事实时拒绝生成", () => {
    expect(() => generateOfficialArtifact("readme-draft", "教材流转", facts.filter((fact) => fact.key !== "method"))).toThrow(/方法或技术/);
  });

  it("事实快照变化会被记录", () => {
    const first = snapshotText(facts);
    const second = snapshotText(facts.map((fact) => fact.key === "method" ? { ...fact, value: "改为线下登记" } : fact));
    expect(first).not.toBe(second);
  });

  it("导出只拼接已保存成果", () => {
    const markdown = renderProjectExport({ title: "教材流转", goal: "career" }, [{ title: "简历", markdown: "# 简历", version: 2 }]);
    expect(markdown).toContain("教材流转");
    expect(markdown).toContain("成果版本 2");
  });
});
