// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), transaction: vi.fn(), generate: vi.fn(), list: vi.fn(), create: vi.fn(), patch: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: m.find, update: m.update }, $transaction: m.transaction } }));
vi.mock("@/lib/api-key", () => ({ generateApiKey: m.generate, hashApiKey: vi.fn() }));
vi.mock("@/server/credentials/service", () => ({ listCredentials: m.list, createCredential: m.create, updateCredential: m.patch, deleteCredential: m.remove }));
import * as profile from "@/app/api/user/profile/route";
import * as key from "@/app/api/user/api-key/route";
import * as credentials from "@/app/api/user/model-credentials/route";
import * as credential from "@/app/api/user/model-credentials/[id]/route";

const context = { params: Promise.resolve({ id: "credential-a" }) };
const handlers = [
  ["profile GET", (r: NextRequest) => profile.GET(r)],
  ["profile PATCH", (r: NextRequest) => profile.PATCH(r)],
  ["key GET", (r: NextRequest) => key.GET(r)],
  ["key POST", (r: NextRequest) => key.POST(r)],
  ["key PATCH", (r: NextRequest) => key.PATCH(r)],
  ["key DELETE", (r: NextRequest) => key.DELETE(r)],
  ["credentials GET", (r: NextRequest) => credentials.GET(r)],
  ["credentials POST", (r: NextRequest) => credentials.POST(r)],
  ["credential PATCH", (r: NextRequest) => credential.PATCH(r, context)],
  ["credential DELETE", (r: NextRequest) => credential.DELETE(r, context)],
] as const;

beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ user: { id: "member-b" } }); });

describe("settings actor binding before reading or writing private data", () => {
  for (const actor of [undefined, "member-a"]) {
    it.each(handlers)(`rejects ${actor ?? "missing"} actor on %s`, async (_name, handler) => {
      const response = await handler(new NextRequest("http://localhost:3000/api/test", { headers: actor ? { "x-ans-actor": actor } : {} }));
      expect(response.status).toBe(409);
      expect(JSON.stringify(await response.json())).toContain("ACCOUNT_CHANGED");
      for (const service of [m.find, m.update, m.transaction, m.generate, m.list, m.create, m.patch, m.remove]) expect(service).not.toHaveBeenCalled();
    });
  }
  it("allows the matching actor through all BYOK handlers", async () => {
    m.list.mockResolvedValue([]); m.create.mockResolvedValue({ id: "created" }); m.patch.mockResolvedValue({ id: "updated" }); m.remove.mockResolvedValue({ success: true });
    const request = () => new NextRequest("http://localhost:3000/api/test", { method: "POST", headers: { "x-ans-actor": "member-b" }, body: "{}" });
    expect((await credentials.GET(request())).status).toBe(200);
    expect((await credentials.POST(request())).status).toBe(201);
    expect((await credential.PATCH(request(), context)).status).toBe(200);
    expect((await credential.DELETE(request(), context)).status).toBe(200);
    expect(m.list).toHaveBeenCalledWith("member-b");
    expect(m.create).toHaveBeenCalledWith("member-b", {});
    expect(m.patch).toHaveBeenCalledWith("member-b", "credential-a", {});
    expect(m.remove).toHaveBeenCalledWith("member-b", "credential-a");
  });
});
