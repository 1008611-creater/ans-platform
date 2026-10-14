import { z } from "zod";
import { marketOrderStatusSchema } from "./marketplace";

export const marketHistoryPageSize = 100;
export const marketOrderHistoryQuerySchema = z.object({
  kind: z.enum(["messages", "events"]),
  before: z.string().trim().min(1).max(128),
}).strict();
const historyBase = { orderId: z.string().min(1), nextCursor: z.string().min(1).max(128).nullable() };
export const marketOrderHistorySchema = z.discriminatedUnion("kind", [
  z.object({ ...historyBase, kind: z.literal("messages"), items: z.array(z.object({
    id: z.string().min(1), authorId: z.string().min(1), content: z.string(), createdAt: z.string().datetime(),
  })).max(marketHistoryPageSize) }),
  z.object({ ...historyBase, kind: z.literal("events"), items: z.array(z.object({
    id: z.string().min(1), actorId: z.string().nullable(), action: z.string(),
    fromStatus: marketOrderStatusSchema.nullable(), toStatus: marketOrderStatusSchema,
    revision: z.number().int().nonnegative(), message: z.string(), createdAt: z.string().datetime(),
  })).max(marketHistoryPageSize) }),
]);
export type MarketOrderHistory = z.infer<typeof marketOrderHistorySchema>;
