import { describe, expect, it } from "vitest";
import { detectSensitiveContent, publicReviewBlockers } from "@/domain/projects/review";

const confirmed = [
  { key: "problem" as const, value: "校园二手教材流转慢", confirmation: "confirmed" as const, evidenceUrl: null },
  { key: "result" as const, value: "暂无", confirmation: "confirmed" as const, evidenceUrl: null },
];

describe("公开审核规则", () => {
  it("识别联系方式、证件、密钥和私有地址", () => {
    const findings = detectSensitiveContent([
      "联系 13800138000",
      "student@example.com",
      "110101200001011234",
      "api_key: sk-live-secret-value",
      "https://github.com/org/repo/private",
    ].join("\n"));
    expect(findings.map((item) => item.kind)).toEqual(["phone", "email", "id", "secret", "private-link"]);
  });

  it("未确认事实不能进入公开审核", () => {
    const blockers = publicReviewBlockers(
      [{ ...confirmed[0], confirmation: "unconfirmed" }],
      "# 项目说明",
    );
    expect(blockers).toContain("存在尚未确认的事实。");
  });

  it("已确认且不含敏感信息时可以通过", () => {
    expect(publicReviewBlockers(confirmed, "# 项目说明\n结果：暂无")).toEqual([]);
  });

  it("成果正文中的敏感信息也会阻断", () => {
    expect(publicReviewBlockers(confirmed, "联系邮箱 student@example.com").join("")).toContain("邮箱");
  });
});
