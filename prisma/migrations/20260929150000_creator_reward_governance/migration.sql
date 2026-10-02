-- CreateEnum
CREATE TYPE "XpRewardAppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "XpRewardReviewStatus" AS ENUM ('OPEN', 'CLEARED', 'REVERSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpReason" ADD VALUE 'COMMUNITY_REWARD';
ALTER TYPE "XpReason" ADD VALUE 'REWARD_REVERSAL';

-- CreateTable
CREATE TABLE "xp_reward_rules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(1000),
    "amount" INTEGER NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_reward_grants" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_reward_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_reward_appeals" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "status" "XpRewardAppealStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "resolution" VARCHAR(2000),
    "adjustment" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "xp_reward_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_reward_review_cases" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "XpRewardReviewStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolution" VARCHAR(2000),
    "reversalLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "xp_reward_review_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_rules_key_key" ON "xp_reward_rules"("key");

-- CreateIndex
CREATE INDEX "xp_reward_rules_active_createdAt_idx" ON "xp_reward_rules"("active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_grants_ledgerId_key" ON "xp_reward_grants"("ledgerId");

-- CreateIndex
CREATE INDEX "xp_reward_grants_userId_createdAt_idx" ON "xp_reward_grants"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_grants_ruleId_userId_sourceType_sourceId_key" ON "xp_reward_grants"("ruleId", "userId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_appeals_ledgerId_key" ON "xp_reward_appeals"("ledgerId");

-- CreateIndex
CREATE INDEX "xp_reward_appeals_status_createdAt_idx" ON "xp_reward_appeals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "xp_reward_appeals_userId_createdAt_idx" ON "xp_reward_appeals"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_review_cases_ledgerId_key" ON "xp_reward_review_cases"("ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "xp_reward_review_cases_reversalLedgerId_key" ON "xp_reward_review_cases"("reversalLedgerId");

-- CreateIndex
CREATE INDEX "xp_reward_review_cases_status_createdAt_idx" ON "xp_reward_review_cases"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "xp_reward_rules" ADD CONSTRAINT "xp_reward_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_grants" ADD CONSTRAINT "xp_reward_grants_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "xp_reward_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_grants" ADD CONSTRAINT "xp_reward_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_grants" ADD CONSTRAINT "xp_reward_grants_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "xp_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_appeals" ADD CONSTRAINT "xp_reward_appeals_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "xp_ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_appeals" ADD CONSTRAINT "xp_reward_appeals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_appeals" ADD CONSTRAINT "xp_reward_appeals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_review_cases" ADD CONSTRAINT "xp_reward_review_cases_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "xp_ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_review_cases" ADD CONSTRAINT "xp_reward_review_cases_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_reward_review_cases" ADD CONSTRAINT "xp_reward_review_cases_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
