// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketOrderEvent, MarketOrderMessage } from "@prisma/client";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), order: vi.fn(), cursorMessage: vi.fn(), cursorEvent: vi.fn(), messages: vi.fn(), events: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  marketOrder: { findFirst: mocks.order },
  marketOrderMessage: { findFirst: mocks.cursorMessage, findMany: mocks.messages },
  marketOrderEvent: { findFirst: mocks.cursorEvent, findMany: mocks.events },
} }));
vi.mock("@/server/marketplace/shared", () => ({ requireMarketActor: mocks.actor }));
import { getMarketOrderHistory, presentHistoryPage } from "@/server/marketplace/history";
const stamp = new Date("2026-10-14T00:00:00.000Z");
function message(id: string): MarketOrderMessage {
  return { id, orderId: "order", authorId: "buyer", content: `message ${id}`, createdAt: stamp, idempotencyKey: `key-${id}` };
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.order.mockResolvedValue({ id: "order" });
  mocks.cursorMessage.mockResolvedValue({ id: "m201", createdAt: stamp });
  mocks.cursorEvent.mockResolvedValue({ id: "e201", createdAt: stamp });
});
describe("private order history", () => {
  it("does not read cursor or rows when the user does not own the order", async () => {
    mocks.order.mockResolvedValue(null);
    await expect(getMarketOrderHistory("order", "outsider", { kind: "messages", before: "m201" })).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.order).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "order", OR: [{ buyerId: "outsider" }, { sellerId: "outsider" }] } }));
    expect(mocks.cursorMessage).not.toHaveBeenCalled(); expect(mocks.messages).not.toHaveBeenCalled();
  });
  it("binds cursor to the order and rejects another order's cursor", async () => {
    mocks.cursorMessage.mockResolvedValue(null);
    await expect(getMarketOrderHistory("order", "buyer", { kind: "messages", before: "foreign-message" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.cursorMessage).toHaveBeenCalledWith({ where: { id: "foreign-message", orderId: "order" }, select: { id: true, createdAt: true } });
    expect(mocks.messages).not.toHaveBeenCalled();
  });
  it("pages tied timestamps without losing, repeating or reordering records", async () => {
    const seeded = Array.from({ length: 201 }, (_, index) => message(`m${String(index).padStart(3, "0")}`));
    mocks.cursorMessage.mockImplementation(async ({ where }: { where: { id: string } }) => seeded.find(row => row.id === where.id) ?? null);
    mocks.messages.mockImplementation(async ({ where, take }: { where: { OR: [{ createdAt: { lt: Date } }, { createdAt: Date; id: { lt: string } }] }; take: number }) => {
      const boundary = where.OR[1].id.lt;
      return seeded.filter(row => row.id < boundary).toReversed().slice(0, take);
    });
    const first = await getMarketOrderHistory("order", "buyer", { kind: "messages", before: "m200" });
    expect(first.items).toHaveLength(100); expect(first.nextCursor).toBe("m100");
    const second = await getMarketOrderHistory("order", "buyer", { kind: "messages", before: first.nextCursor });
    expect(second.items).toHaveLength(100); expect(second.nextCursor).toBeNull();
    expect([...second.items, ...first.items].map(row => row.id)).toEqual(seeded.slice(0, 200).map(row => row.id));
    expect(mocks.messages).toHaveBeenCalledWith({ where: { orderId: "order", OR: [{ createdAt: { lt: stamp } }, { createdAt: stamp, id: { lt: "m200" } }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 });
  });
  it("retains checkout redaction for older events", async () => {
    const event = { id: "e100", orderId: "order", actorId: null, action: "CASH_CHECKOUT_PRIVATE", fromStatus: null, toStatus: "AWAITING_PAYMENT", revision: 0, message: "private provider response", createdAt: stamp } as MarketOrderEvent;
    mocks.events.mockResolvedValue([event, { ...event, id: "e099", action: "ORDER_CREATED", message: "buyer note" }]);
    const result = await getMarketOrderHistory("order", "seller", { kind: "events", before: "e201" });
    expect(result.kind).toBe("events"); expect(result.items.map(row => "message" in row ? row.message : "")).toEqual(["buyer note", ""]);
    expect(mocks.messages).not.toHaveBeenCalled();
  });
  it("keeps the initial window bounded and returns a cursor only for older records", () => {
    expect(presentHistoryPage([])).toEqual({ items: [], nextCursor: null });
    const rows = Array.from({ length: 101 }, (_, i) => ({ id: String(i) }));
    expect(presentHistoryPage(rows)).toMatchObject({ nextCursor: "99" });
    expect(presentHistoryPage(rows).items).toHaveLength(100);
    expect(presentHistoryPage(rows.slice(0, 100)).nextCursor).toBeNull();
  });
  it.each([{ kind: "messages", before: "" }, { kind: "deliveries", before: "x" }, { kind: "messages", before: "x", userId: "fake" }])("rejects malformed queries without reads", async raw => {
    await expect(getMarketOrderHistory("order", "buyer", raw)).rejects.toThrow(); expect(mocks.order).not.toHaveBeenCalled();
  });
});
