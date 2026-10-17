import { cache } from "react";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, type DbTransaction } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import { getPlatformRecipe, isPlatformRecipeMetadata, PLATFORM_RESUME_RECIPE } from "@/domain/workflows/platform-recipes";

export class PlatformRecipeError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
    this.name = "PlatformRecipeError";
  }
}
const workflowInclude = {
  author: { select: { id: true, username: true, nickname: true, avatar: true, role: true, deletedAt: true, flagged: true, adminPermissions: true } },
  versions: true,
} as const;
const hash = (value: unknown) => createHash("sha256").update(stableWorkflowInput(value)).digest("hex");

async function queryPlatformRecipe(tx: DbTransaction, idOrSlug: string, ownerId?: string) {
  const workflow = await tx.workflow.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }, { officialId: idOrSlug }] },
    include: workflowInclude,
  });
  if (!workflow || !isPlatformRecipeMetadata(workflow)) return null;
  const recipe = getPlatformRecipe(workflow.officialId!);
  if (!recipe || ownerId && ownerId !== workflow.authorId) return null;
  const owner = workflow.author;
  if (!owner || owner.id !== workflow.authorId || owner.role !== "ADMIN" || owner.deletedAt || owner.flagged || !hasAdminPermission(owner.adminPermissions, "MARKETPLACE_MANAGE")) return null;
  // No hidden later draft/version can alter this immutable platform registration.
  if (workflow.versions.length !== 1) return null;
  const version = workflow.versions[0];
  if (version.version !== recipe.version || version.workflowId !== workflow.id || version.createdById !== owner.id) return null;
  const parsed = workflowDefinitionSchema.safeParse(version.definition);
  if (!parsed.success || hash(version.definition) !== recipe.definitionHash || hash(parsed.data) !== recipe.definitionHash || hash(recipe.definition) !== recipe.definitionHash || hash(recipe.sourceFiles) !== recipe.sourceCodeHash) return null;
  const audit = await tx.auditLog.findFirst({
    where: { action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: workflow.id, actorId: owner.id, AND: [
      { metadata: { path: ["officialId"], equals: recipe.officialId } },
      { metadata: { path: ["workflowId"], equals: workflow.id } },
      { metadata: { path: ["ownerId"], equals: owner.id } },
      { metadata: { path: ["version"], equals: recipe.version } },
      { metadata: { path: ["versionId"], equals: version.id } },
      { metadata: { path: ["definitionHash"], equals: recipe.definitionHash } },
      { metadata: { path: ["sourceCodeHash"], equals: recipe.sourceCodeHash } },
    ] },
    select: { id: true, actorId: true, resourceType: true, resourceId: true, action: true, metadata: true },
  });
  // Validate the actual returned record as well as querying the exact binding.
  if (!audit || audit.actorId !== owner.id || audit.resourceType !== "workflow" || audit.resourceId !== workflow.id || audit.action !== "PLATFORM_RECIPE_REGISTERED" || !audit.metadata || typeof audit.metadata !== "object" || Array.isArray(audit.metadata)) return null;
  const metadata = audit.metadata as Record<string, unknown>;
  const expected = { officialId: recipe.officialId, workflowId: workflow.id, ownerId: owner.id, version: recipe.version, versionId: version.id, definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash };
  if (Object.entries(expected).some(([key, value]) => metadata[key] !== value)) return null;
  return { recipe, workflow: { ...workflow, author: { id: owner.id, username: owner.username, nickname: owner.nickname, avatar: owner.avatar } }, version, definition: parsed.data };
}

async function queryPlatformRecipeFast() {
  const recipe = PLATFORM_RESUME_RECIPE;
  const [workflow, audit] = await Promise.all([
    db.workflow.findFirst({
      where: { officialId: recipe.officialId },
      include: workflowInclude,
    }),
    db.auditLog.findFirst({
      where: {
        action: "PLATFORM_RECIPE_REGISTERED",
        resourceType: "workflow",
        AND: [
          { metadata: { path: ["officialId"], equals: recipe.officialId } },
          { metadata: { path: ["version"], equals: recipe.version } },
          { metadata: { path: ["definitionHash"], equals: recipe.definitionHash } },
          { metadata: { path: ["sourceCodeHash"], equals: recipe.sourceCodeHash } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, actorId: true, resourceType: true, resourceId: true, action: true, metadata: true },
    }),
  ]);
  if (!workflow || !isPlatformRecipeMetadata(workflow)) return null;
  const owner = workflow.author;
  if (!owner || owner.id !== workflow.authorId || owner.role !== "ADMIN" || owner.deletedAt || owner.flagged || !hasAdminPermission(owner.adminPermissions, "MARKETPLACE_MANAGE")) return null;
  if (workflow.versions.length !== 1) return null;
  const version = workflow.versions[0];
  if (version.version !== recipe.version || version.workflowId !== workflow.id || version.createdById !== owner.id) return null;
  const parsed = workflowDefinitionSchema.safeParse(version.definition);
  if (!parsed.success || hash(version.definition) !== recipe.definitionHash || hash(parsed.data) !== recipe.definitionHash || hash(recipe.definition) !== recipe.definitionHash || hash(recipe.sourceFiles) !== recipe.sourceCodeHash) return null;
  if (!audit || audit.actorId !== owner.id || audit.resourceType !== "workflow" || audit.resourceId !== workflow.id || audit.action !== "PLATFORM_RECIPE_REGISTERED" || !audit.metadata || typeof audit.metadata !== "object" || Array.isArray(audit.metadata)) return null;
  const metadata = audit.metadata as Record<string, unknown>;
  const expected = { officialId: recipe.officialId, workflowId: workflow.id, ownerId: owner.id, version: recipe.version, versionId: version.id, definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash };
  if (Object.entries(expected).some(([key, value]) => metadata[key] !== value)) return null;
  return { recipe, workflow: { ...workflow, author: { id: owner.id, username: owner.username, nickname: owner.nickname, avatar: owner.avatar } }, version, definition: parsed.data };
}

let inFlightPlatformRecipe: ReturnType<typeof queryPlatformRecipeFast> | null = null;
function loadInFlightPlatformRecipe() {
  if (inFlightPlatformRecipe) return inFlightPlatformRecipe;
  const pending = queryPlatformRecipeFast();
  inFlightPlatformRecipe = pending;
  const clear = () => { if (inFlightPlatformRecipe === pending) inFlightPlatformRecipe = null; };
  void pending.then(clear, clear);
  return pending;
}

const getRequestPlatformRecipe = cache(async () => loadInFlightPlatformRecipe());

/** Every read validates provenance and the owner's current authority. Reads never register or run. */
export async function readPlatformRecipe(tx: DbTransaction, idOrSlug: string, ownerId?: string) {
  if (tx === db && process.env.NODE_ENV !== "test") {
    const cached = await getRequestPlatformRecipe();
    if (cached && (idOrSlug === cached.workflow.id || idOrSlug === cached.workflow.slug || idOrSlug === cached.recipe.officialId)) {
      if (ownerId && ownerId !== cached.workflow.author.id) return null;
      return cached;
    }
  }
  return queryPlatformRecipe(tx, idOrSlug, ownerId);
}

export async function findPublishedPlatformRecipe(idOrSlug: string = PLATFORM_RESUME_RECIPE.officialId) {
  return readPlatformRecipe(db, idOrSlug);
}

/** Explicit authorized deployment command only. Never call from a page or GET. */
export async function registerPlatformResumeRecipe(ownerId: string) {
  // Session-pooler round trips exceed Prisma's default 5s for the full attestation.
  // Keep a finite budget and the same atomic registration/provenance transaction.
  return db.$transaction(async tx => {
    // Serialize both the reserved identifiers and concurrent owner deactivation.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PLATFORM_RESUME_RECIPE.officialId}))`;
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${ownerId} FOR UPDATE`;
    const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true, deletedAt: true, flagged: true, adminPermissions: true } });
    if (!owner || owner.role !== "ADMIN" || owner.deletedAt || owner.flagged || !hasAdminPermission(owner.adminPermissions, "MARKETPLACE_MANAGE")) throw new PlatformRecipeError("PLATFORM_RECIPE_OWNER_FORBIDDEN", 403);
    await tx.$queryRaw`SELECT id FROM workflows WHERE slug = ${PLATFORM_RESUME_RECIPE.slug} OR "officialId" = ${PLATFORM_RESUME_RECIPE.officialId} FOR UPDATE`;
    const existing = await tx.workflow.findMany({ where: { OR: [{ slug: PLATFORM_RESUME_RECIPE.slug }, { officialId: PLATFORM_RESUME_RECIPE.officialId }] }, select: { id: true } });
    if (existing.length) {
      const valid = existing.length === 1 ? await readPlatformRecipe(tx, existing[0].id, ownerId) : null;
      if (!valid) throw new PlatformRecipeError("PLATFORM_RECIPE_REGISTRATION_CONFLICT");
      return valid;
    }
    const recipe = PLATFORM_RESUME_RECIPE;
    if (hash(recipe.definition) !== recipe.definitionHash || hash(recipe.sourceFiles) !== recipe.sourceCodeHash) throw new PlatformRecipeError("PLATFORM_RECIPE_REGISTRY_INVALID");
    const created = await tx.workflow.create({ data: {
      officialId: recipe.officialId, isOfficial: true, slug: recipe.slug, title: recipe.title, summary: recipe.summary,
      description: recipe.description, estimatedCost: recipe.estimatedCost, authorId: ownerId, status: "PUBLISHED", publishedVersion: recipe.version,
      // No fictional AI review verdict; platform code registration is its own attestation.
      versions: { create: { version: recipe.version, definition: recipe.definition as Prisma.InputJsonValue, createdById: ownerId } },
    }, include: workflowInclude });
    const version = created.versions[0];
    if (created.versions.length !== 1 || !version) throw new PlatformRecipeError("PLATFORM_RECIPE_REGISTRATION_INVALID");
    await tx.auditLog.create({ data: {
      actorId: ownerId, action: "PLATFORM_RECIPE_REGISTERED", resourceType: "workflow", resourceId: created.id,
      metadata: { officialId: recipe.officialId, workflowId: created.id, ownerId, version: recipe.version, versionId: version.id, definitionHash: recipe.definitionHash, sourceCodeHash: recipe.sourceCodeHash },
    } });
    const registered = await readPlatformRecipe(tx, created.id, ownerId);
    if (!registered) throw new PlatformRecipeError("PLATFORM_RECIPE_REGISTRATION_INVALID");
    return registered;
  }, { maxWait: 15000, timeout: 30000 });
}
