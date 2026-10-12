import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PLATFORM_RESUME_RECIPE } from "../src/domain/workflows/platform-recipes";
import { stableWorkflowInput } from "../src/domain/workflows/recipes";
import { marketListingInputSchema } from "../src/contracts/marketplace";

/** Deployment guard reads actual source bytes before creating any database records. */
export function verifyPlatformRecipeSource(sourceRoot: string) {
  const sourceFiles = PLATFORM_RESUME_RECIPE.sourceFiles.map(source => {
    const text = readFileSync(resolve(sourceRoot, source.path), "utf8").replace(/\r\n/g, "\n");
    const sha256 = createHash("sha256").update(text).digest("hex");
    if (sha256 !== source.sha256) throw new Error("PLATFORM_RECIPE_SOURCE_CONFLICT");
    return { path: source.path, sha256 };
  });
  const hash = createHash("sha256").update(stableWorkflowInput(sourceFiles)).digest("hex");
  if (hash !== PLATFORM_RESUME_RECIPE.sourceCodeHash) throw new Error("PLATFORM_RECIPE_SOURCE_CONFLICT");
  return hash;
}

/** Only the authorized explicit owner command registers/submits/reviews; no run/model path. */
export async function publishPlatformResumeRecipe(ownerId: string, sourceRoot: string) {
  if (!ownerId.trim() || ownerId !== ownerId.trim()) throw new Error("PLATFORM_RECIPE_OWNER_REQUIRED");
  verifyPlatformRecipeSource(sourceRoot);
  const [{ db }, { registerPlatformResumeRecipe, readPlatformRecipe }, { uploadWorkflowToMarket }, { reviewMarketListing }, { marketHash }] = await Promise.all([
    import("../src/lib/db"), import("../src/server/workflows/platform-recipes"), import("../src/server/marketplace/workflows"), import("../src/server/marketplace/listings"), import("../src/server/marketplace/shared"),
  ]);
  const source = await registerPlatformResumeRecipe(ownerId);
  const slug = `workflow-${marketHash(source.workflow.id).slice(0, 24)}-v${source.version.version}`;
  const checkListing = (listing: NonNullable<Awaited<ReturnType<typeof db.marketListing.findUnique>> > & { versions: { version: number; payload: unknown; submittedAt: Date | null; reviewedAt: Date | null; reviewedById: string | null }[] }) => {
    const version = listing.versions[0];
    if (listing.sellerId !== ownerId || !listing.official || listing.slug !== slug || listing.currentVersion !== 1 || listing.versions.length !== 1 || !version || version.version !== 1 || listing.status === "WITHDRAWN") throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    const payload = marketListingInputSchema.safeParse(version.payload);
    const binding = payload.success ? payload.data.execution : null;
    if (!payload.success || !binding || binding.workflowId !== source.workflow.id || binding.versionId !== source.version.id || binding.version !== source.version.version || binding.definitionHash !== source.recipe.definitionHash || payload.data.priceMinor !== 0 || payload.data.computeIncluded || payload.data.fulfillment !== "resource") throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    if (version.reviewedAt && (listing.status !== "PUBLISHED" || listing.publishedVersion !== 1 || version.reviewedById !== ownerId || !version.submittedAt)) throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    if (listing.status === "PUBLISHED" && (!version.reviewedAt || listing.publishedVersion !== 1)) throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    return version;
  };
  let listing = await db.marketListing.findUnique({ where: { slug }, include: { versions: true } });
  if (listing) checkListing(listing);
  if (!listing || listing.status !== "PUBLISHED") {
    await uploadWorkflowToMarket(source.workflow.slug, ownerId, { expectedWorkflowVersion: source.version.version, category: "career", subcategory: "portfolio", licenseTerms: "生成的个人作品集供资料提交者个人使用。平台固定模板和保留的开源代码遵循各自适用许可；请只输入有权使用的真实个人资料。" });
    listing = await db.marketListing.findUnique({ where: { slug }, include: { versions: true } });
    if (!listing) throw new Error("PLATFORM_RECIPE_LISTING_MISSING");
    const pending = checkListing(listing);
    if (!pending.submittedAt || pending.reviewedAt || listing.status !== "PENDING") throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    await reviewMarketListing(listing.id, ownerId, 1, true, `平台固定代码配方发布：${source.recipe.officialId}；定义 ${source.recipe.definitionHash}；源码 ${source.recipe.sourceCodeHash}。已按本次明确授权审查固定输入、文案整理与 HTML 渲染；不代表生成结果或模型调用已经执行。`);
    listing = await db.marketListing.findUnique({ where: { slug }, include: { versions: true } });
    if (!listing || listing.status !== "PUBLISHED") throw new Error("PLATFORM_RECIPE_LISTING_CONFLICT");
    checkListing(listing);
  }
  const audit = await db.auditLog.findFirst({ where: { action: "MARKET_LISTING_PUBLISHED", resourceType: "market_listing", resourceId: listing.id, actorId: ownerId, metadata: { path: ["version"], equals: 1 } }, select: { id: true, actorId: true, resourceId: true, metadata: true } });
  if (!audit || audit.actorId !== ownerId || audit.resourceId !== listing.id || !audit.metadata || typeof audit.metadata !== "object" || Array.isArray(audit.metadata) || audit.metadata.version !== 1) throw new Error("PLATFORM_RECIPE_LISTING_AUDIT_MISSING");
  if (!await readPlatformRecipe(db, source.workflow.id, ownerId)) throw new Error("PLATFORM_RECIPE_SOURCE_UNAVAILABLE");
  return { workflowId: source.workflow.id, workflowSlug: source.workflow.slug, workflowVersionId: source.version.id, definitionHash: source.recipe.definitionHash, sourceCodeHash: source.recipe.sourceCodeHash, listingId: listing.id, listingSlug: listing.slug, listingVersion: listing.publishedVersion, status: listing.status };
}

export function parsePlatformRecipeArgs(args: string[]) {
  if (args.length !== 2 || args[0] !== "--owner-id" || !args[1]?.trim() || args[1] !== args[1].trim()) throw new Error("Usage: register-platform-resume-recipe.ts --owner-id <existing-admin-id>");
  return { ownerId: args[1] };
}

/** Safe observable error class/code; ORM messages and meta may contain private data. */
export function platformRecipeDeploymentError(error: unknown): string {
  if (error instanceof Error && /^PLATFORM_RECIPE_[A-Z_]+$/u.test(error.message)) return error.message;
  if (error instanceof Error && error.message === "Usage: register-platform-resume-recipe.ts --owner-id <existing-admin-id>") return error.message;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  return typeof code === "string" && /^P[0-9]{4}$/u.test(code)
    ? `PLATFORM_RECIPE_DEPLOYMENT_FAILED ${code}`
    : "PLATFORM_RECIPE_DEPLOYMENT_FAILED";
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/register-platform-resume-recipe.ts")) {
  void (async () => {
    try {
      const { ownerId } = parsePlatformRecipeArgs(process.argv.slice(2));
      console.log(JSON.stringify(await publishPlatformResumeRecipe(ownerId, process.cwd())));
    } catch (error) {
      // Do not print ORM/provider diagnostics or any environment/credential value.
      console.error(platformRecipeDeploymentError(error));
      process.exitCode = 1;
    } finally {
      const { db } = await import("../src/lib/db");
      await db.$disconnect();
    }
  })();
}
