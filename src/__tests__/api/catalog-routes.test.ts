// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/catalog/service", async original => {
  const actual = await original<typeof import("@/server/catalog/service")>();
  return { ...actual, listCatalogAdmin: vi.fn(), saveCatalogDraft: vi.fn(), changeCatalogPublication: vi.fn() };
});
import { auth } from "@/lib/auth";
import { CatalogError, listCatalogAdmin, saveCatalogDraft, changeCatalogPublication } from "@/server/catalog/service";
import { catalogSaveSchema } from "@/contracts/catalog-content";
import { GET, POST } from "@/app/api/admin/catalog/route";
import { POST as publication } from "@/app/api/admin/catalog/[slug]/route";
const origin = "https://ans.example";
const context = { params: Promise.resolve({ slug: "real-project" }) };
const request = (body: unknown, requestOrigin = origin) => new Request(origin + "/api/admin/catalog", { method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(key, "");
  vi.mocked(auth).mockResolvedValue({ user: { id: "authenticated-editor" } } as never);
  vi.mocked(listCatalogAdmin).mockResolvedValue([]);
  vi.mocked(saveCatalogDraft).mockResolvedValue({ revision: 1 } as never);
  vi.mocked(changeCatalogPublication).mockResolvedValue({ revision: 1 } as never);
});
describe("official catalog HTTP boundary", () => {
  it("rejects anonymous private reads and all mutations before storage", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await GET()).status).toBe(401);
    expect((await POST(request({}))).status).toBe(401);
    expect((await publication(request({}), context)).status).toBe(401);
    expect(listCatalogAdmin).not.toHaveBeenCalled(); expect(saveCatalogDraft).not.toHaveBeenCalled(); expect(changeCatalogPublication).not.toHaveBeenCalled();
  });
  it("rejects cross-site writes and malformed JSON", async () => {
    expect((await POST(request({}, "https://outsider.example"))).status).toBe(403);
    expect((await publication(request({}, "https://outsider.example"), context)).status).toBe(403);
    const malformed = new Request(origin + "/api/admin/catalog", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "{" });
    expect((await POST(malformed)).status).toBe(400);
    expect(saveCatalogDraft).not.toHaveBeenCalled(); expect(changeCatalogPublication).not.toHaveBeenCalled();
  });
  it("uses session identity and route slug, and prevents caching private data", async () => {
    const body = { action: "publish", expectedRevision: 1 };
    const response = await publication(request(body), context);
    expect(changeCatalogPublication).toHaveBeenCalledWith("authenticated-editor", "real-project", body);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await GET()).headers.get("cache-control")).toBe("no-store");
  });
  it("returns stable forbidden/conflict statuses without private diagnostics", async () => {
    vi.mocked(listCatalogAdmin).mockRejectedValueOnce(new CatalogError("FORBIDDEN", 403)); expect((await GET()).status).toBe(403);
    vi.mocked(saveCatalogDraft).mockRejectedValueOnce(new CatalogError("REVISION_CONFLICT")); expect((await POST(request({}))).status).toBe(409);
    vi.mocked(saveCatalogDraft).mockRejectedValueOnce(new Error("PRIVATE_DATABASE_ROW secret"));
    const response = await POST(request({})); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_DATABASE_ROW");
  });
  it("maps schema validation to a safe 400 without echoing private input", async () => {
    const parsed = catalogSaveSchema.safeParse({ entry: "PRIVATE_INPUT" }); expect(parsed.success).toBe(false);
    if (!parsed.success) vi.mocked(saveCatalogDraft).mockRejectedValueOnce(parsed.error);
    const response = await POST(request({ entry: "PRIVATE_INPUT" })); expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_INPUT", message: "INVALID_INPUT" } });
  });
});