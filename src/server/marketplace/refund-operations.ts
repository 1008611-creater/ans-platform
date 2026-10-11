import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { MarketRuleError } from "@/domain/marketplace/order";
import { marketQuoteSchema } from "@/contracts/marketplace";
import { requireMarketModerator } from "./shared";

const viewSchema = z.enum(["pending", "confirmed", "all"]);
const querySchema = z.object({
  view: viewSchema.default("pending"),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().regex(/^[A-Za-z0-9_-]+$/).max(1024).optional(),
}).strict();
const cursorSchema = z.object({
  actorId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  view: viewSchema,
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  createdAt: z.string().datetime(),
}).strict();

/** Read-only financial operations queue. No provider request or automatic refund is performed. */
export async function listMarketRefundOperations(moderatorId: string, raw: unknown = {}) {
  await requireMarketModerator(db, moderatorId);
  const query = querySchema.parse(raw);
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (query.cursor) {
    try {
      const bytes = Buffer.from(query.cursor, "base64url");
      if (bytes.toString("base64url") !== query.cursor) throw new Error();
      cursor = cursorSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      if (cursor.actorId !== moderatorId || cursor.view !== query.view) throw new Error();
    } catch { throw new MarketRuleError("INVALID_CURSOR", 400); }
  }
  const where: Prisma.MarketRefundWhereInput = {
    order: { paymentMethod: "CASH" },
    ...(query.view === "pending" ? { completedAt: null } : query.view === "confirmed" ? { completedAt: { not: null } } : {}),
    ...(cursor ? { OR: [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }] } : {}),
  };
  const rows = await db.marketRefund.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: query.limit + 1,
    // Never select requirements, buyer identity/contact, operator reason, raw notifications or credentials.
    select: {
      id: true, orderId: true, amountMinor: true, completedAt: true, createdAt: true,
      dispatchAttempts: true, lastDispatchedAt: true,
      order: { select: { status: true } },
      payment: { select: { provider: true, currency: true, allocation: true } },
    },
  });
  const page = rows.slice(0, query.limit); const last = page.at(-1);
  return {
    view: query.view,
    items: page.map(row => ({
      id: row.id, orderId: row.orderId, orderStatus: row.order.status,
      status: row.completedAt ? "CONFIRMED" as const : row.dispatchAttempts > 0 ? "AWAITING_CONFIRMATION" as const : "PENDING_DISPATCH" as const,
      provider: row.payment.provider, amountMinor: row.amountMinor, currency: row.payment.currency,
      reason: row.payment.allocation === "RETURN_REQUIRED" ? "UNALLOCATED_PAYMENT" as const : "APPROVED_DISPUTE" as const,
      completedAt: row.completedAt?.toISOString() ?? null,
      requestedAt: row.createdAt.toISOString(), dispatchAttempts: row.dispatchAttempts,
      lastDispatchedAt: row.lastDispatchedAt?.toISOString() ?? null,
      // A provider that this deployment cannot dispatch still has a real refund obligation.
      providerSupported: row.payment.provider === "wechat" || row.payment.provider === "alipay",
    })),
    nextCursor: rows.length > query.limit && last ? Buffer.from(JSON.stringify({ actorId: moderatorId, view: query.view, id: last.id, createdAt: last.createdAt.toISOString() })).toString("base64url") : null,
  };
}

const disputeQuery = z.object({ cursor: z.string().regex(/^[A-Za-z0-9_-]+$/).max(1024).optional() }).strict();
const disputeCursor = z.object({ actorId: z.string().min(1).max(100), id: z.string().min(1).max(100), updatedAt: z.string().datetime() }).strict();
/** Moderation-only queue of submitted disputes. Reading never approves or refunds. */
export async function listMarketDisputeOperations(actorId: string, raw: unknown = {}) {
  await requireMarketModerator(db, actorId); const query = disputeQuery.parse(raw); let cursor: z.infer<typeof disputeCursor> | null = null;
  if (query.cursor) { try { const bytes = Buffer.from(query.cursor, "base64url"); if (bytes.toString("base64url") !== query.cursor) throw new Error(); cursor = disputeCursor.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))); if (cursor.actorId !== actorId) throw new Error(); } catch { throw new MarketRuleError("INVALID_CURSOR", 400); } }
  const rows = await db.marketOrder.findMany({
    where: { status: "DISPUTED", ...(cursor ? { OR: [{ updatedAt: { lt: new Date(cursor.updatedAt) } }, { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } }] } : {}) },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 26,
    select: { id: true, quote: true, totalMinor: true, currency: true, paymentMethod: true, updatedAt: true, events: { where: { action: "dispute" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { message: true, createdAt: true } } },
  });
  const page = rows.slice(0, 25); const last = page.at(-1);
  return { items: page.map(row => ({ id: row.id, title: marketQuoteSchema.parse(row.quote).title, amountMinor: row.totalMinor, currency: row.currency, paymentMethod: row.paymentMethod, updatedAt: row.updatedAt.toISOString(), reason: row.events[0]?.message ?? "" })), nextCursor: rows.length > 25 && last ? Buffer.from(JSON.stringify({ actorId, id: last.id, updatedAt: last.updatedAt.toISOString() })).toString("base64url") : null };
}
