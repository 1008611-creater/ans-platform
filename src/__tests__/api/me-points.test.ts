import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/me/points/route";
import { readMemberPoints } from "@/server/quota/service";
import { auth } from "@/lib/auth";

vi.mock("@/server/quota/service", () => ({ readMemberPoints: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("GET /api/me/points", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses anonymous visitors", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(readMemberPoints).not.toHaveBeenCalled();
  });

  it("returns only the signed-in member's balance, never cached", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "member-a" } } as never);
    vi.mocked(readMemberPoints).mockResolvedValue(1020.5);
    const response = await GET();
    expect(readMemberPoints).toHaveBeenCalledWith("member-a");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ points: 1020.5 });
  });
});
