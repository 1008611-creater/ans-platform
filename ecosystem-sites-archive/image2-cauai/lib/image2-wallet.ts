import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  getImage2FreeQuotaStatus,
  image2FreeQuotaExceededPayload,
  isImage2FreeQuotaExceeded,
  refundImage2FreeQuota,
  reserveImage2FreeQuota,
  type Image2FreeQuotaReservation,
  type Image2FreeQuotaStatus
} from "@/lib/image2-free-quota";
import {
  callAnsBridge,
  getBearerToken,
  getSupabaseUser,
  type SupabaseUser
} from "@/lib/image2-membership";

export type Image2WalletSummary = {
  balance: number;
  lifetimeCredited: number;
  lifetimeSpent: number;
  updatedAt?: string;
};

export type Image2WalletTransaction = {
  id: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  source?: string;
  status: string;
  type: string;
};

export type Image2WalletStatus = {
  storageMode: "supabase-postgres";
  user: {
    id: string;
    email?: string;
  };
  wallet: Image2WalletSummary;
  recentTransactions: Image2WalletTransaction[];
};

export type Image2BalanceRedemptionResult = {
  redemption: {
    credits: number;
    plan: string;
    transactionId?: string;
  };
  wallet: Image2WalletStatus;
};

export type Image2GenerationUsageReservation =
  | {
      kind: "free";
      quota: Image2FreeQuotaStatus;
      reservation: Image2FreeQuotaReservation;
    }
  | {
      kind: "paid";
      quota: Image2FreeQuotaStatus;
      reservation: {
        transactionId?: string;
        userId: string;
        email?: string;
        wallet: Image2WalletSummary;
      };
      wallet: Image2WalletSummary;
    };

export class Image2LegacyLicenseCodeError extends Error {
  constructor(message = "这是旧卡密，正在按兼容规则兑换图片额度。") {
    super(message);
    this.name = "Image2LegacyLicenseCodeError";
  }
}

export class Image2BalanceInsufficientError extends Error {
  code = "image2_balance_insufficient" as const;
  quota: Image2FreeQuotaStatus;
  wallet?: Image2WalletSummary;

  constructor(
    message: string,
    options: {
      quota?: Image2FreeQuotaStatus;
      wallet?: Image2WalletSummary;
    } = {}
  ) {
    super(message);
    this.name = "Image2BalanceInsufficientError";
    this.quota = options.quota ?? {
      blocked: true,
      limit: 2,
      remaining: 0,
      used: 2
    };
    this.wallet = options.wallet;
  }
}

const ANS_POINTS_PER_IMAGE = 2;

export async function readImage2Wallet(user: SupabaseUser): Promise<Image2WalletStatus> {
  const res = await callAnsBridge({
    operation: "balance",
    subject: user.id,
    email: user.email,
    limit: 12
  });

  const balance = Math.max(0, Number(res.body?.balance ?? 0) || 0);
  const ledger = Array.isArray(res.body?.ledger) ? res.body.ledger : [];
  let lifetimeCredited = 0;
  let lifetimeSpent = 0;
  const recentTransactions: Image2WalletTransaction[] = ledger.map((item: any) => {
    const delta = Number(item.delta ?? 0) || 0;
    if (delta > 0) lifetimeCredited += delta;
    if (delta < 0) lifetimeSpent += Math.abs(delta);
    return {
      id: String(item.id || randomUUID()),
      amount: delta,
      balanceAfter: Number(item.balanceAfter ?? balance) || 0,
      createdAt: String(item.createdAt || new Date().toISOString()),
      source: String(item.note || item.refType || "ANS 算力积分"),
      status: "succeeded",
      type: delta >= 0 ? "credit" : "spend"
    };
  });

  return {
    storageMode: "supabase-postgres",
    user,
    wallet: {
      balance,
      lifetimeCredited: Math.max(balance, lifetimeCredited),
      lifetimeSpent,
      updatedAt: new Date().toISOString()
    },
    recentTransactions
  };
}

export async function redeemImage2BalanceCode(
  request: NextRequest,
  user: SupabaseUser,
  code: string
): Promise<Image2BalanceRedemptionResult> {
  if (!getBearerToken(request)) throw new Error("请先登录 ANS 账号后再兑换卡密。");

  const res = await callAnsBridge({
    operation: "redeem",
    subject: user.id,
    email: user.email,
    code
  });

  if (!res.ok || !res.body?.ok) {
    throw new Error(res.body?.message || "ANS 积分兑换码无效或已被使用。");
  }

  const credits = Number(res.body.pointsAdded ?? res.body.redeemedPoints ?? 0);
  return {
    redemption: {
      credits,
      plan: `ans_${credits}_pts`,
      transactionId: `ans_redeem_${Date.now()}`
    },
    wallet: await readImage2Wallet(user)
  };
}

export function isImage2BalanceInsufficient(error: unknown): boolean {
  return error instanceof Image2BalanceInsufficientError;
}

export function image2BalanceInsufficientPayload(error: Image2BalanceInsufficientError) {
  return {
    code: error.code,
    error: error.message,
    quota: error.quota,
    wallet: error.wallet
  };
}

async function debitImage2Wallet(user: SupabaseUser, quota?: Image2FreeQuotaStatus) {
  const txId = `img2:${randomUUID()}`;
  const res = await callAnsBridge({
    operation: "reserve",
    subject: user.id,
    email: user.email,
    refId: txId,
    refType: "image2-gen",
    costPoints: ANS_POINTS_PER_IMAGE,
    note: "Image2 案例库做同款生图 (2点/张)"
  });

  if (!res.ok || !res.body?.ok) {
    const walletStatus = await readImage2Wallet(user).catch(() => null);
    throw new Image2BalanceInsufficientError(
      `当前 ANS 算力积分不足（生图需 ${ANS_POINTS_PER_IMAGE} 点/张，可前往 ans.cauai.fun/workspace/credits 领积分或兑换）。`,
      { quota, wallet: walletStatus?.wallet }
    );
  }

  const balance = Math.max(0, Number(res.body.balance ?? 0));
  const wallet: Image2WalletSummary = {
    balance,
    lifetimeCredited: balance + ANS_POINTS_PER_IMAGE,
    lifetimeSpent: ANS_POINTS_PER_IMAGE,
    updatedAt: new Date().toISOString()
  };

  return {
    transactionId: txId,
    userId: user.id,
    email: user.email,
    wallet
  };
}

export async function reserveImage2GenerationUsage(request: NextRequest): Promise<Image2GenerationUsageReservation> {
  try {
    const reservation = await reserveImage2FreeQuota(request);
    return {
      kind: "free",
      quota: reservation.quota,
      reservation
    };
  } catch (error) {
    if (!isImage2FreeQuotaExceeded(error)) throw error;

    const token = getBearerToken(request);
    if (!token) {
      throw new Image2BalanceInsufficientError(
        "请先点击右上角登录 ANS 账号，使用 ANS 算力积分生成（2 点/张）。",
        { quota: error.quota }
      );
    }

    let user: SupabaseUser;
    try {
      user = await getSupabaseUser(request, "请登录 ANS 账号后使用算力积分生成（2 积分/张）。");
    } catch {
      throw new Image2BalanceInsufficientError("登录状态已过期，请重新登录 ANS 账号。", {
        quota: error.quota
      });
    }

    const paid = await debitImage2Wallet(user, error.quota);
    return {
      kind: "paid",
      quota: error.quota,
      reservation: paid,
      wallet: paid.wallet
    };
  }
}

export async function refundImage2GenerationUsage(reservation: Image2GenerationUsageReservation) {
  if (reservation.kind === "free") {
    return {
      quota: await refundImage2FreeQuota(reservation.reservation)
    };
  }

  const transactionId = reservation.reservation.transactionId;
  if (!transactionId) return { wallet: reservation.wallet };

  const res = await callAnsBridge({
    operation: "settle",
    subject: reservation.reservation.userId,
    email: reservation.reservation.email,
    refId: transactionId,
    refType: "image2-gen",
    costPoints: ANS_POINTS_PER_IMAGE,
    actualCostPoints: 0,
    success: false,
    note: "Image2 生图失败自动退回积分"
  }).catch(() => null);

  const balance = Number.isFinite(Number(res?.body?.balance))
    ? Number(res?.body?.balance)
    : reservation.wallet.balance + ANS_POINTS_PER_IMAGE;

  return {
    wallet: {
      ...reservation.wallet,
      balance
    }
  };
}

export function image2UsagePayload(reservation: Image2GenerationUsageReservation) {
  if (reservation.kind === "free") {
    return { quota: reservation.quota };
  }

  return {
    quota: reservation.quota,
    wallet: reservation.wallet
  };
}

export function image2GenerationAccessPayload(error: unknown) {
  if (isImage2FreeQuotaExceeded(error)) return image2FreeQuotaExceededPayload(error);
  if (isImage2BalanceInsufficient(error)) return image2BalanceInsufficientPayload(error as Image2BalanceInsufficientError);
  return null;
}
