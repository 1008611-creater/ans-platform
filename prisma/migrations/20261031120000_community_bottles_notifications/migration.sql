-- CreateEnum
CREATE TYPE "CommunityBottleStatus" AS ENUM ('OPEN', 'HIDDEN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_HELP_OFFER';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_APPLICATION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_APPLICATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_APPLICATION_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_HELPED';
ALTER TYPE "NotificationType" ADD VALUE 'BOTTLE_REPLY';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "bottleId" TEXT,
ADD COLUMN     "communityPostId" TEXT,
ADD COLUMN     "excerpt" VARCHAR(80);

-- CreateTable
CREATE TABLE "community_bottles" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(280) NOT NULL,
    "status" "CommunityBottleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bottles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_bottle_picks" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bottle_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_bottle_replies" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bottle_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_bottle_reports" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" VARCHAR(20) NOT NULL,
    "status" "ArtifactReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bottle_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_bottles_status_createdAt_idx" ON "community_bottles"("status", "createdAt");

-- CreateIndex
CREATE INDEX "community_bottles_authorId_createdAt_idx" ON "community_bottles"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "community_bottle_picks_userId_createdAt_idx" ON "community_bottle_picks"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_bottle_picks_bottleId_userId_key" ON "community_bottle_picks"("bottleId", "userId");

-- CreateIndex
CREATE INDEX "community_bottle_replies_bottleId_createdAt_idx" ON "community_bottle_replies"("bottleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_bottle_replies_bottleId_authorId_key" ON "community_bottle_replies"("bottleId", "authorId");

-- CreateIndex
CREATE INDEX "community_bottle_reports_status_createdAt_idx" ON "community_bottle_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_bottle_reports_bottleId_reporterId_key" ON "community_bottle_reports"("bottleId", "reporterId");

-- AddForeignKey
ALTER TABLE "community_bottles" ADD CONSTRAINT "community_bottles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_picks" ADD CONSTRAINT "community_bottle_picks_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "community_bottles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_picks" ADD CONSTRAINT "community_bottle_picks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_replies" ADD CONSTRAINT "community_bottle_replies_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "community_bottles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_replies" ADD CONSTRAINT "community_bottle_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_reports" ADD CONSTRAINT "community_bottle_reports_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "community_bottles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bottle_reports" ADD CONSTRAINT "community_bottle_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

