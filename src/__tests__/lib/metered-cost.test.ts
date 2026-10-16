// @vitest-environment node
import { expect, it, vi } from "vitest";
import { readMeteredRunCost, refreshMeteredParentCost } from "@/server/integrations/metered-cost";
import type { DbTransaction } from "@/lib/db";
it("preserves costs of completed nodes and uncertain attempts, excludes released holds, scopes to owner and parent", async () => {
  const findMany = vi.fn().mockResolvedValue([
    { state: "SETTLED", settledPoints: 0.00192, authorizedPoints: 0.05 },
    { state: "UNCERTAIN", settledPoints: null, authorizedPoints: 0.1 },
    { state: "RUNNING", settledPoints: null, authorizedPoints: 0.2 },
    { state: "RELEASED", settledPoints: 0, authorizedPoints: 0.3 },
  ]);
  const result = await readMeteredRunCost({ apiComputeRequest: { findMany } } as unknown as DbTransaction, "member", { type: "workflow_run", id: "run1" });
  expect(result).toEqual({ settledPoints: 0.00192, pendingPoints: 0.3, requestCount: 4 });
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "member", provider: "apic-codex", AND: [
    { price: { path: ["parent", "type"], equals: "workflow_run" } }, { price: { path: ["parent", "id"], equals: "run1" } },
  ] } }));
});

it("refreshes only finished parents after late settlement and never makes active runs refundable", async () => {
  const findMany = vi.fn().mockResolvedValue([{ state: "SETTLED", settledPoints: 0.02, authorizedPoints: 0.1 }]);
  const updateMany = vi.fn(); const tx = { apiComputeRequest: { findMany }, workflowRun: { updateMany } } as unknown as DbTransaction;
  await refreshMeteredParentCost(tx, "member", { parent: { type: "workflow_run", id: "run1" } });
  expect(updateMany).toHaveBeenCalledWith({ where: { id: "run1", userId: "member", status: { in: ["SUCCEEDED", "FAILED", "CANCELLED"] } }, data: { costPoints: 0.02 } });
});

it("keeps gift holds out of the paid workflow cost total",async()=>{
 const price={benefitFunding:{version:"official-usd-gift-v1",grantId:"11111111-1111-4111-8111-111111111111",reservedUsdMicros:"1000000"}};
 const findMany=vi.fn().mockResolvedValue([{state:"RUNNING",authorizedPoints:10,settledPoints:null,price},{state:"SETTLED",authorizedPoints:10,settledPoints:0,price}]);
 expect(await readMeteredRunCost({apiComputeRequest:{findMany}} as unknown as DbTransaction,"member",{type:"run",id:"run1"})).toEqual({settledPoints:0,pendingPoints:0,requestCount:2});
});
