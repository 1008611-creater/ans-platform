// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), run: vi.fn(), history: vi.fn(), upload: vi.fn(), recipe: vi.fn(), recipeHistory: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/marketplace/workflows", () => ({ runMarketWorkflow: mocks.run, listMarketWorkflowRuns: mocks.history, uploadWorkflowToMarket: mocks.upload, runReviewedRecipe: mocks.recipe, listReviewedRecipeRuns: mocks.recipeHistory }));
import { POST, GET } from "@/app/api/market/listings/[id]/run/route";
import { POST as upload } from "@/app/api/workflows/[slug]/market/route";
import { POST as recipePOST, GET as recipeGET } from "@/app/api/workflows/[slug]/recipe-run/route";
const raw = { expectedVersion: 3, acknowledged: true, input: { topic: "Own input" }, idempotencyKey: "request-001" };
const context = { params: Promise.resolve({ id: "listing-one" }) };
function request(actor = "buyer", origin = "https://ans.example.test") {
  return new Request("https://ans.example.test/api/market/listings/listing-one/run", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actor, origin }, body: JSON.stringify(raw) });
}
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "buyer" } }); mocks.run.mockResolvedValue({ run: { id: "run-one" } }); mocks.history.mockResolvedValue({ runs: [] }); mocks.upload.mockResolvedValue({ id: "draft-one" }); mocks.recipe.mockResolvedValue({ run: { id: "direct-recipe" } }); mocks.recipeHistory.mockResolvedValue({ runs: [] }); vi.stubEnv("AUTH_URL", "https://ans.example.test"); vi.stubEnv("NEXTAUTH_URL", ""); vi.stubEnv("NEXT_PUBLIC_APP_URL", ""); });
afterEach(() => vi.unstubAllEnvs());
describe("market workflow HTTP actor boundary", () => {
  it("binds explicit run to authenticated actor and passes only the request body to the service", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(202);
    expect(mocks.run).toHaveBeenCalledWith("listing-one", "buyer", raw);
  });
  it("requires authentication before dispatching any run", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(request(), context);
    expect(response.status).toBe(401); expect(mocks.run).not.toHaveBeenCalled();
  });
  it.each(["old-account", ""])("rejects a stale or absent expected actor header: %s", async actor => {
    const response = await POST(request(actor), context);
    expect(response.status).toBe(409); expect((await response.json()).error.code).toBe("ACCOUNT_CHANGED"); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("rejects cross-origin write even with a matching actor header", async () => {
    const response = await POST(request("buyer", "https://foreign.example.test"), context);
    expect(response.status).toBe(403); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("GET recovery is actor-scoped and never dispatches execution", async () => {
    const response = await GET(new Request("https://ans.example.test/api/market/listings/listing-one/run", { headers: { "x-ans-actor": "buyer" } }), context);
    expect(response.status).toBe(200); expect(mocks.history).toHaveBeenCalledWith("listing-one", "buyer"); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("GET recovery rejects an old actor instead of exposing a new account's history", async () => {
    const response = await GET(new Request("https://ans.example.test/api/market/listings/listing-one/run", { headers: { "x-ans-actor": "old-account" } }), context);
    expect(response.status).toBe(409); expect(mocks.history).not.toHaveBeenCalled();
  });
  it("workflow upload shares the same actor and same-origin gate", async () => {
    const stale = await upload(request("old-account"), { params: Promise.resolve({ slug: "personal-workflow" }) });
    expect(stale.status).toBe(409); expect(mocks.upload).not.toHaveBeenCalled();
    const crossOrigin = await upload(request("buyer", "https://foreign.example.test"), { params: Promise.resolve({ slug: "personal-workflow" }) });
    expect(crossOrigin.status).toBe(403); expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe("direct recipe HTTP boundary", () => {
  const recipeContext = { params: Promise.resolve({ slug: "personal-workflow" }) };
  it("dispatches the direct recipe only with matching authenticated actor and same origin", async () => {
    const response = await recipePOST(request(), recipeContext);
    expect(response.status).toBe(202); expect(mocks.recipe).toHaveBeenCalledWith("personal-workflow", "buyer", raw);
  });
  it("rejects stale actors and cross-origin direct execution", async () => {
    expect((await recipePOST(request("old-account"), recipeContext)).status).toBe(409);
    expect((await recipePOST(request("buyer", "https://foreign.example.test"), recipeContext)).status).toBe(403);
    expect(mocks.recipe).not.toHaveBeenCalled();
  });
  it("reads only authenticated recipe history without triggering execution", async () => {
    const response = await recipeGET(new Request("https://ans.example.test/api/workflows/personal-workflow/recipe-run", { headers: { "x-ans-actor": "buyer" } }), recipeContext);
    expect(response.status).toBe(200); expect(mocks.recipeHistory).toHaveBeenCalledWith("personal-workflow", "buyer"); expect(mocks.recipe).not.toHaveBeenCalled();
  });
});
