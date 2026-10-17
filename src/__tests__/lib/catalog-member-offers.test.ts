// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const database = vi.hoisted(() => ({ $queryRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: database }));
import { listCatalogMemberOffers } from "@/server/catalog/member-offers";

const listing = { slug: "public-tool", title: "Public project", summary: "A public project fixture", description: "Documented resource for catalog read checks.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Repository"], licenseTerms: "Repository license", githubUrl: "https://github.com/example/project" };
const row = (source: "market" | "wall" = "market") => ({ source, id: source + "-id", slug: source + "-project", official: false, status: "PUBLISHED", version: 1, payload: listing, sellerId: "seller", username: "creator", nickname: null, avatar: null });
beforeEach(() => { vi.resetAllMocks(); database.$queryRaw.mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());

describe("catalog member snapshot", () => {
  it("reads only exact published pointers without loading drafts, votes or transaction locks", async () => {
    vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", " configured-id ");
    await listCatalogMemberOffers();
    const [strings, ...values] = database.$queryRaw.mock.calls[0];
    const sql = strings.join("");
    expect(values).toEqual(["configured-id"]);
    expect(sql.match(/v.version = l.\"publishedVersion\"/g)).toHaveLength(2);
    expect(sql.match(/l.status = 'PUBLISHED' AND NOT u.flagged AND u.\"deletedAt\" IS NULL/g)).toHaveLength(2);
    expect(sql).toContain('v."reviewedAt" IS NOT NULL');
    expect(sql).toContain("agri_workspaces");
    expect(sql).toContain("ORDER BY CASE source WHEN 'market' THEN 0 ELSE 1 END");
    expect(sql).toContain('CASE WHEN source = \'wall\' THEN "sortAt" END ASC, "sortId" ASC');
    expect(sql).not.toMatch(/FOR UPDATE|FOR SHARE|agri_popularity_votes|market_listing_stars|INSERT|UPDATE|DELETE/);
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it("separates wall offers and never includes moderation notes or private seller data", async () => {
    database.$queryRaw.mockResolvedValue([row(), row("wall")]);
    const result = await listCatalogMemberOffers();
    expect(result.market).toHaveLength(1);
    expect(result.wall).toHaveLength(1);
    expect(result.wall[0]).toMatchObject({ id: "wall-id", version: 1, seller: { id: "seller", username: "creator" }, reviewNote: null });
    expect(result.market[0]).not.toHaveProperty("payload");
    expect(result.market[0]).not.toHaveProperty("starred");
  });
  it("does not retain completed results when an offer is withdrawn", async () => {
    database.$queryRaw.mockResolvedValueOnce([row()]).mockResolvedValueOnce([]);
    expect((await listCatalogMemberOffers()).market).toHaveLength(1);
    expect((await listCatalogMemberOffers()).market).toHaveLength(0);
    expect(database.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it("fails closed on malformed snapshots and propagates database failure", async () => {
    database.$queryRaw.mockResolvedValueOnce([{ ...row(), payload: { draft: true } }]);
    await expect(listCatalogMemberOffers()).rejects.toThrow();
    const error = new Error("database unavailable");
    database.$queryRaw.mockRejectedValueOnce(error);
    await expect(listCatalogMemberOffers()).rejects.toBe(error);
  });
});
