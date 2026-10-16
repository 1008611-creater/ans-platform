// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), add: vi.fn(), remove: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mock.auth }));
vi.mock("@/server/favorites/service", () => ({ addFavorite: mock.add, removeFavorite: mock.remove, listFavorites: mock.list, isFavoriteTargetType: (s: string) => ["PROJECT", "WORKFLOW", "VIBEHUB_TERM"].includes(s) }));
import { GET, POST, DELETE } from "@/app/api/favorites/route";
beforeEach(() => { vi.resetAllMocks(); mock.auth.mockResolvedValue({ user: { id: "current" } }); mock.add.mockResolvedValue({ favorited: true, created: true }); mock.remove.mockResolvedValue({ favorited: false, removed: true }); mock.list.mockResolvedValue([]); });
describe("favorites actor binding", () => {
  it.each([undefined, "previous"])("rejects missing or previous actor for all operations (%s)", async actor => {
    const headers: Record<string, string> = actor ? { "x-vibehub-account-id": actor } : {};
    const read = await GET(new Request("https://ans.example/api/favorites", { headers }));
    const write = await POST(new Request("https://ans.example/api/favorites", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "PROJECT", targetId: "real" }) }));
    const remove = await DELETE(new Request("https://ans.example/api/favorites?targetType=PROJECT&targetId=real", { method: "DELETE", headers }));
    expect([read.status, write.status, remove.status]).toEqual([409, 409, 409]);
    expect(mock.add).not.toHaveBeenCalled(); expect(mock.remove).not.toHaveBeenCalled(); expect(mock.list).not.toHaveBeenCalled();
  });
  it("uses the authenticated ID after actor validation", async () => {
    const result = await POST(new Request("https://ans.example/api/favorites", { method: "POST", headers: { "x-vibehub-account-id": "current", "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "PROJECT", targetId: "real" }) }));
    expect(result.status).toBe(201); expect(mock.add).toHaveBeenCalledWith("current", "PROJECT", "real");
  });
  it("requires authentication even with a claimed actor", async () => {
    mock.auth.mockResolvedValue(null); const result = await GET(new Request("https://ans.example/api/favorites", { headers: { "x-vibehub-account-id": "current" } }));
    expect(result.status).toBe(401); expect(mock.list).not.toHaveBeenCalled();
  });
});
