import type { DbTransaction } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { MarketRuleError, type CashPosting } from "@/domain/marketplace/order";

export function marketHash(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** Only DB work runs here; providers must be called outside the transaction. */
export async function marketTransaction<T>(run: (tx: DbTransaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2034", "P2002"].includes(error.code)
        || (error.code === "P2010" && ["40001", "40P01", "55P03"].includes(String(error.meta?.code))))) {
        if (attempt < 2) continue;
        throw new MarketRuleError("CONFLICT");
      }
      throw error;
    }
  }
  throw new MarketRuleError("CONFLICT");
}

export async function requireMarketActor(tx: DbTransaction, userId: string) {
  const user = await tx.user.findFirst({
    where: { id: userId, deletedAt: null, flagged: false },
    select: { id: true, role: true, adminPermissions: true },
  });
  if (!user) throw new MarketRuleError("ACCOUNT_UNAVAILABLE", 403);
  return user;
}

export async function requireMarketModerator(tx: DbTransaction, userId: string) {
  const user = await requireMarketActor(tx, userId);
  if (user.role !== "ADMIN" || !hasAdminPermission(user.adminPermissions, "MARKETPLACE_MANAGE")) {
    throw new MarketRuleError("FORBIDDEN", 403);
  }
}

export async function appendCashJournal(
  tx: DbTransaction, orderId: string, journalKey: string, currency: string, postings: CashPosting[],
) {
  if (!postings.length || postings.some((row) => !Number.isSafeInteger(row.amountMinor) || row.amountMinor === 0) || postings.reduce((sum, row) => sum + row.amountMinor, 0) !== 0) {
    throw new MarketRuleError("UNBALANCED_JOURNAL", 500);
  }
  await tx.marketCashEntry.createMany({ data: postings.map((row) => ({ orderId, journalKey, currency, ...row })) });
}
