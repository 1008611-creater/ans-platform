import { describe, expect, it, vi } from "vitest";
import { bootstrapAgriEditionInTx, resolveAgriBootstrapMode } from "@/server/competitions/agrihackathon/bootstrap";

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

  it("provisions root grants on a routine start but never invents, confirms or publishes rules", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (parts: TemplateStringsArray) => {
      statements.push(parts.join("?"));
      return 1;
    });
    const query = vi.fn()
      .mockResolvedValueOnce([{ now: new Date("2026-10-16T00:00:00Z") }])
      .mockResolvedValueOnce([{ id: "workspace", competitionId: "agrihackathon-2026", enabled: false, draftRevision: 0, confirmedRuleVersionId: null, publishedRuleVersionId: null }])
      .mockResolvedValueOnce([{ id: "admin-1", email: "admin@ans.cauai.fun", username: "admin" }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const result = await bootstrapAgriEditionInTx({ $executeRaw: execute, $queryRaw: query } as never, {
      provisionInitial: true,
      silent: true,
    });
    const sql = statements.join(" ");
    expect(sql).toContain("INSERT INTO agri_access_grants");
    expect(sql).not.toMatch(/agri_rule_versions|agri_stage_windows|agri_workspace_events|UPDATE agri_workspaces|UPDATE competitions/);
    expect(result.enabled).toBe(false);
    expect(result.publishedRuleVersionId).toBeNull();
  });

  it("publishes placeholder rule v1 only with explicit provisionRules and zero grants/revisions", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (parts: TemplateStringsArray) => {
      statements.push(parts.join("?"));
      return 1;
    });
    const query = vi.fn()
      .mockResolvedValueOnce([{ now: new Date("2026-10-16T00:00:00Z") }])
      .mockResolvedValueOnce([{ id: "workspace", competitionId: "agrihackathon-2026", enabled: false, draftRevision: 0, confirmedRuleVersionId: null, publishedRuleVersionId: null }])
      .mockResolvedValueOnce([{ id: "admin-1", email: "admin@ans.cauai.fun", username: "admin" }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const result = await bootstrapAgriEditionInTx({ $executeRaw: execute, $queryRaw: query } as never, {
      provisionInitial: true,
      provisionRules: true,
      silent: true,
    });
    expect(result.enabled).toBe(true);
    expect(result.publishedRuleVersionId).toBeTruthy();
    expect(statements.join(" ")).toContain("INSERT INTO agri_access_grants");
    expect(statements.join(" ")).toContain("INSERT INTO agri_rule_versions");
  });

  it("keeps placeholder rules opt-in for the CLI and container entrypoint", () => {
    expect(resolveAgriBootstrapMode(["node", "bootstrap", "--competition-id", "agrihackathon-2026"], {}))
      .toEqual({ draftOnly: false, provisionInitial: true, provisionRules: false });
    expect(resolveAgriBootstrapMode(["--provision-rules"], {}).provisionRules).toBe(true);
    expect(resolveAgriBootstrapMode([], { AGRI_BOOTSTRAP_PROVISION_RULES: "true" }).provisionRules).toBe(true);
    expect(resolveAgriBootstrapMode(["--provision-rules", "--pending-only"], {}))
      .toEqual({ draftOnly: false, provisionInitial: false, provisionRules: false });
    expect(resolveAgriBootstrapMode(["--provision-rules", "--draft-only"], {}).provisionRules).toBe(false);
  });
});
