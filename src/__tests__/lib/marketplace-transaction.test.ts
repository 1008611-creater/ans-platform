// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const m = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction } }));
import { marketTransaction } from "@/server/marketplace/shared";
beforeEach(() => vi.resetAllMocks());
it.each(["40001", "40P01"])("retries raw SQL concurrency error %s safely", async code => {
 m.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("raw conflict", { code: "P2010", clientVersion: "6", meta: { code } })).mockResolvedValueOnce({ duplicate: true });
 expect(await marketTransaction(async () => ({ duplicate: false }))).toEqual({ duplicate: true }); expect(m.transaction).toHaveBeenCalledTimes(2);
});
it("does not retry other raw SQL failures", async () => {
 const failure = new Prisma.PrismaClientKnownRequestError("constraint", { code: "P2010", clientVersion: "6", meta: { code: "23514" } });
 m.transaction.mockRejectedValue(failure); await expect(marketTransaction(async () => true)).rejects.toBe(failure); expect(m.transaction).toHaveBeenCalledTimes(1);
});
it("bounds retry attempts and returns a stable conflict", async () => {
 m.transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2010", clientVersion: "6", meta: { code: "40001" } }));
 await expect(marketTransaction(async () => true)).rejects.toMatchObject({ code: "CONFLICT", status: 409 }); expect(m.transaction).toHaveBeenCalledTimes(3);
});
