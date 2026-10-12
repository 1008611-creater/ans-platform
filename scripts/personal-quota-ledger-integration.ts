/** Actual local PostgreSQL proof. All fixture writes occur in one rollback-only transaction. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

async function main() {
  const container = JSON.parse(execFileSync("docker", ["inspect", "ans-dev-db"], { encoding: "utf8", windowsHide: true }))[0];
  const variables = Object.fromEntries(container.Config.Env.map((item: string) => {
    const separator = item.indexOf("="); return [item.slice(0, separator), item.slice(separator + 1)];
  }));
  assert(container.NetworkSettings.Ports["5432/tcp"].some((item: { HostIp: string; HostPort: string }) => item.HostIp === "127.0.0.1" && item.HostPort === "55437"));
  assert(variables.POSTGRES_PASSWORD);
  const database = "ans_agri_boundary_audit_20261012";
  const url = `postgresql://${encodeURIComponent(variables.POSTGRES_USER || "postgres")}:${encodeURIComponent(variables.POSTGRES_PASSWORD)}@127.0.0.1:55437/${database}?schema=public`;
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  for (const key of Object.keys(process.env)) if (/API_KEY|AUTH_SECRET|MODEL_.*KEY|SMTP_|OIDC_|PAYMENT|TOKEN|OPENAI_BASE_URL/.test(key)) delete process.env[key];
  const { db } = await import("../src/lib/db");
  const { countPersonalQuotaMismatches, personalQuotaLedgerWhere } = await import("../src/server/quota/ledger-scope");
  const prefix = "ledger-scope-" + randomUUID();
  const rollback = new Error("ROLLBACK_ONLY");
  const checks: string[] = [];
  try {
    const baseline = await countPersonalQuotaMismatches(db);
    try {
      await db.$transaction(async tx => {
        const personal = await tx.user.create({ data: { id: prefix + "-personal", username: prefix + "-personal", email: prefix + "-personal@example.invalid", quotaPoints: 10 } });
        const teamOnly = await tx.user.create({ data: { id: prefix + "-team", username: prefix + "-team", email: prefix + "-team@example.invalid", quotaPoints: 0 } });
        await tx.quotaLedger.createMany({ data: [
          { id: prefix + "-null-credit", userId: personal.id, amount: 10.125001, reason: "GRANT", refType: null },
          { id: prefix + "-null-charge", userId: personal.id, amount: -0.125001, reason: "RUN_COST", refType: null },
          { id: prefix + "-allocation", userId: personal.id, amount: 50, reason: "TEAM_GRANT", refType: "team_member" },
          { id: prefix + "-reclaim", userId: personal.id, amount: -20, reason: "TEAM_GRANT", refType: "team_member" },
          { id: prefix + "-team-adjust", userId: personal.id, amount: 30, reason: "ADMIN_ADJUST", refType: "team" },
          { id: prefix + "-team-spend", userId: personal.id, amount: -3, reason: "RUN_COST", refType: "team_member" },
          { id: prefix + "-legacy-team", userId: personal.id, amount: 25, reason: "TEAM_GRANT", refType: null },
          { id: prefix + "-team-only", userId: teamOnly.id, amount: 100, reason: "TEAM_GRANT", refType: "team_member" },
        ] });
        const entries = await tx.quotaLedger.findMany({ where: { userId: personal.id, ...personalQuotaLedgerWhere() }, orderBy: { id: "asc" } });
        assert.deepEqual(entries.map(row => row.id), [prefix + "-null-charge", prefix + "-null-credit"]);
        checks.push("Personal history retains six-decimal legacy null credits/charges and excludes all team domains");
        assert.equal(await tx.quotaLedger.findFirst({ where: { id: prefix + "-allocation", userId: personal.id, ...personalQuotaLedgerWhere() } }), null);
        checks.push("Same-account team entry cannot become a personal pagination cursor");
        assert.equal(await countPersonalQuotaMismatches(tx), baseline);
        checks.push("Positive/negative allowance changes and team-only account do not create false personal mismatches");
        const bad = await tx.user.create({ data: { id: prefix + "-bad", username: prefix + "-bad", email: prefix + "-bad@example.invalid", quotaPoints: 10 } });
        await tx.quotaLedger.create({ data: { userId: bad.id, amount: 8, reason: "RECHARGE", refType: "recharge" } });
        assert.equal(await countPersonalQuotaMismatches(tx), baseline + 1);
        checks.push("A genuine two-point personal mismatch is still detected");
        assert.equal((await tx.user.findUniqueOrThrow({ where: { id: personal.id } })).quotaPoints, 10);
        assert.equal(await tx.quotaLedger.count({ where: { userId: personal.id } }), 7);
        checks.push("Diagnosis changes no balance and deletes no historical team entries");
        throw rollback;
      }, { timeout: 15000 });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await db.user.count({ where: { id: { startsWith: prefix } } }), 0);
    assert.equal(await db.quotaLedger.count({ where: { id: { startsWith: prefix } } }), 0);
    assert.equal(await countPersonalQuotaMismatches(db), baseline);
    checks.push("Fixture users and ledger rows rolled back, original mismatch count preserved");
    const report = { passed: true, databaseHost: "127.0.0.1:55437", transactionRolledBack: true, fixtureRowsAfter: 0, checks, productionWrites: 0, providerCalls: 0 };
    const target = process.env.ANS_LEDGER_SCOPE_REPORT;
    if (target) writeFileSync(target, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Isolated ledger scope verification failed; no credentials or row payloads are logged."); process.exitCode = 1; });
