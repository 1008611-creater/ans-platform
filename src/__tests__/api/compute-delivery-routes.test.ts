// @vitest-environment node
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/compute/delivery-service", async importOriginal => {
  const original = await importOriginal<typeof import("@/server/compute/delivery-service")>();
  return { ...original, executeComputeDeliveryCommand: vi.fn(), readComputeDelivery: vi.fn() };
});
vi.mock("@/lib/db", () => ({ db: {} }));
import { auth } from "@/lib/auth";
import { POST } from "@/app/api/integrations/toonflow/delivery/route";
import { GET } from "@/app/api/workspace/compute/[id]/delivery/route";
import { ComputeDeliveryError, executeComputeDeliveryCommand, readComputeDelivery } from "@/server/compute/delivery-service";
const secret = "delivery-signature-fixture-only-123456789";
const path = "/api/integrations/toonflow/delivery";
const command = { version: 1, action: "pending", userId: "owner-a", computeTaskId: "compute-task-a", deliveryId: "a".repeat(64), eventId: "delivery-event-a", expectedDeliveryRevision: 0 };
function signed(body = JSON.stringify(command), options: { signingPath?: string; url?: string; timestamp?: string; method?: string } = {}) {
  const timestamp = options.timestamp ?? String(Date.now()), method = options.method ?? "POST";
  const signature = createHmac("sha256", secret).update(`${method}\n${options.signingPath ?? path}\n${timestamp}\n${createHash("sha256").update(body).digest("hex")}`).digest("hex");
  return new Request(options.url ?? "https://ans.example" + path, { method, headers: { "content-type": "application/json", "x-ans-compute-timestamp": timestamp, "x-ans-compute-signature": signature }, body });
}
const context = { params: Promise.resolve({ id: "compute-task-a" }) }; let actor = ""; let counter = 0;
const read = (query = "", header = actor) => new Request("https://ans.example/api/workspace/compute/compute-task-a/delivery" + query, { headers: { "x-ans-compute-actor": header } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", secret);
  actor = "delivery-reader-" + counter++;
  vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
  vi.mocked(executeComputeDeliveryCommand).mockResolvedValue({ delivery: {} } as never);
  vi.mocked(readComputeDelivery).mockResolvedValue({ computeTaskId: "compute-task-a", delivery: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("signed delivery write endpoint", () => {
  it("accepts a correct service signature with no-store and ignores browser identity", async () => {
    const request = signed(); request.headers.set("cookie", "session=outsider");
    const response = await POST(request); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(executeComputeDeliveryCommand).toHaveBeenCalledWith(command); expect(auth).not.toHaveBeenCalled();
  });
  it("rejects signatures from the old compute endpoint and any path/query replay", async () => {
    for (const request of [signed(undefined, { signingPath: "/api/integrations/toonflow/compute" }), signed(undefined, { url: "https://ans.example/api/integrations/toonflow/compute" }), signed(undefined, { url: "https://ans.example" + path + "?userId=victim" })]) {
      expect((await POST(request)).status).toBe(401);
    }
    expect(executeComputeDeliveryCommand).not.toHaveBeenCalled();
  });
  it("rejects cookie-only authorization, altered bodies and old/future timestamps", async () => {
    expect((await POST(new Request("https://ans.example" + path, { method: "POST", body: JSON.stringify(command), headers: { cookie: "session=owner", "content-type": "application/json" } }))).status).toBe(401);
    const original = signed();
    expect((await POST(new Request(original.url, { method: "POST", headers: original.headers, body: JSON.stringify({ ...command, userId: "victim" }) }))).status).toBe(401);
    for (const timestamp of ["invalid", String(Date.now() - 120000), String(Date.now() + 120000)]) expect((await POST(signed(undefined, { timestamp }))).status).toBe(401);
    const invalid = signed(); invalid.headers.set("x-ans-compute-signature", "F".repeat(64)); expect((await POST(invalid)).status).toBe(401);
    expect(executeComputeDeliveryCommand).not.toHaveBeenCalled();
  });
  it("bounds the body, schema and configuration before accessing the service", async () => {
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", "short"); expect((await POST(signed())).status).toBe(503); vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", secret);
    expect((await POST(signed("invalid"))).status).toBe(400);
    expect((await POST(signed(" ".repeat(16385)))).status).toBe(413);
    const length = signed(); length.headers.set("content-length", "16385"); expect((await POST(length)).status).toBe(413);
    const type = signed(); type.headers.set("content-type", "text/plain"); expect((await POST(type)).status).toBe(415);
    expect((await POST(signed(JSON.stringify({ ...command, url: "https://private.test" })))).status).toBe(400);
    expect(executeComputeDeliveryCommand).not.toHaveBeenCalled();
  });
  it("redacts raw errors and returns stable delivery conflicts", async () => {
    vi.mocked(executeComputeDeliveryCommand).mockRejectedValueOnce(new Error("PRIVATE_SUPPLIER_DIAGNOSTIC"));
    const error = await POST(signed()); expect(error.status).toBe(500); expect(await error.text()).not.toContain("PRIVATE_SUPPLIER_DIAGNOSTIC");
    vi.mocked(executeComputeDeliveryCommand).mockRejectedValueOnce(new ComputeDeliveryError("COMPUTE_DELIVERY_REVISION_CONFLICT"));
    expect((await POST(signed())).status).toBe(409);
  });
});
describe("owner delivery read endpoint", () => {
  it("requires a session and matching actor header before private reads", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); expect((await GET(read(), context)).status).toBe(401);
    vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never);
    for (const request of [read("", "other-account"), new Request(read().url)]) expect((await GET(request, context)).status).toBe(409);
    expect(readComputeDelivery).not.toHaveBeenCalled();
  });
  it("uses only session-derived owner and refuses query authority overrides", async () => {
    const response = await GET(read(), context); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(readComputeDelivery).toHaveBeenCalledWith(actor, "compute-task-a");
    vi.mocked(readComputeDelivery).mockClear(); expect((await GET(read("?ownerId=victim"), context)).status).toBe(400);
    expect(readComputeDelivery).not.toHaveBeenCalled();
  });
  it("keeps existence private and raw database diagnostics redacted", async () => {
    vi.mocked(readComputeDelivery).mockRejectedValueOnce(new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404));
    const missing = await GET(read(), context); expect(missing.status).toBe(404); expect(missing.headers.get("cache-control")).toBe("no-store");
    vi.mocked(readComputeDelivery).mockRejectedValueOnce(new Error("PRIVATE_DATABASE_URL"));
    const error = await GET(read(), context); expect(error.status).toBe(500); expect(await error.text()).not.toContain("PRIVATE_DATABASE_URL");
  });
  it("limits reads per account", async () => {
    for (let i = 0; i < 120; i++) expect((await GET(read(), context)).status).toBe(200);
    expect((await GET(read(), context)).status).toBe(429); expect(readComputeDelivery).toHaveBeenCalledTimes(120);
  });
});
