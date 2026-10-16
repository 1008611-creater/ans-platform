// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readApicCharge } from "@/server/integrations/apic-billing";
afterEach(() => {vi.unstubAllGlobals();vi.unstubAllEnvs();});
function setup(body: unknown, status=200) {
  vi.stubEnv("APIC_COST_BRIDGE_URL", "http://bridge.internal:13021");
  vi.stubEnv("APIC_COST_BRIDGE_SECRET", "test-secret");
  const fetchMock=vi.fn().mockResolvedValue(Response.json(body,{status}));vi.stubGlobal("fetch",fetchMock);return fetchMock;
}
describe("APIC final charge",()=>{
  it("uses final quota rather than recalculating token prices",async()=>{
    const fetchMock=setup({requestId:"request0001",quota:960});
    await expect(readApicCharge("request0001")).resolves.toEqual({requestId:"request0001",quota:960,points:0.00192,usdCredit:0.00192});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-secret");
  });
  it("rejects another request's fee",async()=>{setup({requestId:"request0002",quota:960});await expect(readApicCharge("request0001")).rejects.toThrow("APIC_BILLING_INVALID");});
  it.each([-1,1.5,NaN,500000001])("rejects invalid quota %s",async quota=>{setup({requestId:"request0001",quota});await expect(readApicCharge("request0001")).rejects.toThrow();});
  it("never treats a failed lookup as zero",async()=>{setup({},503);await expect(readApicCharge("request0001")).rejects.toThrow("APIC_BILLING_UNAVAILABLE");});
  it("rejects injected lookup IDs before I/O",async()=>{const fetchMock=setup({});await expect(readApicCharge("../other")).rejects.toThrow();expect(fetchMock).not.toHaveBeenCalled();});
});
