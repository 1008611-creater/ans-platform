/** Real isolated PostgreSQL catalog acceptance; no upstream calls or production credentials. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { CATALOG_TEXT_FIELDS, type CatalogEntry } from "../src/contracts/catalog-content";
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const url = new URL(process.env[key] || "");
  assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && /^\/ans_product_verify_[a-z0-9_]+$/.test(url.pathname), "Isolated database required");
}
const prefix = "catalog-test-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
async function main() {
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/catalog/service");
  const users: string[] = []; const slugs: string[] = []; const checks: string[] = [];
  const content = Object.fromEntries(CATALOG_TEXT_FIELDS.map(field => [field, "隔离测试 PRIVATE_CATALOG_MARKER " + field])) as CatalogEntry["content"]["zh"];
  const entry: CatalogEntry = { slug: prefix, category: "business", subcategory: "validation", goal: "portfolio", preview: "plan", source: "official", content: { zh: content } };
  async function check(label: string, run: () => Promise<void>) { await run(); checks.push(label); console.log("[catalog] PASS " + label); }
  try {
    const admin = await db.user.create({ data: { username: prefix + "-admin", email: prefix + "-admin@example.invalid", role: "ADMIN", adminPermissions: ["CATALOG_MANAGE"] } }); users.push(admin.id);
    const outsider = await db.user.create({ data: { username: prefix + "-outsider", email: prefix + "-outsider@example.invalid" } }); users.push(outsider.id);
    await check("all mutations and private reads enforce real editor permissions", async () => {
      await assert.rejects(api.listCatalogAdmin(outsider.id), /FORBIDDEN/);
      await assert.rejects(api.saveCatalogDraft(outsider.id, { expectedRevision: 0, entry }), /FORBIDDEN/);
      await assert.rejects(api.changeCatalogPublication(outsider.id, entry.slug, { action: "publish", expectedRevision: 1 }), /FORBIDDEN/);
      await assert.rejects(api.findCatalogDraft(outsider.id, entry.slug, 1), /FORBIDDEN/);
    });
    let saved = await api.saveCatalogDraft(admin.id, { expectedRevision: 0, entry }); slugs.push(entry.slug);
    await check("new draft stays private and duplicate create preserves immutable v1", async () => {
      assert.equal(saved.revision, 1); assert.equal(await api.findPublishedCatalog(entry.slug), undefined);
      await assert.rejects(api.saveCatalogDraft(admin.id, { expectedRevision: 0, entry }), /REVISION_CONFLICT/);
      assert.equal(await db.catalogProjectVersion.count({ where: { projectId: saved.id } }), 1);
    });
    await check("publication exposes saved v1 and repeat publication preserves snapshots", async () => {
      await api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 1 });
      await api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 1 });
      assert.equal((await api.findPublishedCatalog(entry.slug))?.content?.zh.title, content.title);
      assert.equal(await db.catalogProjectVersion.count({ where: { projectId: saved.id } }), 1);
    });
    const v2 = { ...entry, content: { zh: { ...content, title: "PRIVATE_NEW_DRAFT" } } };
    saved = await api.saveCatalogDraft(admin.id, { expectedRevision: 1, entry: v2 });
    await check("unpublished v2 never leaks to public and pinned preview still reads v1", async () => {
      assert.equal((await api.findPublishedCatalog(entry.slug))?.content?.zh.title, content.title);
      assert.equal((await api.findCatalogDraft(admin.id, entry.slug, 1)).content.zh.title, content.title);
      assert.equal((await api.findCatalogDraft(admin.id, entry.slug, 2)).content.zh.title, "PRIVATE_NEW_DRAFT");
      await assert.rejects(api.findCatalogDraft(admin.id, entry.slug, 999), /NOT_FOUND/);
      await assert.rejects(api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 1 }), /REVISION_CONFLICT/);
    });
    await check("concurrent CAS admits one revision and stale publication cannot roll it back", async () => {
      const results = await Promise.allSettled([api.saveCatalogDraft(admin.id, { expectedRevision: 2, entry: v2 }), api.saveCatalogDraft(admin.id, { expectedRevision: 2, entry: v2 })]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(await db.catalogProjectVersion.count({ where: { projectId: saved.id } }), 3);
      await assert.rejects(api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 2 }), /REVISION_CONFLICT/);
    });
    await check("publish and withdraw propagate; saving a later draft cannot resurrect withdrawn content", async () => {
      await api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 3 });
      assert.equal((await api.findPublishedCatalog(entry.slug))?.content?.zh.title, "PRIVATE_NEW_DRAFT");
      await api.changeCatalogPublication(admin.id, entry.slug, { action: "withdraw", expectedRevision: 3 });
      assert.equal(await api.findPublishedCatalog(entry.slug), undefined);
      await api.saveCatalogDraft(admin.id, { expectedRevision: 3, entry });
      assert.equal(await api.findPublishedCatalog(entry.slug), undefined);
    });
    await check("permission revocation, empty permissions, flagged and deleted admins are immediately rejected", async () => {
      for (const data of [{ adminPermissions: [] }, { adminPermissions: ["USERS_MANAGE"] }, { adminPermissions: ["CATALOG_MANAGE"], flagged: true }, { flagged: false, deletedAt: new Date() }]) {
        await db.user.update({ where: { id: admin.id }, data });
        await assert.rejects(api.listCatalogAdmin(admin.id), /FORBIDDEN/);
        await assert.rejects(api.saveCatalogDraft(admin.id, { expectedRevision: 4, entry }), /FORBIDDEN/);
        await assert.rejects(api.changeCatalogPublication(admin.id, entry.slug, { action: "publish", expectedRevision: 4 }), /FORBIDDEN/);
      }
      await db.user.update({ where: { id: admin.id }, data: { deletedAt: null, flagged: false, adminPermissions: ["CATALOG_MANAGE"] } });
    });
    await check("database forbids changing/deleting snapshots and missing public pointer", async () => {
      await assert.rejects(db.$executeRaw`UPDATE "catalog_project_versions" SET "payload" = '{}'::jsonb WHERE "projectId" = ${saved.id}`);
      await assert.rejects(db.$executeRaw`DELETE FROM "catalog_project_versions" WHERE "projectId" = ${saved.id}`);
      await assert.rejects(db.$transaction(async tx => {
        await tx.$executeRaw`UPDATE "catalog_projects" SET "revision" = 900, "publishedRevision" = 899 WHERE "id" = ${saved.id}`;
      }));
      assert.equal((await db.catalogProject.findUniqueOrThrow({ where: { id: saved.id } })).revision, 4);
    });
    await check("audit records provenance without project payload or secrets", async () => {
      const audits = await db.auditLog.findMany({ where: { actorId: admin.id, resourceType: "catalog" } });
      assert(audits.length >= 8); assert(!JSON.stringify(audits).includes("PRIVATE_CATALOG_MARKER")); assert(!JSON.stringify(audits).includes("PRIVATE_NEW_DRAFT"));
    });
    await mkdir(".workbuddy/evidence/catalog", { recursive: true });
    await writeFile(".workbuddy/evidence/catalog/integration.json", JSON.stringify({ environment: "isolated PostgreSQL; real migrated schema; no upstream calls", checks }, null, 2));
  } finally {
    await db.catalogProject.updateMany({ where: { slug: { in: slugs } }, data: { withdrawn: true } });
    await db.user.updateMany({ where: { id: { in: users } }, data: { deletedAt: new Date() } });
    await db.$disconnect();
  }
}
main().catch(() => { console.error("Catalog integration failed; no private payload printed"); process.exitCode = 1; });