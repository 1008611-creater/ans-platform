import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55438"); assert.equal(url.pathname, "/ans_product_verify_agri_p2_http_r1");
}
async function main() {
  const fixture = JSON.parse(await readFile(".workbuddy/evidence/agri-demo/http-fixture.json", "utf8")) as {
    localFixtureOnly: boolean; edition: string; full: { id: string; email: string }; reader: { id: string; email: string }; member: { id: string; email: string }; outsider: { id: string; email: string }; admin: { id: string; email: string }; submissionId: string; previousSubmissionId: string; buildId: string;
  };
  assert.equal(fixture.localFixtureOnly, true);
  const { db } = await import("../src/lib/db");
  try {
    const identity = await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
    assert.equal(identity[0].database, "ans_product_verify_agri_p2_http_r1");
    const users = [fixture.full, fixture.reader, fixture.member, fixture.outsider, fixture.admin];
    // Reuse hashes cloned from an already verified synthetic database. Never set or rewrite a password.
    for (const user of users) {
      const found = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, password: true } });
      assert.equal(found.email, user.email); assert.ok(found.email?.endsWith("@example.invalid")); assert.ok(found.password);
    }
    const count = await db.$queryRaw<Array<{ count: bigint; incomplete: bigint }>>`SELECT count(*) AS count, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS incomplete FROM _prisma_migrations`;
    assert.equal(count[0].count, BigInt(60)); assert.equal(count[0].incomplete, BigInt(0));
    const sets: Array<[string, string[]]> = [[fixture.full.id, ["ONSITE_READ", "ONSITE_WRITE", "ARCHIVE_WRITE", "EXPORT"]], [fixture.reader.id, ["ONSITE_READ"]], [fixture.member.id, ["ONSITE_READ", "ONSITE_WRITE"]], [fixture.outsider.id, ["ONSITE_READ"]]];
    await db.$transaction(async tx => {
      for (const [userId, scopes] of sets) for (const scope of scopes) {
        const existing = await tx.$queryRaw<Array<{ id: string; revokedAt: Date | null; expiresAt: Date | null }>>`SELECT id,"revokedAt","expiresAt" FROM agri_access_grants WHERE "competitionId"=${fixture.edition} AND "userId"=${userId} AND scope=${scope}`;
        if (existing.length) { assert.equal(existing[0].revokedAt, null); assert.equal(existing[0].expiresAt, null); continue; }
        await tx.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt",delegable,revision) VALUES (${randomUUID()},${fixture.edition},${userId},${scope},${fixture.full.id},clock_timestamp(),false,1)`;
      }
    });
    await writeFile(".workbuddy/evidence/agri-p2/http-fixture.json", JSON.stringify({ ...fixture, sourceFixtureBuildId: fixture.buildId, buildId: null, origin: "http://127.0.0.1:3163", cloneSourceDatabase: "ans_product_verify_agri_demo_r3", database: "ans_product_verify_agri_p2_http_r1", migrations: 60, noPasswordWrites: true, syntheticScopeFixtureOnly: true, scopeSets: sets }, null, 2) + "\n");
    console.log("Existing synthetic fixture clone verified; 60 migrations and isolated scope fixture prepared; no account/password updates");
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Existing local fixture validation failed; private diagnostics suppressed"); process.exitCode = 1; });
