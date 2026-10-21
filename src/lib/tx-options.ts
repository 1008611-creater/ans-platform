/**
 * 交互式事务的显式超时。
 *
 * Prisma 默认 `maxWait: 2000ms / timeout: 5000ms`；而计费预留/结算事务要串行跑多条语句，
 * 数据库又在远程 pooler 上（应用与库跨区），默认值会被撞穿，表现为 P2028
 * "Transaction not found … old closed transaction"（2026-10-21 生产事故，gateway 计费预留）。
 *
 * 单独成模块而不是挂在 `@/lib/db` 上：很多测试用 `vi.mock("@/lib/db")` 局部替换，
 * 往 db 模块加新导出会让它们集体炸掉；放在这里影响面最小。
 */
export const TX_OPTIONS = { maxWait: 15_000, timeout: 60_000 } as const;
