import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/invites/send/route";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { inviteEmailIdempotencyKey, inviteEmailText, normalizeInviteEmail } from "@/lib/invite-admin";

vi.mock("@/lib/admin-permissions", () => ({
  requireAdminPermission: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    inviteCode: { findUnique: vi.fn() },
    inviteEmailDelivery: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

const invite = {
  id: "inv1",
  code: "ABCD2345",
  maxUses: 5,
  usedCount: 1,
  expiresAt: new Date("2026-12-31T00:00:00.000Z"),
};

function post(body: unknown) {
  return new Request("http://localhost:3000/api/admin/invites/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asAdmin() {
  vi.mocked(requireAdminPermission).mockResolvedValue({ userId: "admin1", permissions: null } as never);
}

function okFetch() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "mail" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("POST /api/admin/invites/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T03:00:00.000Z"));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubEnv("AUTH_URL", "https://ans.cauai.fun");
    vi.mocked(db.inviteCode.findUnique).mockResolvedValue(invite as never);
    vi.mocked(db.inviteEmailDelivery.findFirst).mockResolvedValue(null);
    vi.mocked(db.inviteEmailDelivery.create).mockResolvedValue({ id: "d1", email: "student@cau.edu.cn", createdAt: new Date() } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("should return 403 without INVITES_MANAGE permission", async () => {
    vi.mocked(requireAdminPermission).mockResolvedValue(null);
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(403);
    expect(db.inviteCode.findUnique).not.toHaveBeenCalled();
  });

  it("should send the invite code by email", async () => {
    asAdmin();
    const fetchMock = okFetch();
    const response = await POST(post({ inviteId: "inv1", email: "Student@CAU.edu.cn " }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe("ABCD2345");
    expect(data.email).toBe("student@cau.edu.cn");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body)) as { to: string[]; subject: string; text: string };
    expect(body.to).toEqual(["student@cau.edu.cn"]);
    expect(body.text).toContain("ABCD2345");
    expect(body.text).toContain("https://ans.cauai.fun/register");
    expect(String((init.headers as Record<string, string>)["Idempotency-Key"])).toMatch(/^invite-[0-9a-f]{32}$/);
    expect(db.inviteEmailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codeId: "inv1", actorId: "admin1", email: "student@cau.edu.cn" }) })
    );
  });

  it("should reject an invalid email before touching the database", async () => {
    asAdmin();
    const fetchMock = okFetch();
    const response = await POST(post({ inviteId: "inv1", email: "not-an-email" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_email");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.inviteEmailDelivery.create).not.toHaveBeenCalled();
  });

  it("should require an invite id", async () => {
    asAdmin();
    const response = await POST(post({ email: "student@cau.edu.cn" }));
    expect(response.status).toBe(400);
  });

  it("should return 404 for an unknown invite", async () => {
    asAdmin();
    okFetch();
    vi.mocked(db.inviteCode.findUnique).mockResolvedValue(null);
    const response = await POST(post({ inviteId: "missing", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("invite_not_found");
  });

  it("should reject an expired invite", async () => {
    asAdmin();
    okFetch();
    vi.mocked(db.inviteCode.findUnique).mockResolvedValue({ ...invite, expiresAt: new Date("2026-09-01T00:00:00.000Z") } as never);
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invite_expired");
  });

  it("should reject an exhausted invite", async () => {
    asAdmin();
    okFetch();
    vi.mocked(db.inviteCode.findUnique).mockResolvedValue({ ...invite, usedCount: 5 } as never);
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invite_exhausted");
  });

  it("should throttle repeat sends to the same inbox for 60 seconds", async () => {
    asAdmin();
    const fetchMock = okFetch();
    vi.mocked(db.inviteEmailDelivery.findFirst).mockResolvedValue({ id: "d0" } as never);
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should return 503 when the mail provider fails", async () => {
    asAdmin();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 500 })));
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("email_unavailable");
    expect(db.inviteEmailDelivery.create).not.toHaveBeenCalled();
  });

  it("should return 503 when mail environment is missing", async () => {
    asAdmin();
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = okFetch();
    const response = await POST(post({ inviteId: "inv1", email: "student@cau.edu.cn" }));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("invite email helpers", () => {
  it("normalizes and validates inbox addresses", () => {
    expect(normalizeInviteEmail("  Student@CAU.edu.cn ")).toBe("student@cau.edu.cn");
    expect(() => normalizeInviteEmail("bad")).toThrowError();
    expect(() => normalizeInviteEmail("")).toThrowError();
  });

  it("builds a stable per-minute idempotency key", () => {
    const at = new Date("2026-09-13T03:00:00.000Z").getTime();
    const key = inviteEmailIdempotencyKey("inv1", "student@cau.edu.cn", at);
    expect(key).toBe(inviteEmailIdempotencyKey("inv1", "student@cau.edu.cn", at + 30000));
    expect(key).not.toBe(inviteEmailIdempotencyKey("inv1", "student@cau.edu.cn", at + 60000));
    expect(key).not.toBe(inviteEmailIdempotencyKey("inv2", "student@cau.edu.cn", at));
  });

  it("writes a plain-text body with the code and registration link", () => {
    const text = inviteEmailText({ code: "ABCD2345", maxUses: 5, usedCount: 1, expiresAt: new Date("2026-12-31T00:00:00.000Z") }, "https://ans.cauai.fun/");
    expect(text).toContain("ABCD2345");
    expect(text).toContain("https://ans.cauai.fun/register");
    expect(text).toContain("5");
  });
});
