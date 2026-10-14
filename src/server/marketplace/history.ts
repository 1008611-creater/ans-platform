import type { MarketOrderEvent, MarketOrderMessage } from "@prisma/client";
import { db } from "@/lib/db";
import { marketHistoryPageSize, marketOrderHistoryQuerySchema, type MarketOrderHistory } from "@/contracts/marketplace-history";
import { MarketRuleError } from "@/domain/marketplace/order";
import { requireMarketActor } from "./shared";

export function presentOrderMessage(message: MarketOrderMessage) {
  return { id: message.id, authorId: message.authorId, content: message.content, createdAt: message.createdAt.toISOString() };
}
export function presentOrderEvent(event: MarketOrderEvent) {
  return { id: event.id, actorId: event.actorId, action: event.action, fromStatus: event.fromStatus,
    toStatus: event.toStatus, revision: event.revision,
    message: event.action.startsWith("CASH_CHECKOUT_") ? "" : event.message, createdAt: event.createdAt.toISOString() };
}
export function presentHistoryPage<T extends { id: string }>(rows: T[]) {
  const page = rows.slice(0, marketHistoryPageSize);
  return { items: page.toReversed(), nextCursor: rows.length > marketHistoryPageSize ? page.at(-1)!.id : null };
}

/** A cursor is scoped to its order; it never grants access to another conversation. */
export async function getMarketOrderHistory(orderId: string, userId: string, raw: unknown): Promise<MarketOrderHistory> {
  const input = marketOrderHistoryQuerySchema.parse(raw);
  await requireMarketActor(db, userId);
  const order = await db.marketOrder.findFirst({
    where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] }, select: { id: true },
  });
  if (!order) throw new MarketRuleError("NOT_FOUND", 404);
  const cursorQuery = { where: { id: input.before, orderId }, select: { id: true, createdAt: true } };
  const cursor = input.kind === "messages"
    ? await db.marketOrderMessage.findFirst(cursorQuery)
    : await db.marketOrderEvent.findFirst(cursorQuery);
  if (!cursor) throw new MarketRuleError("NOT_FOUND", 404);
  const query = {
    where: { orderId, OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ] },
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: marketHistoryPageSize + 1,
  };
  if (input.kind === "messages") {
    const rows = await db.marketOrderMessage.findMany(query);
    return { orderId, kind: "messages", ...presentHistoryPage(rows.map(presentOrderMessage)) };
  }
  const rows = await db.marketOrderEvent.findMany(query);
  return { orderId, kind: "events", ...presentHistoryPage(rows.map(presentOrderEvent)) };
}
