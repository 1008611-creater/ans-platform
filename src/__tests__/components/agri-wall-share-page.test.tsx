import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/share", () => ({ readAgriWallShare: m.share }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import { generateMetadata } from "@/app/competitions/agrihackathon/wall/[slug]/page";
const props = { params: Promise.resolve({ slug: "field-project" }) };
beforeEach(() => vi.resetAllMocks());
describe("event share metadata", () => {
  it("contains current public title, team, valid votes and cover without voter identities", async () => {
    m.share.mockResolvedValue({ entry: { teamName: "Field team", validStars: 23, offer: { listing: { title: "Field project", summary: "A public description", coverUrl: "https://example.org/cover.jpg" } } }, round: { state: "OPEN" } });
    const metadata = await generateMetadata(props);
    expect(metadata.title).toBe("Field project ? Field team");
    expect(metadata.description).toContain("23");
    expect(metadata.alternates?.canonical).toBe("/competitions/agrihackathon/wall/field-project");
    expect(metadata.openGraph).toMatchObject({ title: "Field project ? Field team", images: [{ url: "https://example.org/cover.jpg", alt: "Field project" }] });
    expect(JSON.stringify(metadata)).not.toMatch(/userId|voter|private/);
  });
  it("returns 404 for a no longer public object, including crawler requests", async () => {
    m.share.mockResolvedValue(null);
    await expect(generateMetadata(props)).rejects.toThrow("NOT_FOUND");
  });
});
