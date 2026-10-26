import { describe, expect, it, vi } from "vitest";
import { readModelPlazaCatalog } from "@/server/integrations/model-plaza";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";

const entry = { model_name: "deepseek-v4.1-flash", quota_type: 0, model_ratio: 0.15, completion_ratio: 4, cache_ratio: 0.02,
  supported_endpoint_types: ["openai"], enable_groups: ["private-group"], secret: "never serialize" };
const body = (data: unknown[] = [entry]) => ({ success: true, pricing_version: "snapshot-1", data, group_ratio: { "private-group": 0.01 } });
const now = new Date("2026-10-16T12:00:00Z");
const fetcher = (json: unknown) => vi.fn<typeof fetch>().mockResolvedValue(Response.json(json));

describe("public model plaza", () => {
  it("projects only safe metadata and labels publication separately from inference", async () => {
    const get = fetcher(body()); const catalog = await readModelPlazaCatalog({ fetcher: get, environment: {}, now });
    expect(catalog.state).toBe("current"); expect(catalog.observedAt).toBe(now.toISOString());
    expect(catalog.models).toHaveLength(4);
    expect(catalog.models[0]).toMatchObject({ status: "listed", usdPerMillion: { input: .3, output: 1.2, cacheRead: .006, source: "apic" } });
    expect(catalog.models[1].status).toBe("not-listed"); expect(catalog.models[3].status).toBe("prepared");
    expect(JSON.stringify(catalog)).not.toMatch(/private-group|never serialize|secret|enable_groups|group_ratio/);
    expect(get).toHaveBeenCalledWith("https://apic.cauai.fun/api/pricing", expect.objectContaining({ redirect: "error", credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } }));
  });
  it("shows actual official standard references, never reserve upper bounds", async () => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body()), environment: {}, now });
    expect(catalog.models[1].usdPerMillion).toMatchObject({ input: 10, output: 50, cacheRead: 1, source: "official" });
    expect(catalog.models[2].usdPerMillion).toMatchObject({ input: 2, output: 10, cacheRead: .1 });
    expect(catalog.models[3].usdPerMillion).toMatchObject({ input: 4, output: 20, cacheRead: .2, cacheWrite5m: 5, cacheWrite1h: 8 });
  });
  it("never guesses an FX rate or integral price", async () => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body()), environment: {}, now });
    expect(catalog.billing).toEqual({ pointsPerCny: 10, usdCny: null, fxSource: null, fxAsOf: null });
    expect(catalog.models.every(model => model.pointsPerMillion === null)).toBe(true);
  });
  it.each([
    { success: false, data: [entry] }, { success: true, data: [entry, entry] },
    body([{ ...entry, model_ratio: -1 }]), body([{ ...entry, completion_ratio: Infinity }]),
    body([{ ...entry, model_name: "x".repeat(130) }]), body([{ ...entry, model_ratio: 1000000, completion_ratio: 1000000 }]),
  ])("fails closed on malformed or ambiguous external data %#", async value => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(value), environment: {}, now });
    expect(catalog.state).toBe("unavailable"); expect(catalog.observedAt).toBeNull();
    expect(catalog.models.every(model => model.status !== "listed")).toBe(true);
  });
  it("cannot enable Claude or advertise unsupported live endpoint URLs from a public response", async () => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body([
      { ...entry, supported_endpoint_types: ["openai", "https://evil.invalid/private"] },
      { ...entry, model_name: "claude-opus-5-5" },
      { ...entry, model_name: "unknown-model" },
    ])), environment: {}, now });
    expect(catalog.models[0].endpoints).toEqual(["Chat Completions"]);
    expect(catalog.models[3].status).toBe("prepared"); expect(catalog.models).toHaveLength(4);
    expect(JSON.stringify(catalog)).not.toMatch(/evil|unknown-model/);
  });
  it("retains reference labels but no stale availability after HTTP failure", async () => {
    const get = vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 }));
    const catalog = await readModelPlazaCatalog({ fetcher: get, environment: {}, now });
    expect(catalog.state).toBe("unavailable"); expect(catalog.pricingVersion).toBeNull();
    expect(catalog.models.every(model => model.usdPerMillion?.source === "official")).toBe(true);
  });
  it("limits both advertised and streaming body sizes", async () => {
    for (const response of [new Response("{}", { headers: { "content-length": "2000000" } }), new Response("x".repeat(1024 * 1024 + 1))]) {
      const catalog = await readModelPlazaCatalog({ fetcher: vi.fn<typeof fetch>().mockResolvedValue(response), environment: {}, now });
      expect(catalog.state).toBe("unavailable");
    }
  });
  it("converts verified standard dollars with FX and independent retail multiplier exactly once", async () => {
    // Synthetic fixed FX is intentionally test-only, never a production quote.
    const config = fixtureModelBillingPolicy(7);
    const sources = {
      "deepseek-v4.1-flash": "https://api-docs.deepseek.com/quick_start/pricing/",
      "gpt-6-astra": "https://developers.openai.com/api/docs/models/gpt-6-astra",
      "gpt-6.1-sol": "https://developers.openai.com/api/docs/models/gpt-6.1-sol",
      "claude-opus-5-5": "https://platform.claude.com/docs/en/about-claude/pricing",
    };
    for (const id of Object.keys(config.models) as Array<keyof typeof config.models>) config.models[id].priceEvidence = { ...config.models[id].priceEvidence, source: sources[id] };
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body()), environment: { ANS_MODEL_BILLING_POLICY: JSON.stringify(config) }, now });
    expect(catalog.billing.usdCny).toBe(7);
    expect(catalog.models[0].pointsPerMillion).toMatchObject({ input: 21, output: 84, cacheRead: .42 });
    expect(catalog.models[1].pointsPerMillion).toMatchObject({ input: 112, output: 560 });
    expect(catalog.models[2].pointsPerMillion).toMatchObject({ input: 22.4, output: 112 });
    expect(catalog.models[3].pointsPerMillion).toMatchObject({ input: 280, output: 1400, cacheWrite5m: 350 });
  });
  it("shows the policy multiplier, not a hardcoded one, and none for an unpriced model", async () => {
    const config = fixtureModelBillingPolicy(7);
    config.models["deepseek-v4.1-flash"].consumptionMultiplier = 1.5;
    const priced = await readModelPlazaCatalog({ fetcher: fetcher(body()), environment: { ANS_MODEL_BILLING_POLICY: JSON.stringify(config) }, now });
    expect(priced.models.find(model => model.id === "deepseek-v4.1-flash")?.consumptionMultiplier).toBe(1.5);
    const unpriced = await readModelPlazaCatalog({ fetcher: fetcher(body()), environment: {}, now });
    expect(unpriced.models.every(model => model.consumptionMultiplier === null)).toBe(true);
  });
  it("withholds point quotes for a supplier tariff differing from its verified reference", async () => {
    const config = fixtureModelBillingPolicy(7);
    config.models["deepseek-v4.1-flash"].priceEvidence.source = "https://api-docs.deepseek.com/quick_start/pricing/";
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body([{ ...entry, model_ratio: .2 }])), environment: { ANS_MODEL_BILLING_POLICY: JSON.stringify(config) }, now });
    expect(catalog.models[0].usdPerMillion?.input).toBe(.4);
    expect(catalog.models[0].pointsPerMillion).toBeNull();
  });

  it.each(["tiered_expr", "plugin", "unknown-mode"])("does not turn stale ratios into an effective price for %s", async billing_mode => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body([{ ...entry, model_name: "gpt-6-astra", model_ratio: 2.5, completion_ratio: 4, billing_mode }])), environment: {}, now });
    expect(catalog.models[1]).toMatchObject({ status: "listed", usdPerMillion: { source: "official", input: 10, output: 50, cacheWrite: 12.5 } });
  });
  it("never evaluates untrusted price expressions or advertises their stale ratios", async () => {
    const catalog = await readModelPlazaCatalog({ fetcher: fetcher(body([{ ...entry, model_name: "gpt-6.1-sol", billing_expr: "untrusted-expression" }])), environment: {}, now });
    expect(catalog.models[2].usdPerMillion).toMatchObject({ source: "official", input: 2, output: 10, cacheWrite: 2.5 });
    expect(JSON.stringify(catalog)).not.toContain("untrusted-expression");
  });

});

