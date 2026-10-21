import { describe, expect, it, vi } from "vitest";
import { isStaleTransactionError, withStaleTransactionRetry } from "@/server/integrations/tx-resilience";

// 生产原文（2026-10-21 gateway 计费预留事故日志）
const PRODUCTION_MESSAGE =
  "\nInvalid `prisma.quotaLedger.create()` invocation:\n\n\n" +
  "Transaction API error: Transaction not found. Transaction ID is invalid, refers to an old closed " +
  "transaction Prisma doesn't have information about anymore, or was obtained before disconnecting.";

describe("isStaleTransactionError", () => {
  it("识别生产事故里的 P2028 原文", () => {
    expect(isStaleTransactionError(new Error(PRODUCTION_MESSAGE))).toBe(true);
    expect(isStaleTransactionError({ name: "PrismaClientKnownRequestError", message: "Transaction API error" })).toBe(true);
    expect(isStaleTransactionError("Transaction already closed: A query cannot be executed on an expired transaction.")).toBe(true);
  });

  it("不把业务错误当事务失效（避免误重试）", () => {
    expect(isStaleTransactionError(new Error("TOO_MANY_ACTIVE_REQUESTS"))).toBe(false);
    expect(isStaleTransactionError(new Error("REQUEST_HASH_CONFLICT"))).toBe(false);
    expect(isStaleTransactionError(new Error("Unique constraint failed on the fields: (`id`)"))).toBe(false);
    expect(isStaleTransactionError(undefined)).toBe(false);
  });
});

describe("withStaleTransactionRetry", () => {
  it("事务失效时重试一次并成功", async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new Error(PRODUCTION_MESSAGE))
      .mockResolvedValueOnce({ id: "task-1" });
    const onRetry = vi.fn();
    const sleep = vi.fn(async () => {});
    await expect(withStaleTransactionRetry(run, { onRetry, sleep })).resolves.toEqual({ id: "task-1" });
    expect(run).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("第二次仍失效就抛出，不再无限重试", async () => {
    const run = vi.fn().mockRejectedValue(new Error(PRODUCTION_MESSAGE));
    await expect(withStaleTransactionRetry(run, { sleep: async () => {} })).rejects.toThrow(/Transaction API error/);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("非事务失效错误立即抛出，绝不重试（避免重复扣费）", async () => {
    const run = vi.fn().mockRejectedValue(new Error("TOO_MANY_ACTIVE_REQUESTS"));
    const onRetry = vi.fn();
    await expect(withStaleTransactionRetry(run, { onRetry, sleep: async () => {} })).rejects.toThrow("TOO_MANY_ACTIVE_REQUESTS");
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("成功路径不重试", async () => {
    const run = vi.fn().mockResolvedValue("ok");
    await expect(withStaleTransactionRetry(run, { sleep: async () => {} })).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });
});
