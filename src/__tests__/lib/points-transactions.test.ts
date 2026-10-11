// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ run: vi.fn(), actor: vi.fn(), lock: vi.fn(), order: vi.fn(), event: vi.fn(), updateOrder: vi.fn(), createEvent: vi.fn(), audit: vi.fn(), debit: vi.fn(), refund: vi.fn(), escrow: vi.fn(), escrowCreate: vi.fn(), escrowUpdate: vi.fn(), userUpdate: vi.fn(), ledger: vi.fn(), operation: vi.fn(), receipt: vi.fn(), operationCreate: vi.fn(), userChange: vi.fn(), balance: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/marketplace/shared", () => ({ marketTransaction: m.run, requireMarketActor: m.actor, requireMarketModerator: m.actor, marketHash: (value: unknown) => JSON.stringify(value) }));
vi.mock("@/server/quota/service", async importOriginal => ({ ...await importOriginal<typeof import("@/server/quota/service")>(), debitQuota: m.debit, refundQuota: m.refund }));
import { payMarketOrderPoints, settleMarketPoints, refundMarketPoints, pointsPricingPolicy } from "@/server/marketplace/points";
import { applyQuotaOperation } from "@/server/quota/operations";
const quote = { slug: "test-service", title: "Test service", summary: "A long enough summary", description: "A sufficiently detailed description", category: "career", subcategory: "resume", fulfillment: "service", priceMinor: 1000, currency: "CNY", deliveryDays: 1, revisionLimit: 1, computeIncluded: false, deliverables: ["file"], licenseTerms: "Personal use permitted", listingId: "listing", listingVersion: 1, sellerId: "seller", commissionBps: 1000, platformFeeMinor: 100, sellerDueMinor: 900 };
const tx = { $queryRaw: m.lock, user: { findUnique: m.actor, update: m.userUpdate, updateMany: m.userChange, findUniqueOrThrow: m.balance }, marketOrder: { findFirst: m.order, findUnique: m.order, update: m.updateOrder }, marketOrderEvent: { findUnique: m.event, create: m.createEvent }, marketPointsEscrow: { findUnique: m.escrow, create: m.escrowCreate, updateMany: m.escrowUpdate }, quotaLedger: { create: m.ledger }, quotaOperation: { findUnique: m.operation, findFirst: m.receipt, create: m.operationCreate }, auditLog: { create: m.audit } };
beforeEach(() => {
 vi.resetAllMocks(); vi.unstubAllEnvs(); m.run.mockImplementation(fn => fn(tx));
 m.actor.mockResolvedValue({ role: "ADMIN", flagged: false, deletedAt: null, adminPermissions: ["USERS_MANAGE"] });
 m.order.mockResolvedValue({ id: "order", buyerId: "buyer", sellerId: "seller", paymentMethod: "POINTS", status: "AWAITING_PAYMENT", revision: 0, requirements: "", quote });
 m.event.mockResolvedValue(null); m.escrow.mockResolvedValue({ orderId: "order", amount: 10, sellerPoints: 9, feePoints: 1, state: "HELD" }); m.escrowUpdate.mockResolvedValue({ count: 1 });
 m.userUpdate.mockResolvedValue({ quotaPoints: 9 }); m.balance.mockResolvedValue({ quotaPoints: 1000 }); m.userChange.mockResolvedValue({ count: 1 }); m.operation.mockResolvedValue(null); m.receipt.mockResolvedValue(null); m.operationCreate.mockResolvedValue({ id: "operation" });
});
it("requires an explicit commission configuration", () => { expect(() => pointsPricingPolicy()).toThrow(); vi.stubEnv("ANS_MARKET_COMMISSION_BPS", "0"); expect(pointsPricingPolicy()).toEqual({ commissionBps: 0 }); });
it.each(["-1", "1.5", "10001", "nan"])("rejects invalid fee %s", value => { vi.stubEnv("ANS_MARKET_COMMISSION_BPS", value); expect(() => pointsPricingPolicy()).toThrow(); });
it("escrows only the buyer's real points and freezes the seller split", async () => {
 await payMarketOrderPoints("order", "buyer", { expectedRevision: 0, operationKey: "purchase-key" });
 expect(m.debit).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: "buyer", costPoints: 10 }));
 expect(m.escrowCreate).toHaveBeenCalledWith({ data: { orderId: "order", amount: 10, sellerPoints: 9, feePoints: 1, state: "HELD" } });
 expect(m.updateOrder).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "AWAITING_REQUIREMENTS" }) }));
});
it("acknowledges the same payment operation without charging again", async () => {
 m.event.mockResolvedValue({ requestHash: JSON.stringify({ expectedRevision: 0, operationKey: "purchase-key" }) });
 expect(await payMarketOrderPoints("order", "buyer", { expectedRevision: 0, operationKey: "purchase-key" })).toMatchObject({ duplicate: true }); expect(m.debit).not.toHaveBeenCalled();
});
it("rejects an idempotency conflict", async () => {
 m.event.mockResolvedValue({ requestHash: "different" }); await expect(payMarketOrderPoints("order", "buyer", { expectedRevision: 0, operationKey: "purchase-key" })).rejects.toThrow("IDEMPOTENCY_CONFLICT"); expect(m.debit).not.toHaveBeenCalled();
});
it.each(["COMPLETED", "IN_PROGRESS", "CANCELLED"])("cannot charge an order in %s", async status => {
 m.order.mockResolvedValue({ status, revision: 0 }); await expect(payMarketOrderPoints("order", "buyer", { expectedRevision: 0, operationKey: "purchase-key" })).rejects.toThrow(); expect(m.debit).not.toHaveBeenCalled();
});
it("refuses payment for a foreign or cash order", async () => {
 m.order.mockResolvedValue(null); await expect(payMarketOrderPoints("order", "buyer", { expectedRevision: 0, operationKey: "purchase-key" })).rejects.toThrow("NOT_FOUND"); expect(m.debit).not.toHaveBeenCalled();
 expect(m.order).toHaveBeenCalledWith({ where: { id: "order", buyerId: "buyer", paymentMethod: "POINTS" } });
});
it("credits seller income only after the escrow CAS succeeds", async () => {
 await settleMarketPoints(tx as never, "order", "seller"); expect(m.userUpdate).toHaveBeenCalledWith({ where: { id: "seller" }, data: { quotaPoints: { increment: 9 } }, select: { quotaPoints: true } }); expect(m.ledger).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "seller", amount: 9, refType: "market_income" }) });
});
it("does not double-credit a settled escrow", async () => { m.escrow.mockResolvedValue({ state: "SETTLED" }); await expect(settleMarketPoints(tx as never, "order", "seller")).rejects.toThrow(); expect(m.userUpdate).not.toHaveBeenCalled(); });
it("does not credit when settlement CAS loses a race", async () => { m.escrowUpdate.mockResolvedValue({ count: 0 }); await expect(settleMarketPoints(tx as never, "order", "seller")).rejects.toThrow(); expect(m.userUpdate).not.toHaveBeenCalled(); });
it("refunds a held disputed order once", async () => {
 m.order.mockResolvedValue({ id: "order", buyerId: "buyer", sellerId: "seller", paymentMethod: "POINTS", status: "DISPUTED", revision: 2 });
 await refundMarketPoints("order", "admin", "Approved dispute"); expect(m.refund).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: "buyer", costPoints: 10 })); expect(m.debit).not.toHaveBeenCalled();
});
it("does not refund twice", async () => { m.escrow.mockResolvedValue({ state: "REFUNDED" }); expect(await refundMarketPoints("order", "admin", "Approved dispute")).toMatchObject({ duplicate: true }); expect(m.refund).not.toHaveBeenCalled(); });
it("preserves a dispute when seller income cannot be reversed", async () => {
 m.order.mockResolvedValue({ id: "order", buyerId: "buyer", sellerId: "seller", paymentMethod: "POINTS", status: "DISPUTED", revision: 2 }); m.escrow.mockResolvedValue({ amount: 10, sellerPoints: 9, state: "SETTLED" }); m.userChange.mockResolvedValue({ count: 0 });
 await expect(refundMarketPoints("order", "admin", "Approved dispute")).rejects.toThrow(); expect(m.escrowUpdate).not.toHaveBeenCalled(); expect(m.refund).not.toHaveBeenCalled();
});
it("requires a verified receipt for manual recharge", async () => { vi.stubEnv("ANS_MANUAL_RECHARGE_ENABLED", "1"); await expect(applyQuotaOperation("admin", { userId: "buyer", kind: "TOP_UP", amount: 1, operationKey: "grant-key", note: "Verified funds" })).rejects.toThrow("RECEIPT_REQUIRED"); expect(m.run).not.toHaveBeenCalled(); });
it("does not enable manual recharge implicitly", async () => { await expect(applyQuotaOperation("admin", { userId: "buyer", kind: "TOP_UP", amount: 1, operationKey: "grant-key", evidenceRef: "receipt-1", note: "Verified funds" })).rejects.toThrow("RECHARGE_DISABLED"); });
it("records a grant and its audit atomically", async () => { expect(await applyQuotaOperation("admin", { userId: "buyer", kind: "GRANT", amount: 1000, operationKey: "grant-key", note: "New member grant" })).toMatchObject({ balance: 1000 }); expect(m.ledger).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 1000, reason: "GRANT" }) }); expect(m.audit).toHaveBeenCalled(); });
it("blocks previously used receipts, including use by another user", async () => { vi.stubEnv("ANS_MANUAL_RECHARGE_ENABLED", "1"); m.receipt.mockResolvedValue({ id: "existing" }); await expect(applyQuotaOperation("admin", { userId: "buyer", kind: "TOP_UP", amount: 1, operationKey: "grant-key", evidenceRef: "receipt-1", note: "Verified funds" })).rejects.toThrow("RECEIPT_ALREADY_USED"); expect(m.userChange).not.toHaveBeenCalled(); });
it("checks admin authority inside the money transaction", async () => { m.actor.mockResolvedValue({ role: "USER" }); await expect(applyQuotaOperation("admin", { userId: "buyer", kind: "GRANT", amount: 1, operationKey: "grant-key", note: "New member grant" })).rejects.toThrow("FORBIDDEN"); expect(m.userChange).not.toHaveBeenCalled(); });

it("can reverse settled seller income even when spending is disabled", async () => {
 m.order.mockResolvedValue({ id: "order", buyerId: "buyer", sellerId: "seller", paymentMethod: "POINTS", status: "DISPUTED", revision: 4 });
 m.escrow.mockResolvedValue({ orderId: "order", amount: 10, sellerPoints: 9, state: "SETTLED" });
 await refundMarketPoints("order", "admin", "Approved dispute");
 expect(m.userChange).toHaveBeenCalledWith({ where: { id: "seller", quotaPoints: { gte: 9 } }, data: { quotaPoints: { decrement: 9 } } });
 expect(m.refund).toHaveBeenCalled();
});
