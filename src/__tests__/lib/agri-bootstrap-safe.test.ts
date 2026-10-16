import { describe, expect, it, vi } from "vitest";
import { bootstrapAgriEditionInTx } from "@/server/competitions/agrihackathon/bootstrap";

describe("safe edition initialization", () => {
  it("creates only the pending competition and workspace, preserving rules and permissions", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (parts: TemplateStringsArray) => {
      statements.push(parts.join("?"));
      return 1;
    });
    const query = vi.fn()
      .mockResolvedValueOnce([{ now: new Date("2026-10-16T00:00:00Z") }])
      .mockResolvedValueOnce([{ id: "workspace", competitionId: "agrihackathon-2026", enabled: false, draftRevision: 0, confirmedRuleVersionId: null, publishedRuleVersionId: null }]);
    const result = await bootstrapAgriEditionInTx({ $executeRaw: execute, $queryRaw: query } as never, { silent: true });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(statements[0]).toContain("'UPCOMING'");
    expect(statements.join(" ")).not.toMatch(/INSERT INTO users|agri_access_grants|agri_rule_versions|agri_stage_windows|UPDATE agri_workspaces/);
    expect(result.enabled).toBe(false);
    expect(result.publishedRuleVersionId).toBeNull();
  });
});