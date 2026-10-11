ALTER TYPE "QuotaReason" ADD VALUE IF NOT EXISTS 'RECHARGE';
ALTER TABLE "ldxp_recharge_orders" ADD COLUMN "requestKey" VARCHAR(120);
CREATE UNIQUE INDEX "ldxp_recharge_orders_userId_requestKey_key" ON "ldxp_recharge_orders"("userId", "requestKey");
