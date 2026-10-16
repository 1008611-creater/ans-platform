// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ wall: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/wall", () => ({ readAgriWall: m.wall }));
import { readAgriWallShare } from "@/server/competitions/agrihackathon/share";
beforeEach(() => vi.resetAllMocks());
describe("public event share destination", () => {
  it("reads only current public entries and reuses the wall's authoritative counts", async () => {
    const entry = { id: "wall", eligible: true, offer: { slug: "field-project" }, validStars: 7 };
    m.wall.mockResolvedValue({ entries: [entry], round: { state: "OPEN" } });
    expect(await readAgriWallShare("field-project")).toEqual({ entry, round: { state: "OPEN" } });
    expect(m.wall).toHaveBeenCalledWith();
  });
  it("never resurrects a withdrawn or ineligible project from another catalog", async () => {
    m.wall.mockResolvedValueOnce({ entries: [], round: null })
      .mockResolvedValueOnce({ entries: [{ eligible: false, offer: { slug: "field-project" } }], round: null });
    expect(await readAgriWallShare("field-project")).toBeNull();
    expect(await readAgriWallShare("field-project")).toBeNull();
  });
  it("rejects malformed share identifiers before reading", async () => {
    expect(await readAgriWallShare("../../private")).toBeNull();
    expect(m.wall).not.toHaveBeenCalled();
  });
  it("propagates a failed public read instead of returning stale content", async () => {
    m.wall.mockRejectedValue(new Error("database unavailable"));
    await expect(readAgriWallShare("field-project")).rejects.toThrow("database unavailable");
  });
});
