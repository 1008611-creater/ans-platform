import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * 领取公共免费算力池额度
 * 规则：登录 + 未领取过 + 池子仍有余量。每人限一次，用事务 + 条件更新防并发超发。
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先登录" },
      { status: 401 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, quotaClaimedAt: true, quotaPoints: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        return { ok: false as const, status: 401, message: "账号不可用" };
      }
      if (user.quotaClaimedAt) {
        return { ok: false as const, status: 409, message: "每人限领一次" };
      }

      const pool = await tx.quotaPool.findFirst({
        where: { active: true },
        orderBy: { createdAt: "desc" },
      });

      if (!pool) {
        return { ok: false as const, status: 404, message: "当前没有开放的额度池" };
      }

      const grant = pool.perUserPoints;
      if (grant <= 0) {
        return { ok: false as const, status: 400, message: "额度池未配置发放数量" };
      }

      const remaining = Number(pool.totalPoints) - Number(pool.claimedPoints);
      if (remaining < grant) {
        return { ok: false as const, status: 410, message: "额度池已被领完" };
      }

      // 条件更新：claimedPoints 只有在不超过总量时才写入，防并发超发
      const updated = await tx.quotaPool.updateMany({
        where: {
          id: pool.id,
          claimedPoints: { lte: pool.totalPoints - BigInt(grant) },
        },
        data: { claimedPoints: { increment: grant } },
      });

      if (updated.count === 0) {
        return { ok: false as const, status: 410, message: "额度池已被领完" };
      }

      const newBalance = user.quotaPoints + grant;

      await tx.user.update({
        where: { id: userId },
        data: { quotaPoints: newBalance, quotaClaimedAt: new Date() },
      });

      await tx.quotaLedger.create({
        data: {
          userId,
          poolId: pool.id,
          amount: grant,
          balanceAfter: newBalance,
          reason: "CLAIM",
          note: `领取公共额度池 ${pool.name}`,
        },
      });

      return { ok: true as const, granted: grant, balance: newBalance };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "claim_failed", message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      granted: result.granted,
      balance: result.balance,
    });
  } catch (error) {
    console.error("Quota claim error:", error);
    return NextResponse.json(
      { error: "server_error", message: "领取失败，请稍后重试" },
      { status: 500 }
    );
  }
}
