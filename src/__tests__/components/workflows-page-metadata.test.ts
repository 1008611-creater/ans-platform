// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-identity", () => ({
  getPublicDisplayName: vi.fn(),
}));
vi.mock("@/server/workflows/service", () => ({
  listPublishedWorkflows: vi.fn(),
}));

import { metadata } from "@/app/workflows/page";

describe("workflows page metadata", () => {
  it("lets the root layout append the site name once", () => {
    expect(metadata.title).toBe("工作流广场");
    expect(metadata.title).not.toContain("ANS");
    expect(metadata.description).toBe("按节点编排的校园 AI 工作流，填好输入即可一次跑完。");

    const finalTitle = `${metadata.title} | ANS`;
    expect(finalTitle).toBe("工作流广场 | ANS");
    expect(finalTitle.match(/ANS/g)).toHaveLength(1);
  });
});
