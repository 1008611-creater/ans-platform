// @vitest-environment node
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/compute/service", () => ({ executeComputeCommand: vi.fn() }));
vi.mock("@/server/quota/service", () => ({ QuotaError: class extends Error { code = "INSUFFICIENT_QUOTA"; status = 402; } }));
import { POST } from "@/app/api/integrations/toonflow/compute/route";
import { executeComputeCommand } from "@/server/compute/service";
const secret = "fixture-only-compute-secret-123456789";
const path = "/api/integrations/toonflow/compute";
function signed(body: string, options: { timestamp?: string; url?: string; mutate?: (request: Request) => void } = {}) {
  const timestamp = options.timestamp ?? String(Date.now());
  const hash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret).update(`POST\n${path}\n${timestamp}\n${hash}`).digest("hex");
  const request = new Request(options.url ?? `https://ans.example${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-ans-compute-timestamp": timestamp, "x-ans-compute-signature": signature }, body });
  options.mutate?.(request); return request;
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", secret); });
afterEach(() => vi.unstubAllEnvs());
describe("trusted Toonflow compute route", () => {
  it("passes a correctly signed stable subject and rejects altered identities or body", async () => {
    vi.mocked(executeComputeCommand).mockResolvedValue({ unit: "point", balance: 0, spendingEnabled: false });
    const command = { action: "balance", userId: "ans-user" };
    expect((await POST(signed(JSON.stringify(command)))).status).toBe(200); expect(executeComputeCommand).toHaveBeenCalledWith(command);
    vi.mocked(executeComputeCommand).mockClear();
    const tampered = signed(JSON.stringify(command));
    const changed = new Request(tampered.url, { method: "POST", headers: tampered.headers, body: JSON.stringify({ ...command, userId: "victim" }) });
    expect((await POST(changed)).status).toBe(401); expect(executeComputeCommand).not.toHaveBeenCalled();
  });
  it("rejects browser-only auth, old/future timestamps, malformed signatures and path replay", async () => {
    expect((await POST(new Request(`https://ans.example${path}`, { method: "POST", headers: { "Content-Type": "application/json", cookie: "session=user" }, body: "{}" }))).status).toBe(401);
    for (const timestamp of [String(Date.now() - 120_000), String(Date.now() + 120_000), "nonsense"]) expect((await POST(signed("{}", { timestamp }))).status).toBe(401);
    expect((await POST(signed("{}", { url: `https://ans.example${path}?userId=victim` }))).status).toBe(401);
    expect((await POST(signed("{}", { mutate: r => r.headers.set("x-ans-compute-signature", "0".repeat(64)) }))).status).toBe(401);
    expect(executeComputeCommand).not.toHaveBeenCalled();
  });
  it("refuses missing/weak secret, malformed JSON, unknown fields and excessive body without calling service", async () => {
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", "short"); expect((await POST(signed("{}"))).status).toBe(503);
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_SECRET", secret);
    expect((await POST(signed("invalid"))).status).toBe(400);
    expect((await POST(signed(JSON.stringify({ action: "balance", userId: "user", ratePoints: 0 })))).status).toBe(400);
    expect((await POST(signed(" ".repeat(32_769)))).status).toBe(413);
    expect(executeComputeCommand).not.toHaveBeenCalled();
  });
  it("redacts raw errors and validation inputs", async () => {
    const marker = "private-provider-diagnostic";
    vi.mocked(executeComputeCommand).mockRejectedValue(new Error(marker));
    const response = await POST(signed(JSON.stringify({ action: "balance", userId: "user" })));
    expect(response.status).toBe(500); expect(await response.text()).not.toContain(marker);
    const invalid = await POST(signed(JSON.stringify({ action: marker, userId: marker })));
    expect(await invalid.text()).not.toContain(marker);
  });
});
