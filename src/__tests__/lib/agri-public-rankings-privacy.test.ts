// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), latest: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: (fn: (tx: unknown) => unknown) => fn({ $queryRaw: m.query }) } }));
vi.mock("@/server/competitions/agrihackathon/rankings", () => ({ latestAgriRankingEvent: m.latest }));
import { readAgriPublicRankings } from "@/server/competitions/agrihackathon/publications";
const now = new Date("2030-01-01T00:00:00Z");
const content = { title: "Public title", summary: "Public summary", teamName: "Team", track: "ACTION", repositoryUrl: null, demoUrl: null };
let publication: boolean, approved: boolean, artifactVersionId: string;
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  publication = true; approved = true; artifactVersionId = "version";
  m.latest.mockImplementation(async (_tx: unknown, _edition: string, stage: string) => stage === "PRELIMINARY" ? {
    id: "ranking", action: "CONFIRM", createdAt: now,
    snapshot: { items: [{ entryStageId: "stage", submissionId: "submission", artifactVersionId: "version", rank: 2, professionalScore: 80, publicScore: 0, totalScore: 64, validStars: 0, awards: ["FINALIST"], prizeMinor: 0, listingId: "old-wall", listingVersion: 1 }],
      popularityAwards: [{ entryStageId: "stage", submissionId: "newer-submission", artifactVersionId: "newer-version", listingId: "old-wall", listingVersion: 2, validStars: 9 }] }
  } : null);
  m.query.mockImplementation(async (parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes("FROM agri_workspaces")) return [{ competitionId: "edition", enabled: true, publishedRuleVersionId: "rules" }];
    if (sql.includes("FROM agri_publications h")) return approved ? [{ id: "publication", competitionId: "edition", stage: "PRELIMINARY", submissionId: "submission", artifactVersionId, consentEventId: "consent", reviewEventId: "review", acceptedAt: now, publishedAt: now, basis: "FROZEN", correctionPreviousSubmissionId: null, content }] : [];
    if (sql.includes("FROM agri_publications WHERE")) return publication ? [{ id: "publication" }] : [];
    throw new Error("Unexpected public ranking query: " + sql);
  });
});
describe("public result privacy", () => {
  it("does not expose a private candidate through an existing marketplace wall", async () => {
    publication = false;
    expect((await readAgriPublicRankings()).boards[0].items).toEqual([]);
    expect(m.query.mock.calls.some(([parts]) => parts.join("?").includes("market_listings"))).toBe(false);
  });
  it("requires the exact independently approved submission and artifact version", async () => {
    expect((await readAgriPublicRankings()).boards[0].items[0]).toMatchObject({ rank: 2, publicationId: "publication", listingId: null, content });
    artifactVersionId = "newer-version";
    expect((await readAgriPublicRankings()).boards[0].items).toEqual([]);
    artifactVersionId = "version"; approved = false;
    expect((await readAgriPublicRankings()).boards[0].items).toEqual([]);
  });
  it("does not attach old frozen votes to a newer current wall artifact", async () => {
    expect((await readAgriPublicRankings()).boards[0].popularityAwards).toEqual([]);
  });
});
