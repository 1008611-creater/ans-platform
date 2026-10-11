CREATE TABLE "credit_vouchers" (
 "id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL, "batchName" VARCHAR(100) NOT NULL,
 "codeHash" VARCHAR(64) NOT NULL UNIQUE, "points" DECIMAL(24,6) NOT NULL CHECK("points">0),
 "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "redeemedBy" TEXT, "redeemedAt" TIMESTAMP(3),
 CHECK(("redeemedBy" IS NULL)=("redeemedAt" IS NULL)));
CREATE INDEX "credit_vouchers_batchId_redeemedAt_idx" ON "credit_vouchers"("batchId","redeemedAt");
