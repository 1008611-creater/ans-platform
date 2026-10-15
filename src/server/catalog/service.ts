import type { DbTransaction } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { catalogActionSchema, catalogEntrySchema, catalogSaveSchema, type CatalogAdminEntry } from "@/contracts/catalog-content";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
import { listMarketListings } from "@/server/marketplace/listings";
import { memberCatalogProject } from "@/domain/catalog/member-project";
import { readAgriWall } from "@/server/competitions/agrihackathon/wall";
import { mergeCatalog } from "@/domain/catalog/content";

export class CatalogError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); this.name = "CatalogError"; }
}
async function requireEditor(tx: DbTransaction, userId: string) {
  const user = await tx.user.findFirst({ where: { id: userId, role: "ADMIN", deletedAt: null, flagged: false }, select: { adminPermissions: true } });
  if (!user || !hasAdminPermission(user.adminPermissions, "CATALOG_MANAGE")) throw new CatalogError("FORBIDDEN", 403);
}
async function loadPublishedCatalog() {
  // No catch/fallback: an unavailable DB must not silently resurrect withdrawn content.
  const official = await db.$transaction(async (tx) => {
    const rows = await tx.catalogProject.findMany({ select: { id: true, slug: true, withdrawn: true, publishedRevision: true }, orderBy: { createdAt: "asc" } });
    const pointers = rows.flatMap(row => row.publishedRevision === null || row.withdrawn ? [] : [{ projectId: row.id, revision: row.publishedRevision }]);
    const versions = pointers.length ? await tx.catalogProjectVersion.findMany({ where: { OR: pointers }, select: { projectId: true, revision: true, payload: true } }) : [];
    const snapshots = new Map(versions.map(version => [version.projectId + ":" + version.revision, version.payload]));
    return mergeCatalog(CATALOG_PROJECTS, rows.map(row => ({ slug: row.slug, withdrawn: row.withdrawn,
      published: row.publishedRevision === null || row.withdrawn ? null : catalogEntrySchema.parse(snapshots.get(row.id + ":" + row.publishedRevision)),
    })));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const retired = new Set(["resume-website", "resume-story", "project-page", "readme-kit", "competition-starter", "pitch-kit", "learning-retrospective", "grok-motion-lab", "open-resume", "dify-agent"]);
  // Runnable recipe listings belong to workflows and market, not project discovery.
  const [offers, wall] = await Promise.all([listMarketListings(), readAgriWall()]);
  const members = offers.filter(offer => !offer.listing.execution && offer.listing.subcategory !== "agri-wall").map(memberCatalogProject);
  members.push(...wall.entries.map(entry => memberCatalogProject(entry.offer)));
  return [...official.filter(entry => !retired.has(entry.slug) && entry.subcategory !== "agri-wall"), ...members];
}
// Share only in-flight public reads. Do not cache completed data or private queries.
let publishedInFlight: ReturnType<typeof loadPublishedCatalog> | null = null;
export function listPublishedCatalog() {
  if (publishedInFlight) return publishedInFlight;
  const pending = loadPublishedCatalog();
  publishedInFlight = pending;
  const clear = () => { if (publishedInFlight === pending) publishedInFlight = null; };
  void pending.then(clear, clear);
  return pending;
}
export async function findPublishedCatalog(slug: string) {
  return (await listPublishedCatalog()).find((entry) => entry.slug === slug);
}
type CatalogRow = { id: string; slug: string; revision: number; publishedRevision: number | null; withdrawn: boolean };
async function adminViews(tx: DbTransaction, rows: CatalogRow[]): Promise<CatalogAdminEntry[]> {
  const pointers = rows.flatMap(row => [row.revision, ...(row.publishedRevision === null ? [] : [row.publishedRevision])].map(revision => ({ projectId: row.id, revision })));
  const versions = pointers.length ? await tx.catalogProjectVersion.findMany({ where: { OR: pointers }, select: { projectId: true, revision: true, payload: true } }) : [];
  const snapshots = new Map(versions.map(version => [version.projectId + ":" + version.revision, version.payload]));
  return rows.map(row => ({ ...row,
    draft: catalogEntrySchema.parse(snapshots.get(row.id + ":" + row.revision)),
    published: row.publishedRevision === null ? null : catalogEntrySchema.parse(snapshots.get(row.id + ":" + row.publishedRevision)),
  }));
}
export async function listCatalogAdmin(userId: string) {
  return db.$transaction(async (tx) => {
    await requireEditor(tx, userId);
    return adminViews(tx, await tx.catalogProject.findMany({ orderBy: { updatedAt: "desc" } }));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function findCatalogDraft(userId: string, slug: string, revision: number) {
  return db.$transaction(async (tx) => {
    await requireEditor(tx, userId);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new CatalogError("NOT_FOUND", 404);
    const row = await tx.catalogProject.findUnique({ where: { slug }, select: { id: true } });
    if (!row) throw new CatalogError("NOT_FOUND", 404);
    const version = await tx.catalogProjectVersion.findUnique({ where: { projectId_revision: { projectId: row.id, revision } }, select: { payload: true } });
    if (!version) throw new CatalogError("NOT_FOUND", 404);
    return catalogEntrySchema.parse(version.payload);
  });
}
export async function saveCatalogDraft(userId: string, raw: unknown): Promise<CatalogAdminEntry> {
  const { expectedRevision, entry } = catalogSaveSchema.parse(raw);
  try {
    return await db.$transaction(async (tx) => {
      await requireEditor(tx, userId);
      let row;
      if (expectedRevision === 0) row = await tx.catalogProject.create({ data: { slug: entry.slug } });
      else {
        const changed = await tx.catalogProject.updateMany({ where: { slug: entry.slug, revision: expectedRevision }, data: { revision: { increment: 1 } } });
        if (changed.count !== 1) throw new CatalogError("REVISION_CONFLICT");
        row = await tx.catalogProject.findUniqueOrThrow({ where: { slug: entry.slug } });
      }
      await tx.catalogProjectVersion.create({ data: { projectId: row.id, revision: row.revision, payload: entry as Prisma.InputJsonValue, authorId: userId } });
      await tx.auditLog.create({ data: { actorId: userId, action: "CATALOG_DRAFT_SAVED", resourceType: "catalog", resourceId: row.id, metadata: { slug: row.slug, revision: row.revision } } });
      return (await adminViews(tx, [row]))[0];
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new CatalogError("REVISION_CONFLICT");
    throw error;
  }
}
export async function changeCatalogPublication(userId: string, slug: string, raw: unknown): Promise<CatalogAdminEntry> {
  const { action, expectedRevision } = catalogActionSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await requireEditor(tx, userId);
    // CAS serializes publish, withdraw and save. Repeated requests are harmless.
    const changed = await tx.catalogProject.updateMany({ where: { slug, revision: expectedRevision }, data: action === "publish" ? { publishedRevision: expectedRevision, withdrawn: false } : { withdrawn: true } });
    if (changed.count !== 1) throw new CatalogError("REVISION_CONFLICT");
    const row = await tx.catalogProject.findUniqueOrThrow({ where: { slug } });
    await tx.auditLog.create({ data: { actorId: userId, action: action === "publish" ? "CATALOG_PUBLISHED" : "CATALOG_WITHDRAWN", resourceType: "catalog", resourceId: row.id, metadata: { slug, revision: expectedRevision } } });
    return (await adminViews(tx, [row]))[0];
  });
}