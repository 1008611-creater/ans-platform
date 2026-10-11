import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const evidence = path.resolve(".workbuddy/evidence/agri-onsite"), root = process.cwd(), finalName = "20261008060000_agri_onsite_records";
const connection = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (connection.hostname !== "127.0.0.1" || connection.port !== "55438" || connection.pathname !== "/ans_product_verify_agri_onsite_r4") throw new Error("Refusing non-isolated migration probe");
const originalPath = path.join(evidence, "migration-e9276c047c1e5064.sql"), finalPath = path.resolve("prisma/migrations/" + finalName + "/migration.sql");
function urlFor(database: string) { const url = new URL(connection); url.pathname = "/" + database; return url.toString(); }
function sanitized(text: string) { return text.replaceAll(connection.toString(), "[isolated-database]").replaceAll(decodeURIComponent(connection.password), "[redacted]"); }
interface Snapshot { grantExpression: string; grantDefinition: string; onsiteTables: string[]; onsiteFunctions: string[]; onsiteTriggers: string[]; finishedMigrations: number; failedMigrations: number }
async function snapshot(client: PrismaClient): Promise<Snapshot> {
  const [grant] = await client.$queryRaw<Array<{ expression: string; definition: string }>>`SELECT pg_get_expr(conbin,conrelid) AS expression,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='agri_grant_valid' AND conrelid='agri_access_grants'::regclass`;
  const tables = await client.$queryRaw<Array<{ name: string }>>`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'agri_onsite_%' ORDER BY tablename`;
  const functions = await client.$queryRaw<Array<{ name: string }>>`SELECT proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname LIKE 'agri_onsite_%' ORDER BY proname`;
  const triggers = await client.$queryRaw<Array<{ name: string }>>`SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'agri_onsite_%' ORDER BY tgname`;
  const [counts] = await client.$queryRaw<Array<{ finished: number; failed: number }>>`SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::integer AS finished,count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::integer AS failed FROM "_prisma_migrations"`;
  return { grantExpression: grant.expression, grantDefinition: grant.definition, onsiteTables: tables.map(row => row.name), onsiteFunctions: functions.map(row => row.name), onsiteTriggers: triggers.map(row => row.name), finishedMigrations: counts.finished, failedMigrations: counts.failed };
}
async function grantValue(client: PrismaClient, expression: string, value: Record<string, unknown>) {
  const [row] = await client.$queryRawUnsafe<Array<{ valid: boolean | null }>>(`SELECT (${expression}) AS valid FROM jsonb_to_record($1::jsonb) AS fixture(revision integer,scope varchar,"expiresAt" timestamptz,"grantedAt" timestamptz,"sourceGrantId" text,"sourceRevision" integer,"managerGrantId" text,"managerRevision" integer,id text)`, JSON.stringify(value)); return row.valid;
}
async function inspectExisting() {
  const rows = [];
  for (const database of ["ans_product_verify_onsite_atomic_plain_r1", "ans_product_verify_onsite_atomic_explicit_r1"]) {
    const client = new PrismaClient({ datasourceUrl: urlFor(database) });
    try { rows.push({ database, snapshot: await snapshot(client), receipts: await client.$queryRaw<Array<{ migration_name: string; finished: boolean; failed: boolean; logs: string | null }>>`SELECT migration_name,finished_at IS NOT NULL AS finished,finished_at IS NULL AS failed,logs FROM "_prisma_migrations" WHERE migration_name=${finalName}` }); }
    finally { await client.$disconnect(); }
  }
  await writeFile(path.join(evidence, "migration-rollback-inspection-r1.json"), JSON.stringify(rows, null, 2) + "\n");
  console.log("Existing failure-probe snapshots retained; no writes");
}
async function main() {
  const prismaPackage = JSON.parse(await readFile(path.resolve("node_modules/prisma/package.json"), "utf8")), enginesPackage = JSON.parse(await readFile(path.resolve("node_modules/@prisma/engines/package.json"), "utf8"));
  assert.equal(prismaPackage.version, "6.19.3"); assert.equal(enginesPackage.version, "6.19.3");
  const original = await readFile(originalPath, "utf8"), final = await readFile(finalPath, "utf8");
  assert.equal(createHash("sha256").update(original).digest("hex"), "e9276c047c1e50646bc9ecb67174d2808aaa14c699543dae07aa8f146eab90d9");
  assert.equal(final, "BEGIN;\n" + original + "\nCOMMIT;\n");
  const admin = new PrismaClient({ datasourceUrl: urlFor("postgres") }), results: Array<Record<string, unknown>> = [];
  const report: Record<string, unknown> = { prismaVersion: prismaPackage.version, enginesVersion: enginesPackage.version, isolatedPostgres: true, productionWrites: false, originalSha256: createHash("sha256").update(original).digest("hex"), finalSha256: createHash("sha256").update(final).digest("hex"), passed: false, results };
  try {
    let baseline: Snapshot | null = null;
    for (const variant of ["plain", "explicit"] as const) {
      const database = variant === "plain" ? "ans_product_verify_onsite_atomic_plain_r2" : "ans_product_verify_onsite_atomic_explicit_r2";
      assert.ok(["ans_product_verify_onsite_atomic_plain_r2", "ans_product_verify_onsite_atomic_explicit_r2"].includes(database));
      const exists = await admin.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=${database}) AS exists`;
      if (exists[0].exists) throw new Error("Fresh failure-probe database already exists; preserve prior evidence");
      await admin.$executeRawUnsafe('CREATE DATABASE "' + database + '"');
      const project = path.join(evidence, "migration-rollback-" + variant + "-r2"), migrations = path.join(project, "migrations"); await mkdir(migrations, { recursive: true });
      await copyFile(path.resolve("prisma/schema.prisma"), path.join(project, "schema.prisma")); await copyFile(path.resolve("prisma/migrations/migration_lock.toml"), path.join(migrations, "migration_lock.toml"));
      const names = (await readdir("prisma/migrations", { withFileTypes: true })).filter(item => item.isDirectory() && item.name < finalName).map(item => item.name).sort(); assert.equal(names.length, 58);
      for (const name of names) { await mkdir(path.join(migrations, name), { recursive: true }); await copyFile(path.resolve("prisma/migrations", name, "migration.sql"), path.join(migrations, name, "migration.sql")); }
      await writeFile(path.join(project, "prisma.config.ts"), 'import { defineConfig, env } from "prisma/config";\nexport default defineConfig({schema:"schema.prisma",migrations:{path:"migrations"},engine:"classic",datasource:{url:env("DATABASE_URL")}});\n');
      const url = urlFor(database), environment = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
      const deploy = () => spawnSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", path.join(project, "prisma.config.ts")], { cwd: root, env: environment, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
      const first = deploy(); await writeFile(path.join(project, "baseline-deploy.log"), sanitized((first.stdout ?? "") + (first.stderr ?? "")).replaceAll(url, "[isolated-database]")); assert.equal(first.status, 0);
      const client = new PrismaClient({ datasourceUrl: url });
      try {
        const before = await snapshot(client); baseline = before; assert.equal(before.finishedMigrations, 58); assert.equal(before.failedMigrations, 0); assert.equal(before.onsiteTables.length, 0);
        await mkdir(path.join(migrations, finalName));
        const failedSQL = variant === "plain" ? original + "\nSELECT 1 / 0; -- deliberately fail after all onsite objects\n" : final.replace("\nCOMMIT;\n", "\nSELECT 1 / 0; -- deliberately fail inside explicit transaction\nCOMMIT;\n");
        await writeFile(path.join(migrations, finalName, "migration.sql"), failedSQL);
        const failed = deploy(); await writeFile(path.join(project, "expected-failure-deploy.log"), sanitized((failed.stdout ?? "") + (failed.stderr ?? "")).replaceAll(url, "[isolated-database]")); assert.notEqual(failed.status, 0);
        const output = (failed.stdout ?? "") + (failed.stderr ?? "");
        const originalDivisionVisible = output.includes("22012") && output.includes("division by zero"), abortedTransactionVisible = output.includes("current transaction is aborted");
        assert.ok(variant === "plain" ? originalDivisionVisible : originalDivisionVisible || abortedTransactionVisible);
        const [receipt] = await client.$queryRaw<Array<{ logs: string | null }>>`SELECT logs FROM "_prisma_migrations" WHERE migration_name=${finalName} AND finished_at IS NULL AND rolled_back_at IS NULL`;
        assert.ok(receipt);
        const after = await snapshot(client);
        assert.equal(after.grantExpression, before.grantExpression); assert.equal(after.grantDefinition, before.grantDefinition);
        assert.deepEqual(after.onsiteTables, []); assert.deepEqual(after.onsiteFunctions, []); assert.deepEqual(after.onsiteTriggers, []); assert.equal(after.finishedMigrations, 58); assert.equal(after.failedMigrations, 1);
        results.push({ variant, database, injectedFailure: "SELECT 1 / 0", observedFailure: originalDivisionVisible ? "22012/division by zero" : "aborted transaction; Prisma CLI masks original error", failedReceiptLogs: receipt.logs, before, after, oldGrantConstraintPreserved: true, noPartialOnsiteObjects: true, failedMigrationReceiptRetained: true });
      } finally { await client.$disconnect(); }
    }
    assert.ok(baseline);
    const candidate = new PrismaClient({ datasourceUrl: connection.toString() });
    try {
      const finalState = await snapshot(candidate); assert.equal(finalState.finishedMigrations, 59); assert.equal(finalState.failedMigrations, 0);
      const rootGrant = { revision: 1, scope: "WORKS_READ", expiresAt: null, grantedAt: "2026-10-08T00:00:00Z", sourceGrantId: null, sourceRevision: null, managerGrantId: null, managerRevision: null, id: "grant-child" };
      const cases: Array<{ label: string; value: Record<string, unknown> }> = [];
      for (const scope of ["WORKS_READ", "PRIVATE_MATERIALS_READ", "TECHNICAL_WRITE", "INTERNAL_NOTES_READ", "ISSUES_WRITE", "DEMO_WRITE", "ONSITE_READ", "ARCHIVE_WRITE", "EXPORT", "RULES_CONFIRM", "ACCESS_MANAGE", "UNKNOWN_SCOPE", "ONSITE_WRITE"]) {
        const value = { ...rootGrant, scope };
        const derived = { ...value, sourceGrantId: "grant-source", sourceRevision: 1, managerGrantId: "grant-manager", managerRevision: 1 };
        for (const [label, extra] of Object.entries({ root: {}, expiredAtGrant: { expiresAt: rootGrant.grantedAt }, reversedExpiry: { expiresAt: "2026-10-07T00:00:00Z" }, validExpiry: { expiresAt: "2026-10-09T00:00:00Z" }, zeroRevision: { revision: 0 }, sourceOnly: { sourceGrantId: "source" }, sourceRevisionOnly: { sourceRevision: 1 }, managerOnly: { managerGrantId: "manager" }, managerRevisionOnly: { managerRevision: 1 } })) cases.push({ label: scope + "/" + label, value: { ...value, ...extra } });
        for (const [label, extra] of Object.entries({ derived: {}, selfSource: { sourceGrantId: rootGrant.id }, selfManager: { managerGrantId: rootGrant.id }, zeroSourceRevision: { sourceRevision: 0 }, zeroManagerRevision: { managerRevision: 0 }, missingSourceRevision: { sourceRevision: null }, missingManagerRevision: { managerRevision: null } })) cases.push({ label: scope + "/" + label, value: { ...derived, ...extra } });
      }
      const truthTable: Array<{ label: string; before: boolean | null; after: boolean | null }> = [];
      for (const row of cases) { const old = await grantValue(candidate, baseline.grantExpression, row.value), next = await grantValue(candidate, finalState.grantExpression, row.value); if (row.value.scope !== "ONSITE_WRITE") assert.equal(next, old, row.label); else if (next === true) assert.ok(["ONSITE_WRITE/root", "ONSITE_WRITE/validExpiry", "ONSITE_WRITE/derived"].includes(row.label), row.label); else assert.equal(next, false, row.label); truthTable.push({ label: row.label, before: old, after: next }); }
      assert.ok(truthTable.find(row => row.label === "ONSITE_WRITE/root")?.after); assert.ok(truthTable.find(row => row.label === "ONSITE_WRITE/derived")?.after);
      assert.equal(truthTable.find(row => row.label === "ACCESS_MANAGE/derived")?.after, false);
      report.grantRestrictionComparison = { cases: truthTable.length, oldScopesUnchanged: true, newScopeOnlyApprovedShapes: true, truthTable };
    } finally { await candidate.$disconnect(); }
    report.passed = true;
  } catch (error) { await writeFile(path.join(evidence, "migration-rollback-failure.txt"), String(error instanceof Error ? error.stack : error)); throw error; }
  finally { await admin.$disconnect(); await writeFile(path.join(evidence, "migration-rollback.json"), JSON.stringify(report, null, 2) + "\n"); }
}
(process.argv.includes("--inspect-existing") ? inspectExisting() : main()).catch(() => { console.error("ONSITE_MIGRATION_ROLLBACK_CHECK_FAILED; sanitized evidence retained"); process.exitCode = 1; });
