// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rows: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { apiComputeRequest: { findMany: mocks.rows } } }));
import { readPersonalApiHistory } from "@/server/quota/api-history";

const createdAt = new Date("2026-10-16T01:00:00.000Z");
const base = { id: "ans-request-1", modelId: "gpt-6.1-sol", state: "UNCERTAIN", authorizedPoints: "0.500001", settledPoints: null, createdAt, startedAt: createdAt, finishedAt: null };
beforeEach(() => { vi.resetAllMocks(); mocks.rows.mockResolvedValue([]); });

describe("personal text API history", () => {
  it("limits database reads to the authenticated owner and text gateway, in stable recent order", async () => {
    await readPersonalApiHistory("owner");
    expect(mocks.rows).toHaveBeenCalledWith({
      where: { userId: "owner", provider: "apic-codex", user: { deletedAt: null } },
      select: { id: true, modelId: true, state: true, authorizedPoints: true, settledPoints: true, createdAt: true, startedAt: true, finishedAt: true, price: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20,
    });
  });
  it.each(["", "x".repeat(129), null, {}, 5])("rejects invalid account identifiers before querying", async userId => {
    await expect(readPersonalApiHistory(userId as string)).rejects.toThrow("ACCOUNT_UNAVAILABLE");
    expect(mocks.rows).not.toHaveBeenCalled();
  });
  it("serializes only safe public projection fields, including nullable settlement", async () => {
    mocks.rows.mockResolvedValue([{ ...base, userId: "private-owner", outcome: "supplier-private-receipt", price: { key: "secret", parent: { id: "private-parent" } }, requestHash: "private-hash", idempotencyKey: "private-idempotency" }]);
    const result = await readPersonalApiHistory("owner");
    expect(result).toEqual([{ id: "ans-request-1", modelId: "gpt-6.1-sol", state: "UNCERTAIN", authorizedPoints: 0.500001, settledPoints: null, createdAt: createdAt.toISOString(), startedAt: createdAt.toISOString(), finishedAt: null }]);
    const serialized = JSON.stringify(result);
    for (const secret of ["private-owner", "supplier-private-receipt", "secret", "private-parent", "private-hash", "private-idempotency"]) expect(serialized).not.toContain(secret);
  });
  it.each(["AUTHORIZED", "RUNNING", "UNCERTAIN"])("does not expose a provisional settlement as a final cost for %s", async state => {
    mocks.rows.mockResolvedValue([{ ...base, state, settledPoints: "0" }]);
    expect((await readPersonalApiHistory("owner"))[0].settledPoints).toBeNull();
  });
  it("preserves final zero, positive settlement and unresolved terminal null without inventing charges", async () => {
    mocks.rows.mockResolvedValue([
      { ...base, state: "RELEASED", settledPoints: "0", startedAt: null, finishedAt: createdAt },
      { ...base, id: "ans-request-2", state: "SETTLED", settledPoints: "0.123456", finishedAt: createdAt },
      { ...base, id: "ans-request-3", state: "SETTLED", settledPoints: null },
    ]);
    expect((await readPersonalApiHistory("owner")).map(row => row.settledPoints)).toEqual([0, 0.123456, null]);
  });
});

it("projects a pending gift as gift funding with no paid point hold",async()=>{
 mocks.rows.mockResolvedValue([{...base,price:{benefitFunding:{version:"official-usd-gift-v1",grantId:"11111111-1111-4111-8111-111111111111",reservedUsdMicros:"1000000"}}}]);
 expect((await readPersonalApiHistory("owner"))[0]).toMatchObject({funding:"gift",authorizedPoints:0,settledPoints:null});
});
