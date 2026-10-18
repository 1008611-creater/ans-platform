import { describe, expect, it } from "vitest";
import {
  COVER_STUDIO_PRESETS,
  buildCoverStudioSvg,
  buildProjectVisualWalkthrough,
  detectIntentAndMatchTerms,
  generateRoadshowAndSocialPack,
  stripAiBuzzwords,
  upgradeToStructuredBrief,
} from "@/domain/vibehub/ans-site-optimizers";
import { resolveCatalogShowcaseHref } from "@/domain/catalog/homepage";

describe("ANS Site Optimizers (ans-skill-refactor)", () => {
  it("strips empty AI buzzwords via ans-tone-guard", () => {
    const raw = "在当今数字化时代，我们旨在赋能并全方位重构智慧农情诊断生态闭环。";
    const cleaned = stripAiBuzzwords(raw);
    expect(cleaned).not.toContain("在当今数字化时代");
    expect(cleaned).not.toContain("赋能");
    expect(cleaned).not.toContain("生态闭环");
    expect(cleaned).toContain("农情诊断");
  });

  it("detects domain intent and upgrades casual input into a 4-part structured brief", () => {
    const agriCluster = detectIntentAndMatchTerms("做一个农田玉米叶斑病 NDVI 遥感预警终端");
    expect(agriCluster.id).toBe("agri");
    expect(agriCluster.terms.length).toBeGreaterThanOrEqual(4);

    const briefZh = upgradeToStructuredBrief("做一个农田玉米叶斑病 NDVI 遥感预警终端", "zh", "比赛冲刺");
    expect(briefZh).toContain("【1. 目标与受众】");
    expect(briefZh).toContain("【2. 保留范围与不做项】");
    expect(briefZh).toContain("【3. 输入素材与依据约束】");
    expect(briefZh).toContain("【4. 可验证交付标准（含 ans-tone-guard 去 AI 味门禁）】");
  });

  it("builds a 4-step Script vs. Agent visual walkthrough and Blind A/B eval rows", () => {
    const walkthrough = buildProjectVisualWalkthrough(
      { slug: "agri-pest", category: "competition", subcategory: "agri-wall" },
      "zh",
    );
    expect(walkthrough.nodes).toHaveLength(4);
    expect(walkthrough.nodes[0].kind).toBe("script");
    expect(walkthrough.nodes[2].kind).toBe("preview");
    expect(walkthrough.evalRows.length).toBeGreaterThanOrEqual(3);
  });

  it("generates de-slopped roadshow pitch, README, social post, and 16:9 SVG cover", () => {
    const pack = generateRoadshowAndSocialPack(
      {
        title: "CAU 农情病虫害诊断终端",
        summary: "旨在赋能农户，构建多光谱遥感与叶片病害识别。",
        deliverables: ["可交互 HTML5 终端", "测试样本集"],
        category: "竞赛冲刺 · 智耕农客松",
      },
      "zh",
    );
    expect(pack.cleanedSummary).not.toContain("赋能");
    expect(pack.roadshowPitch).toContain("60 秒路演逐字稿");
    expect(pack.readmeMarkdown).toContain("## 三、30 秒冒烟测试");
    expect(pack.socialPostDraft).toContain("【标题备选 1】");

    for (const preset of COVER_STUDIO_PRESETS) {
      const svg = buildCoverStudioSvg(preset.id, "CAU 农情病虫害诊断终端", pack.cleanedSummary, "AGRI TRACK");
      expect(svg).toContain("<svg");
      expect(svg).toContain("viewBox=\"0 0 1200 675\"");
      expect(svg).toContain("ANS VIBEHUB");
    }
  });

  it("simplifies catalog showcase routing via resolveCatalogShowcaseHref", () => {
    expect(resolveCatalogShowcaseHref({ slug: "cauai-one", workflowId: "resume-website" })).toBe("/explore/resume-3d");
    expect(resolveCatalogShowcaseHref({ slug: "aigc-1", workflowId: "easel" })).toBe("/explore/aigc-studio");
    expect(resolveCatalogShowcaseHref({ slug: "agri-1", category: "competition" })).toBe("/explore/agrihackathon");
    expect(resolveCatalogShowcaseHref({ slug: "demo-1", category: "web" })).toBe("/projects/demo-1");
  });
});
