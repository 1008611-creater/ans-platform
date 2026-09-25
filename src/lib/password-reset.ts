import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const RESET_TTL_MS = 15 * 60 * 1000;
export const RESET_WINDOW_MS = 10 * 60 * 1000;
export const RESET_COOLDOWN_SECONDS = 60;
export const RESET_MAX_ATTEMPTS = 5;
export const RESET_MAX_DAILY_SENDS = 10;
export const RESET_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

type Transaction = Prisma.TransactionClient;

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const namespace = (kind: string, email: string) =>
  `ans:password-reset:${kind}:${digest(email)}`;

export function resetToken(email: string, code: string, secret: string) {
  return `v2:${createHmac("sha256", secret)
    .update(`password-reset\0${email}\0${code}`)
    .digest("hex")}`;
}

export function legacyResetToken(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function sameToken(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function withResetLock<T>(
  email: string,
  work: (tx: Transaction) => Promise<T>,
) {
  const key = BigInt.asIntN(
    64,
    BigInt(`0x${digest(namespace("lock", email)).slice(0, 16)}`),
  );
  return db.$transaction(
    async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key}::bigint)`;
      return work(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 30000,
    },
  );
}

export async function readCounter(
  tx: Transaction,
  kind: string,
  email: string,
  now: Date,
  windowMs = RESET_WINDOW_MS,
) {
  const prefix = namespace(kind, email);
  const token = digest(prefix);
  const row = await tx.verificationToken.findUnique({ where: { token } });

  if (row && row.expires > now) {
    const count = Number(row.identifier.slice(prefix.length + 1));
    if (
      !row.identifier.startsWith(`${prefix}:`) ||
      !Number.isInteger(count) ||
      count < 0
    ) {
      throw new Error("password reset counter corrupted");
    }
    return { prefix, token, count, expires: row.expires, exists: true };
  }

  if (row) await tx.verificationToken.deleteMany({ where: { token } });
  return {
    prefix,
    token,
    count: 0,
    expires: new Date(now.getTime() + windowMs),
    exists: false,
  };
}

export async function incrementCounter(
  tx: Transaction,
  state: Awaited<ReturnType<typeof readCounter>>,
  expires = state.expires,
) {
  const data = {
    identifier: `${state.prefix}:${state.count + 1}`,
    expires,
  };
  if (state.exists) {
    await tx.verificationToken.update({ where: { token: state.token }, data });
  } else {
    await tx.verificationToken.create({ data: { ...data, token: state.token } });
  }
}

export function retryAfter(expires: Date, now = new Date()) {
  return Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / 1000));
}
