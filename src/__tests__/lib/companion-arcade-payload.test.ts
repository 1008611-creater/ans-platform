// @vitest-environment node
import { expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { ARCADE_TOKEN_COST_POINTS, arcadeClaimSchema } from "@/server/compute-benefits/arcade";
import { buildArcadeActionId, buildArcadeDrawPayload, buildArcadeTokenOrder } from "@/server/companion/pi-agent";
import { isExplicitChargeConfirmation } from "@/server/companion/tools";

it("builds claw payloads that satisfy the arcade strict schema", () => {
  const draw = arcadeClaimSchema.safeParse(buildArcadeDrawPayload(buildArcadeActionId("piclaw")));
  expect(draw.success).toBe(true);
  const order = arcadeClaimSchema.safeParse(buildArcadeTokenOrder(buildArcadeActionId("pitoken")));
  expect(order.success).toBe(true);
  expect(buildArcadeTokenOrder("piabc123").count).toBe(1);
  expect(ARCADE_TOKEN_COST_POINTS).toBe(10);
});

it("rejects the legacy payload shape that silently broke the claw action", () => {
  // 旧写法：draw 少了 prizeId/drawId/mode 且多传 machine；buy_tokens 少了 orderId。
  expect(arcadeClaimSchema.safeParse({ kind: "draw", machine: "claw" }).success).toBe(false);
  expect(arcadeClaimSchema.safeParse({ kind: "buy_tokens", count: 1 }).success).toBe(false);
});

it("generates ids that fit the arcade id rule and stay unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => buildArcadeActionId("pi")));
  expect(ids.size).toBe(50);
  for (const id of ids) expect(arcadeClaimSchema.safeParse(buildArcadeDrawPayload(id)).success).toBe(true);
});

it("only treats a short explicit reply as charge confirmation", () => {
  for (const yes of ["确认", "确认兑换", "确定", "OK", "ok，确认", "好的", "同意", "确认，扣吧"]) expect(isExplicitChargeConfirmation(yes)).toBe(true);
  for (const no of ["", "   ", "帮我确认一下这个项目的进展，顺便看看兑换的事", "what's on the market?", "先别扣分"]) expect(isExplicitChargeConfirmation(no)).toBe(false);
});
