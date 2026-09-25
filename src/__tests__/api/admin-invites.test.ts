import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/invites/route";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { generateInviteCode, maskEmail, CODE_ALPHABET, CODE_LENGTH } from "@/lib/invite-admin";

vi.mock("@/lib/admin-permissions", () => ({
  requireAdminPermission: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    inviteCode: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    inviteRedemption: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 403 without INVITES_MANAGE permission", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/invites"));
    expect(response.status).toBe(403);
  });

  it("should list invites with pagination", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    vi.mocked(db.inviteCode.findMany).mockResolvedValue([{ id: "i1", code: "ABC23456", usedCount: 2 }] as never);
    vi.mocked(db.inviteCode.count).mockResolvedValue(1);

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/invites"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.view).toBe("invites");
    expect(data.items).toHaveLength(1);
    expect(db.inviteCode.findMany).toHaveBeenCalled();
  });

  it("should list redemptions when view=redemptions", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    vi.mocked(db.inviteRedemption.findMany).mockResolvedValue([{ id: "r1", usedAt: new Date() }] as never);
    vi.mocked(db.inviteRedemption.count).mockResolvedValue(1);

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/invites?view=redemptions"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.view).toBe("redemptions");
    expect(data.items).toHaveLength(1);
  });
});

describe("POST /api/admin/invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 403 without permission", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue(null);
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(403);
  });

  it("should create invite with defaults", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    const created = { id: "i1", code: "ABCD2345", maxUses: 5, expiresAt: new Date(), createdAt: new Date() };
    vi.mocked(db.inviteCode.create).mockResolvedValue(created as never);

    const response = await POST(jsonRequest({}));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.code).toBe("ABCD2345");
    expect(db.inviteCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ creatorId: "admin1" }),
      })
    );
  });

  it("should reject maxUses out of range", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    const response = await POST(jsonRequest({ maxUses: 0 }));
    expect(response.status).toBe(400);
    expect(db.inviteCode.create).not.toHaveBeenCalled();
  });

  it("should reject expiresDays out of range", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    const response = await POST(jsonRequest({ expiresDays: 400 }));
    expect(response.status).toBe(400);
  });

  it("should retry on unique collision then succeed", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
    const uniqueError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(db.inviteCode.create)
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce({ id: "i2", code: "WXYZ2345", maxUses: 5, expiresAt: new Date(), createdAt: new Date() } as never);

    const response = await POST(jsonRequest({ maxUses: 3, expiresDays: 7 }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(db.inviteCode.create).toHaveBeenCalledTimes(2);
    expect(data.code).toBe("WXYZ2345");
  });
});

describe("invite-admin pure helpers", () => {
  it("generates 8-char codes from unambiguous alphabet", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
      // 不含易混淆字符
      expect(code).not.toMatch(/[IO01]/);
      seen.add(code);
    }
    expect(seen.size).toBe(200);
  });

  it("masks email for audit display", () => {
    expect(maskEmail("student@cau.edu.cn")).toBe("s******@cau.edu.cn");
    expect(maskEmail("a@b.cn")).toBe("a*@b.cn");
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail("no-at-sign")).toBe("no-at-sign");
  });
});