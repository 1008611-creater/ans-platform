import { cache } from "react";
import { createHash } from "node:crypto";
import { resumeWebsiteInputSchema } from "@/contracts/resume-website";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import { db } from "@/lib/db";
import type { MarketListingInput } from "@/contracts/marketplace";
import { marketListingInputSchema } from "@/contracts/marketplace";
import { marketWorkflowUploadSchema, marketWorkflowRunSchema } from "@/contracts/market-workflow";
import { missingRequiredVariables, extractInputVariables } from "@/domain/workflows/variables";
import { MarketRuleError } from "@/domain/marketplace/order";
import { createWorkflowRun, WorkflowServiceError } from "@/server/workflows/service";
import { unifiedModelBilling } from "@/server/integrations/metered-cost";
import { createMarketListing, submitMarketListing } from "./listings";
import { readReviewedWorkflow, assertMarketWorkflowBinding, workflowDefinitionHash } from "./workflow-binding";
import { marketHash, requireMarketActor } from "./shared";

/** One click creates and submits a real immutable listing, never auto-approves it. */
export async function uploadWorkflowToMarket(slug: string, actorId: string, raw: unknown, recover = true) {
  const input = marketWorkflowUploadSchema.parse(raw);
  const source = await db.workflow.findUnique({ where: { slug }, select: { id: true } });
  if (!source) throw new MarketRuleError("NOT_FOUND", 404);
  const { workflow, version, definition } = await readReviewedWorkflow(db, source.id, actorId);
  if (version.version !== input.expectedWorkflowVersion) throw new MarketRuleError("VERSION_CONFLICT", 409);
  const listingSlug = `workflow-${marketHash(workflow.id).slice(0, 24)}-v${version.version}`;
  const old = await db.marketListing.findUnique({ where: { slug: listingSlug }, include: { versions: true } });
  if (old) {
    if (old.sellerId !== actorId) throw new MarketRuleError("FORBIDDEN", 403);
    const payload = old.versions.find(v => v.version === old.currentVersion);
    const parsed = payload ? marketListingInputSchema.parse(payload.payload) : null;
    if (!parsed?.execution || parsed.execution.versionId !== version.id || parsed.execution.definitionHash !== workflowDefinitionHash(definition)) throw new MarketRuleError("VERSION_CONFLICT", 409);
    // A lost upload acknowledgement recovers the same draft/submission, without creating duplicates.
    if (payload && !payload.submittedAt && !payload.reviewedAt) await submitMarketListing(old.id, actorId, old.currentVersion);
    return { id: old.id, slug: old.slug, status: old.status };
  }
  // Factual runtime instructions fill optional source metadata; never invent project results.
  const title = workflow.title.trim().length < 2 ? `${workflow.title.trim()} 工作流` : workflow.title.trim().slice(0, 100);
  const instruction = `工作流 v${version.version}。填写自己的资料并确认算力费用后运行，结果保存在个人运行记录中。`;
  const summary = (workflow.summary?.trim() || workflow.description?.trim() || instruction).slice(0, 300);
  const description = workflow.description?.trim() || "";
  const listing: MarketListingInput = {
    slug: listingSlug, title, summary: summary.length < 10 ? `${summary} · ${instruction}`.slice(0, 300) : summary,
    description: description.length < 20 ? `${description}\n${instruction}`.trim() : description.slice(0, 20000),
    category: input.category, subcategory: input.subcategory, fulfillment: "resource", currency: "CNY", priceMinor: 0,
    deliveryDays: 1, revisionLimit: 0, computeIncluded: false, licenseTerms: input.licenseTerms,
    deliverables: definition.recipe ? ["HTML / resume-website-v1"] : ["Workflow run output / JSON"],
    execution: { workflowId: workflow.id, versionId: version.id, version: version.version, definitionHash: workflowDefinitionHash(definition) },
  };
  try {
    const created = await createMarketListing(actorId, listing, { official: workflow.isOfficial });
    await submitMarketListing(created.id, actorId, 1);
    return { id: created.id, slug: created.slug, status: "PENDING" };
  } catch (error) {
    if (recover && error instanceof MarketRuleError && ["SLUG_TAKEN", "CONFLICT", "INVALID_LISTING_STATE"].includes(error.code)) return uploadWorkflowToMarket(slug, actorId, raw, false);
    throw error;
  }
}
// Presentation only, scoped to one server render. Primitive keys also deduplicate
// equivalent listing objects. Mutations below always recheck the live binding.
const readMarketWorkflowDetails = cache(async (sellerId: string, workflowId: string, versionId: string, version: number, definitionHash: string) => {
  const binding = { workflowId, versionId, version, definitionHash };
  try {
    const { workflow, definition } = await assertMarketWorkflowBinding(db, sellerId, binding);
    const estimate = unifiedModelBilling() ? null : process.env.ANS_APIC_BILLING_ENABLED === "1" ? Math.max(.25, definition.nodes.filter(n => n.type === "model").length * .25) : Math.max(1, workflow.estimatedCost || 1);
    return { available: true as const, recipe: definition.recipe ?? null, variables: extractInputVariables(definition), estimatedCost: estimate, version: binding.version };
  } catch (error) {
    if (error instanceof MarketRuleError) return { available: false as const, reason: error.code, version: binding.version };
    throw error;
  }
});
export async function marketWorkflowDetails(listing: { seller: { id: string }; listing: MarketListingInput }) {
  const binding = listing.listing.execution;
  if (!binding) return null;
  return readMarketWorkflowDetails(listing.seller.id, binding.workflowId, binding.versionId, binding.version, binding.definitionHash);
}
export async function runMarketWorkflow(listingId: string, actorId: string, raw: unknown) {
  const input = marketWorkflowRunSchema.parse(raw);
  await requireMarketActor(db, actorId);
  const listing = await db.marketListing.findFirst({ where: { id: listingId, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } }, include: { versions: true } });
  if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
  if (listing.publishedVersion !== input.expectedVersion) throw new MarketRuleError("VERSION_CONFLICT", 409);
  const version = listing.versions.find(v => v.version === listing.publishedVersion);
  const payload = version ? marketListingInputSchema.parse(version.payload) : null;
  if (!payload?.execution) throw new MarketRuleError("WORKFLOW_RUN_REQUIRED", 409);
  const binding = payload.execution;
  const { workflow, definition } = await assertMarketWorkflowBinding(db, listing.sellerId, binding);
  if (!definition.recipe && missingRequiredVariables(extractInputVariables(definition), input.input).length) throw new MarketRuleError("INVALID_INPUT", 400);
  if (process.env.ANS_PROJECT_WORKER_DISABLED === "true") throw new MarketRuleError("WORKER_UNAVAILABLE", 503);
  try {
    const run = await createWorkflowRun(workflow.slug, actorId, { input: input.input, idempotencyKey: input.idempotencyKey }, {
      expectedVersionId: binding.versionId, expectedInput: true, confirmedSource: "market", idempotencyScope: `market/${listing.id}/${version!.version}`,
      beforeCreate: async tx => {
        await tx.$queryRaw`SELECT id FROM market_listings WHERE id = ${listing.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM workflows WHERE id = ${workflow.id} FOR UPDATE`;
        await requireMarketActor(tx, actorId);
        const current = await tx.marketListing.findFirst({ where: { id: listing.id, status: "PUBLISHED", publishedVersion: input.expectedVersion } });
        if (!current) throw new MarketRuleError("VERSION_CONFLICT", 409);
        await assertMarketWorkflowBinding(tx, listing.sellerId, binding);
      },
    });
    return { run: { id: run.id, status: run.status, costPoints: run.costPoints }, listingId, listingVersion: version!.version, workflowVersion: binding.version };
  } catch (error) {
    if (error instanceof WorkflowServiceError) throw new MarketRuleError(error.code, error.status);
    throw error;
  }
}

function copyInputFingerprint(input: unknown) {
  const parsed = resumeWebsiteInputSchema.safeParse(input && typeof input === "object" && "profile" in input ? input.profile : null);
  return parsed.success ? createHash("sha256").update(stableWorkflowInput({ profile: parsed.data })).digest("hex") : null;
}

/** Owner-only read for reload/lost acknowledgements; navigation never enqueues a run. */
export async function listMarketWorkflowRuns(listingId: string, actorId: string) {
  await requireMarketActor(db, actorId);
  const runs = await db.workflowRun.findMany({ where: { userId: actorId, idempotencyKey: { startsWith: `market/${listingId}/` } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, status: true, input: true, costPoints: true, error: true, output: true, createdAt: true, finishedAt: true, version: { select: { version: true } } } });
  return { runs: runs.map(run => ({ id: run.id, status: run.status, inputFingerprint: copyInputFingerprint(run.input), costPoints: run.costPoints, error: run.error ? "EXECUTION_FAILED" : null, output: run.status === "SUCCEEDED" ? run.output : null, createdAt: run.createdAt.toISOString(), workflowVersion: run.version.version })) };
}

/** Fixed recipes also run from their Hub detail page, using the same review and confirmation gate. */
export async function runReviewedRecipe(slug: string, actorId: string, raw: unknown) {
  const input = marketWorkflowRunSchema.parse(raw);
  await requireMarketActor(db, actorId);
  const source = await db.workflow.findUnique({ where: { slug }, select: { id: true, authorId: true } });
  if (!source) throw new MarketRuleError("NOT_FOUND", 404);
  const { workflow, version, definition } = await readReviewedWorkflow(db, source.id, source.authorId);
  if (!definition.recipe) throw new MarketRuleError("INVALID_RECIPE_DEFINITION", 400);
  if (version.version !== input.expectedVersion) throw new MarketRuleError("VERSION_CONFLICT", 409);
  if (process.env.ANS_PROJECT_WORKER_DISABLED === "true") throw new MarketRuleError("WORKER_UNAVAILABLE", 503);
  const binding = { workflowId: workflow.id, versionId: version.id, version: version.version, definitionHash: workflowDefinitionHash(definition) };
  try {
    const run = await createWorkflowRun(slug, actorId, { input: input.input, idempotencyKey: input.idempotencyKey }, {
      expectedVersionId: version.id, expectedInput: true, confirmedSource: "reviewed_workflow", idempotencyScope: `reviewed/${workflow.id}/${version.version}`,
      beforeCreate: async tx => {
        await tx.$queryRaw`SELECT id FROM workflows WHERE id = ${workflow.id} FOR UPDATE`;
        await requireMarketActor(tx, actorId);
        await assertMarketWorkflowBinding(tx, source.authorId, binding);
      },
    });
    return { run: { id: run.id, status: run.status, costPoints: run.costPoints } };
  } catch (error) { if (error instanceof WorkflowServiceError) throw new MarketRuleError(error.code, error.status); throw error; }
}
export async function listReviewedRecipeRuns(slug: string, actorId: string) {
  await requireMarketActor(db, actorId);
  const source = await db.workflow.findUnique({ where: { slug }, select: { id: true } });
  if (!source) throw new MarketRuleError("NOT_FOUND", 404);
  const runs = await db.workflowRun.findMany({ where: { userId: actorId, idempotencyKey: { startsWith: `reviewed/${source.id}/` } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, status: true, input: true, costPoints: true, error: true, output: true, createdAt: true, version: { select: { version: true } } } });
  return { runs: runs.map(run => ({ id: run.id, status: run.status, inputFingerprint: copyInputFingerprint(run.input), costPoints: run.costPoints, error: run.error ? "EXECUTION_FAILED" : null, output: run.status === "SUCCEEDED" ? run.output : null, createdAt: run.createdAt.toISOString(), workflowVersion: run.version.version })) };
}

/** Discover only the real, published market card bound to this exact platform version. */
export async function publishedRecipeMarketPath(workflow: { id: string; authorId: string }, version: { id: string; version: number }, definitionHash: string) {
  const slug = `workflow-${marketHash(workflow.id).slice(0, 24)}-v${version.version}`;
  const listing = await db.marketListing.findFirst({ where: { slug, sellerId: workflow.authorId, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } }, include: { versions: true } });
  const published = listing?.versions.find(v => v.version === listing.publishedVersion);
  const parsed = marketListingInputSchema.safeParse(published?.payload);
  const binding = parsed.success ? parsed.data.execution : null;
  if (!published?.reviewedAt || !binding || binding.workflowId !== workflow.id || binding.versionId !== version.id || binding.version !== version.version || binding.definitionHash !== definitionHash) return null;
  return `/market/${slug}`;
}
