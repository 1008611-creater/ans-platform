-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('CHECK_IN', 'PUBLISH_PROMPT', 'PUBLISH_TEMPLATE', 'COMMENT', 'RECEIVE_VOTE', 'RECEIVE_FAVORITE', 'FEATURED', 'TEMPLATE_APPROVED', 'RUN_COMPLETE', 'MANUAL_ADJUST');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateOutputType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('UPCOMING', 'ONGOING', 'ENDED');

-- CreateEnum
CREATE TYPE "QuotaReason" AS ENUM ('CLAIM', 'GRANT', 'TEAM_GRANT', 'RUN_COST', 'REFUND', 'ADMIN_ADJUST');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "checkInStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckInAt" TIMESTAMP(3),
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "nicknameSetAt" TIMESTAMP(3),
ADD COLUMN     "quotaClaimedAt" TIMESTAMP(3),
ADD COLUMN     "quotaPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 5,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_redemptions" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "usedById" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "coverUrl" TEXT,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "formSchema" JSONB NOT NULL,
    "promptBody" TEXT NOT NULL,
    "modelKey" TEXT,
    "params" JSONB,
    "outputType" "TemplateOutputType" NOT NULL DEFAULT 'TEXT',
    "estimatedCost" INTEGER NOT NULL DEFAULT 1,
    "status" "TemplateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewScore" JSONB,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "competitionId" TEXT,
    "inputs" JSONB NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "outputText" TEXT,
    "outputUrl" TEXT,
    "error" TEXT,
    "costPoints" INTEGER NOT NULL DEFAULT 0,
    "externalTaskId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "quotaAllowance" INTEGER NOT NULL DEFAULT 0,
    "quotaUsed" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizer" TEXT,
    "url" TEXT,
    "description" TEXT,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_competitions" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "quotaGranted" INTEGER NOT NULL DEFAULT 0,
    "quotaUsed" INTEGER NOT NULL DEFAULT 0,
    "memberCap" INTEGER NOT NULL DEFAULT 0,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPoints" BIGINT NOT NULL DEFAULT 0,
    "claimedPoints" BIGINT NOT NULL DEFAULT 0,
    "perUserPoints" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_ledgers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "poolId" TEXT,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER,
    "reason" "QuotaReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_ledger_userId_createdAt_idx" ON "xp_ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "xp_ledger_userId_reason_idx" ON "xp_ledger"("userId", "reason");

-- CreateIndex
CREATE INDEX "check_ins_userId_createdAt_idx" ON "check_ins"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_userId_day_key" ON "check_ins"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "invite_codes_creatorId_idx" ON "invite_codes"("creatorId");

-- CreateIndex
CREATE INDEX "invite_redemptions_usedById_idx" ON "invite_redemptions"("usedById");

-- CreateIndex
CREATE UNIQUE INDEX "invite_redemptions_codeId_usedById_key" ON "invite_redemptions"("codeId", "usedById");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_categoryId_status_idx" ON "templates"("categoryId", "status");

-- CreateIndex
CREATE INDEX "templates_authorId_idx" ON "templates"("authorId");

-- CreateIndex
CREATE INDEX "templates_status_createdAt_idx" ON "templates"("status", "createdAt");

-- CreateIndex
CREATE INDEX "runs_userId_createdAt_idx" ON "runs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "runs_status_idx" ON "runs"("status");

-- CreateIndex
CREATE INDEX "runs_teamId_idx" ON "runs"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_competitions_teamId_competitionId_key" ON "team_competitions"("teamId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "quota_pools_name_key" ON "quota_pools"("name");

-- CreateIndex
CREATE INDEX "quota_ledgers_userId_createdAt_idx" ON "quota_ledgers"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "quota_ledgers_reason_idx" ON "quota_ledgers"("reason");

-- CreateIndex
CREATE INDEX "prompts_slug_idx" ON "prompts"("slug");

-- CreateIndex
CREATE INDEX "prompts_isPrivate_isUnlisted_deletedAt_createdAt_idx" ON "prompts"("isPrivate", "isUnlisted", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "users_xp_idx" ON "users"("xp");

-- CreateIndex
CREATE INDEX "users_quotaClaimedAt_idx" ON "users"("quotaClaimedAt");

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_redemptions" ADD CONSTRAINT "invite_redemptions_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_redemptions" ADD CONSTRAINT "invite_redemptions_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_competitions" ADD CONSTRAINT "team_competitions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_competitions" ADD CONSTRAINT "team_competitions_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_ledgers" ADD CONSTRAINT "quota_ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

