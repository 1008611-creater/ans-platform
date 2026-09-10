import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { legacyResetToken, resetToken } from "@/lib/password-reset";

type Row = { identifier: string; token: string; expires: Date };
type User = { id: string; password: string };
type Where = Record<string, unknown>;
type Args = { where: Where; data?: Record<string, unknown> };

const email = "person@example.com";
const secret = "test-secret";
const rows = new Map<string, Row>();
const users = new Map<string, User>([[email, { id: "u1", password: "old" }]]);
const state = { updateFailure: false };
const bcryptHash = vi.fn(async () => "hashed-password");

const rowMatches = (row: Row, where: Where) => {
  const token = where.token;
  const identifier = where.identifier;
  const expires = where.expires as { gt?: Date } | undefined;
  const tokens = token as { in?: string[] } | string | undefined;
  return (!tokens || (typeof tokens === "string" ? row.token === tokens : tokens.in?.includes(row.token))) &&
    (!identifier || row.identifier === identifier) && (!expires?.gt || row.expires > expires.gt);
};

const tx = {
  $executeRaw: vi.fn(async () => 0),
  verificationToken: {
    findUnique: vi.fn(async ({ where }: Args) => [...rows.values()].find(row => row.token === where.token) ?? null),
    findFirst: vi.fn(async ({ where }: Args) => [...rows.values()].find(row => rowMatches(row, where)) ?? null),
    create: vi.fn(async ({ data }: Args) => { const row = data as unknown as Row; rows.set(row.token, row); return row; }),
    update: vi.fn(async ({ where, data }: Args) => { const row = rows.get(String(where.token)); if (!row) throw new Error("missing row"); Object.assign(row, data); return row; }),
    deleteMany: vi.fn(async ({ where }: Args) => { let count = 0; for (const [key, row] of rows) if (rowMatches(row, where)) { rows.delete(key); count++; } return { count }; }),
  },
  user: {
    findUnique: vi.fn(async ({ where }: Args) => users.get(String(where.email)) ?? null),
    updateMany: vi.fn(async ({ where, data }: Args) => {
      const user = users.get(String(where.email));
      if (!user) throw new Error("missing user");
      user.password = String(data?.password);
      if (state.updateFailure) throw new Error("update failed after mutation");
      return { count: 1 };
    }),
  },
};

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
      const savedRows = structuredClone(rows);
      const savedUsers = structuredClone(users);
      try { return await work(tx); } catch (error) {
        rows.clear(); for (const [key, value] of savedRows) rows.set(key, value);
        users.clear(); for (const [key, value] of savedUsers) users.set(key, value);
        throw error;
      }
    },
  },
}));
vi.mock("bcryptjs", () => ({ default: { hash: bcryptHash }, hash: bcryptHash }));

const { POST: requestCode } = await import("@/app/api/auth/password-reset/request/route");
const { POST: confirmCode } = await import("@/app/api/auth/password-reset/confirm/route");

function post(body: unknown) {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

function deliveredCode() {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  const body = JSON.parse(String(call?.[1]?.body)) as { text: string };
  return body.text.match(/：(\d{4})/)?.[1] ?? "";
}

describe("password reset security", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    rows.clear(); users.clear(); users.set(email, { id: "u1", password: "old" }); state.updateFailure = false;
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "mail" }), { status: 200 })));
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("enforces 60-second cooldown, five sends per ten minutes and Retry-After", async () => {
    expect((await requestCode(post({ email }))).status).toBe(200);
    expect((await requestCode(post({ email }))).status).toBe(429);
    vi.advanceTimersByTime(60_000);
    for (let i = 0; i < 4; i++) { const response = await requestCode(post({ email })); expect(response.status).toBe(200); vi.advanceTimersByTime(60_000); }
    const response = await requestCode(post({ email }));
    expect(response.status).toBe(429); expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    vi.advanceTimersByTime(10 * 60_000); expect((await requestCode(post({ email }))).status).toBe(200);
  });

  it("counts four invalid confirmations, blocks the fifth and recovers after ten minutes", async () => {
    await requestCode(post({ email }));
    for (let i = 0; i < 4; i++) expect((await confirmCode(post({ email, token: "0000", password: "newpass" }))).status).toBe(400);
    expect((await confirmCode(post({ email, token: "0000", password: "newpass" }))).status).toBe(429);
    const code = deliveredCode(); expect((await confirmCode(post({ email, token: code, password: "newpass" }))).status).toBe(429);
    vi.advanceTimersByTime(10 * 60_000); expect((await confirmCode(post({ email, token: code, password: "newpass" }))).status).toBe(200);
  });

  it("rejects expired and replayed tokens, and accepts legacy and v2 tokens", async () => {
    await requestCode(post({ email })); const code = deliveredCode();
    const row = [...rows.values()].find(value => value.identifier === `password-reset:${email}`)!; row.expires = new Date(Date.now() - 1);
    expect((await confirmCode(post({ email, token: code, password: "newpass" }))).status).toBe(400);
    rows.clear(); rows.set("legacy", { identifier: `password-reset:${email}`, token: legacyResetToken("1234"), expires: new Date(Date.now() + 900_000) });
    expect((await confirmCode(post({ email, token: "1234", password: "newpass" }))).status).toBe(200);
    rows.set("v2", { identifier: `password-reset:${email}`, token: resetToken(email, "5678", secret), expires: new Date(Date.now() + 900_000) });
    expect((await confirmCode(post({ email, token: "5678", password: "again12" }))).status).toBe(200);
    expect((await confirmCode(post({ email, token: "5678", password: "again12" }))).status).toBe(400);
  });

  it("cleans delivery-failed token but preserves cooldown", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 500 })));
    expect((await requestCode(post({ email }))).status).toBe(503);
    expect([...rows.values()].some(row => row.identifier === `password-reset:${email}`)).toBe(false);
    expect([...rows.values()].some(row => row.identifier === `password-reset:cooldown:${email}`)).toBe(true);
  });

  it("selects a matching token among coexisting legacy and v2 rows and invalidates all codes", async () => {
    const legacy = legacyResetToken("1234");
    const current = resetToken(email, "5678", secret);
    rows.set(legacy, { identifier: `password-reset:${email}`, token: legacy, expires: new Date(Date.now() + 900_000) });
    rows.set(current, { identifier: `password-reset:${email}`, token: current, expires: new Date(Date.now() + 900_000) });
    expect((await confirmCode(post({ email, token: "5678", password: "newpass" }))).status).toBe(200);
    expect([...rows.values()].some(row => row.identifier === `password-reset:${email}`)).toBe(false);
    expect((await confirmCode(post({ email, token: "1234", password: "newpass" }))).status).toBe(400);
  });

  it("applies the same cooldown to unknown accounts without sending email", async () => {
    const unknown = "unknown@example.com";
    expect((await requestCode(post({ email: unknown }))).status).toBe(200);
    const limited = await requestCode(post({ email: unknown }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects passwords over 72 UTF-8 bytes without hashing", async () => {
    expect((await confirmCode(post({ email, token: "1234", password: "密".repeat(25) }))).status).toBe(400);
    expect(bcryptHash).not.toHaveBeenCalled();
  });

  it("checks configuration before touching the limiter", async () => {
    delete process.env.AUTH_SECRET; expect((await requestCode(post({ email }))).status).toBe(503); expect(rows.size).toBe(0);
  });

  it("preserves password validation and does not bcrypt invalid or limited requests", async () => {
    expect((await confirmCode(post({ email, token: "0000", password: "short" }))).status).toBe(400); expect(bcryptHash).not.toHaveBeenCalled();
    await requestCode(post({ email })); for (let i = 0; i < 5; i++) await confirmCode(post({ email, token: "0000", password: "valid12" }));
    expect(bcryptHash).toHaveBeenCalledTimes(0);
  });

  it("rolls back token consumption and password update on update failure", async () => {
    await requestCode(post({ email })); const code = deliveredCode(); state.updateFailure = true;
    expect((await confirmCode(post({ email, token: code, password: "newpass" }))).status).toBe(500);
    expect(users.get(email)?.password).toBe("old"); expect([...rows.values()].some(row => row.identifier === `password-reset:${email}`)).toBe(true);
  });
});
