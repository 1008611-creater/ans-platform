import { describe, expect, it } from "vitest";
import { createBetaExportDocument, type BetaExportRecord } from "./beta-experiment";

const record: BetaExportRecord = {
  orderId: "order-1",
  createdAt: "2026-10-02T00:00:00.000Z",
  completedAt: "2026-10-02T00:00:08.000Z",
  templateId: "travel",
  templateVersion: "1.0.0",
  mode: "quick",
  provider: "mock",
  status: "ready",
  durationMs: 8_000,
  hasOutput: true,
  feedback: { satisfaction: 5, publishIntent: "yes", recommendIntent: "yes", note: "适合做封面" },
};

describe("beta experiment export", () => {
  it("exports only anonymous order and feedback fields", () => {
    const document = createBetaExportDocument([record], "2026-10-02T01:00:00.000Z");
    expect(document.schemaVersion).toBe("beta-experiment-1.0");
    expect(document.exportedAt).toBe("2026-10-02T01:00:00.000Z");
    expect(document.records[0]).toEqual(record);
    expect(JSON.stringify(document)).not.toContain("prompt");
    expect(JSON.stringify(document)).not.toContain("https://");
    expect(JSON.stringify(document)).not.toContain("base64");
  });

  it("does not mutate the input feedback object", () => {
    const input = { ...record, feedback: { ...record.feedback } };
    const document = createBetaExportDocument([input]);
    expect(document.records[0]?.feedback).not.toBe(input.feedback);
    expect(input.feedback?.satisfaction).toBe(5);
  });
});
