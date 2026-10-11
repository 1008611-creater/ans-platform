CREATE TABLE "ldxp_recharge_orders" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "tradeNo" VARCHAR(120) NOT NULL UNIQUE,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "points" NUMERIC(24,6) NOT NULL CHECK ("points" > 0),
  "channelId" INTEGER NOT NULL CHECK ("channelId" = 4),
  "payUrl" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('PENDING','PAID','FAILED','EXPIRED')),
  "providerPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3)
);
CREATE INDEX "ldxp_recharge_orders_user_created_idx" ON "ldxp_recharge_orders"("userId","createdAt");
CREATE INDEX "ldxp_recharge_orders_status_checked_idx" ON "ldxp_recharge_orders"("status","lastCheckedAt");