/**
 * 交互式事务的失效识别与安全重试。
 *
 * 背景（2026-10-21 生产事故）：gateway 的计费预留事务在 `prisma.quotaLedger.create()`
 * 处抛出 ——
 *   "Invalid `prisma.quotaLedger.create()` invocation:
 *    Transaction API error: Transaction not found. Transaction ID is invalid,
 *    refers to an old closed transaction Prisma doesn't have information about
 *    anymore, or was obtained before disconnecting."
 * 这是 Prisma 的 P2028 族错误：事务已被服务端关闭/失效，事务内后续语句必然全部失败。
 * 预留事务要串行跑 8+ 条语句（行锁、幂等查询、台账、创建请求、扣预留），而库在远程
 * pooler 上（应用与库跨区），默认的 `maxWait 2000ms / timeout 5000ms` 很容易被撞穿。
 *
 * 因此：
 * 1. 事务显式传更宽松的 `TX_OPTIONS`（见 `src/lib/db.ts`）；
 * 2. 对"事务失效"这一族错误允许重试一次 —— 预留阶段失败一定发生在调用模型之前，
 *    既没有扣费也没有产出；若第一次其实已提交，第二次会因幂等键命中
 *    REQUEST_ALREADY_RUNNING 而停下，不会重复计费。
 */

const STALE_TRANSACTION_PATTERN =
  /Transaction not found|Transaction API error|P2028|already closed|obtained before disconnecting/i;

/** 是否为"交互式事务已失效"这一类错误（Prisma P2028 族）。 */
export function isStaleTransactionError(error: unknown): boolean {
  // Prisma 抛的是 Error 实例，但被 mock / 序列化后可能只剩 { name, message } 形状，
  // 两种都要认得，否则线上换一种抛法就会漏检。
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : error && typeof error === "object"
        ? `${(error as { name?: unknown }).name ?? ""}: ${(error as { message?: unknown }).message ?? ""}`
        : String(error);
  return STALE_TRANSACTION_PATTERN.test(text);
}

export interface StaleTransactionRetryOptions {
  /** 总尝试次数（含第一次），默认 2。 */
  attempts?: number;
  /** 重试前的等待毫秒数，默认 250。 */
  delayMs?: number;
  /** 每次决定重试时回调（用于打日志）。 */
  onRetry?: (error: unknown, attempt: number) => void;
  /** 注入的等待函数，测试用。 */
  sleep?: (ms: number) => Promise<void>;
}

/** 跑一个事务；只在"事务失效"时重试一次，其它错误原样抛出。 */
export async function withStaleTransactionRetry<T>(
  run: () => Promise<T>,
  options: StaleTransactionRetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const delayMs = options.delayMs ?? 250;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isStaleTransactionError(error)) throw error;
      options.onRetry?.(error, attempt);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
