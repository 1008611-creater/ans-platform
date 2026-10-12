/** Actual isolated PostgreSQL media acceptance. Reads existing image bytes; never edits pixels. */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { MarketListingInput } from "../src/contracts/marketplace";

function requireIsolatedDatabase(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new Error("ISOLATED_DATABASE_REQUIRED");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/^\/ans_test(?:[_-][a-z0-9_-]+)?$/.test(url.pathname)) throw new Error("ISOLATED_DATABASE_REQUIRED");
}
const prefix = "media-verify-" + Date.now().toString(36) + randomBytes(3).toString("hex");
const checks: string[] = [];
const evidence: { source: string; sha256: string; storedBytes: number; mimeType: string }[] = [];
const checksum = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const privateConfigPath = fileURLToPath(new URL("../../../../outputs/ans-market-20261012/isolated-private.json", import.meta.url));
async function main() {
  // Read credentials only in process memory; never print configuration or a database URL.
  const privateConfig: { url?: unknown } = JSON.parse(await readFile(privateConfigPath, "utf8"));
  requireIsolatedDatabase(privateConfig.url);
  process.env.DATABASE_URL = privateConfig.url;
  process.env.DIRECT_URL = privateConfig.url;
  process.env.NEXT_PUBLIC_APP_URL = "https://ans.cauai.fun";
  process.env.ANS_UNIFIED_POINTS_ENABLED = "1";
  const { db } = await import("../src/lib/db");
  const media = await import("../src/server/marketplace/media");
  const listings = await import("../src/server/marketplace/listings");
  const { MarketRuleError } = await import("../src/domain/marketplace/order");
  const rejectsNotFound = (run: Promise<unknown>) => assert.rejects(run, error => error instanceof MarketRuleError && error.code === "NOT_FOUND" && error.status === 404);
  const rejectsCoverPermission = (run: Promise<unknown>) => assert.rejects(run, error => error instanceof MarketRuleError && error.code === "MEDIA_PERMISSION_REQUIRED" && error.status === 403);
  try {
    const [seller, other, moderator] = await Promise.all(["seller", "other", "moderator"].map(role => db.user.create({ data: { username: prefix + "-" + role, email: prefix + "-" + role + "@example.invalid", role: role === "moderator" ? "ADMIN" : "USER", adminPermissions: role === "moderator" ? ["MARKETPLACE_MANAGE"] : [] }, select: { id: true } })));
    for (const source of ["public/vibe-hub/oil-favicon.png", "public/book-cover-photo.jpg"]) {
      const original = await readFile(resolve(source));
      const saved = await media.saveMarketMedia(seller.id, new File([original], source.split("/").pop()!, { type: source.endsWith(".png") ? "image/png" : "image/jpeg" }));
      const id = new URL(saved.url).pathname.split("/").pop()!;
      const read = await media.readMarketMedia(id, seller.id);
      assert.equal(checksum(read.content), checksum(original));
      assert.equal(read.sha256, checksum(original)); assert.equal(read.size, original.length); assert.deepEqual(Buffer.from(read.content), original);
      assert.equal(read.mimeType, source.endsWith(".png") ? "image/png" : "image/jpeg");
      evidence.push({ source, sha256: read.sha256, storedBytes: read.size, mimeType: read.mimeType });
      checks.push("original " + read.mimeType + " bytes saved and read with identical SHA256");
      await rejectsNotFound(media.readMarketMedia(id)); await rejectsNotFound(media.readMarketMedia(id, other.id));
      checks.push(read.mimeType + " private upload denied to anonymous and another seller");
      const offer: MarketListingInput = { slug: prefix + "-" + (source.endsWith(".png") ? "png" : "jpeg"), title: "[Isolated] Original media visibility", summary: "Actual isolated media visibility verification, never a production product.", description: "This real test database listing verifies byte preservation and public/private image visibility without editing any image.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Isolated media verification only"], licenseTerms: "No sale or production use; isolated technical evidence only.", sourceUrl: "https://example.invalid/media-verification", coverUrl: saved.url, pricingTiers: [] };
      await rejectsCoverPermission(listings.createMarketListing(other.id, { ...offer, slug: offer.slug + "-other" }));
      assert.equal(await db.marketListing.count({ where: { slug: offer.slug + "-other" } }), 0);
      checks.push(read.mimeType + " cross-seller reference rejected before listing creation");
      const listing = await listings.createMarketListing(seller.id, offer);
      await rejectsNotFound(media.readMarketMedia(id));
      await listings.submitMarketListing(listing.id, seller.id, 1);
      await rejectsNotFound(media.readMarketMedia(id));
      await listings.reviewMarketListing(listing.id, moderator.id, 1, true, "Isolated original bytes media approval");
      const publicRead = await media.readMarketMedia(id);
      assert.equal(checksum(publicRead.content), checksum(original)); assert.equal((await media.readMarketMedia(id, other.id)).sha256, read.sha256);
      checks.push(read.mimeType + " remains private as draft/pending and becomes public only after actual approval");
      await listings.withdrawMarketListing(listing.id, seller.id);
      await rejectsNotFound(media.readMarketMedia(id)); await rejectsNotFound(media.readMarketMedia(id, other.id));
      assert.equal((await media.readMarketMedia(id, seller.id)).sha256, read.sha256);
      checks.push(read.mimeType + " withdrawal removes public access while owner retains exact bytes");
    }
    const svg = await readFile(resolve("public/ans-logo-light.svg"));
    const before = await db.marketMedia.count({ where: { ownerId: seller.id } });
    await assert.rejects(media.saveMarketMedia(seller.id, new File([svg], "existing.svg", { type: "image/png" })), error => error instanceof MarketRuleError && error.code === "INVALID_MEDIA");
    assert.equal(await db.marketMedia.count({ where: { ownerId: seller.id } }), before);
    checks.push("unsupported original SVG rejected despite forged PNG MIME without inserting bytes");
    const outputDirectory = fileURLToPath(new URL("../../../../outputs/ans-market-20261012", import.meta.url));
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "media-integration.json"), JSON.stringify({ isolated: true, databaseGuard: "loopback PostgreSQL ans_test database", checks, passed: checks.length, files: evidence, productionWrites: 0, providerCalls: 0, pixelsEdited: false, httpUploadVerified: false }, null, 2));
    console.log(JSON.stringify({ isolated: true, passed: checks.length, productionWrites: 0, pixelsEdited: false, httpUploadVerified: false }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("ISOLATED_MEDIA_VERIFY_FAILED"); process.exitCode = 1; });
