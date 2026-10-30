-- CreateEnum
CREATE TYPE "CommunityPostKind" AS ENUM ('NOTE', 'TEXT', 'STALL');

-- CreateEnum
CREATE TYPE "CommunityStallKind" AS ENUM ('SEEK', 'OFFER', 'SWAP', 'TEAM');

-- CreateEnum
CREATE TYPE "CommunityBoard" AS ENUM ('TEAM', 'CAREER', 'RESEARCH', 'AIGC', 'CAMPUS');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CommunityApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "CommunityPostKind" NOT NULL,
    "stall" "CommunityStallKind",
    "board" "CommunityBoard" NOT NULL,
    "title" VARCHAR(80),
    "body" VARCHAR(2000) NOT NULL,
    "images" TEXT[],
    "roles" JSONB,
    "competitionId" TEXT,
    "teamId" TEXT,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "helperId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_replies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "community_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_likes" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "community_help_offers" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_help_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_team_applications" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "message" VARCHAR(300),
    "status" "CommunityApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_team_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_reports" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" VARCHAR(20) NOT NULL,
    "details" VARCHAR(500),
    "status" "ArtifactReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_status_createdAt_idx" ON "community_posts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "community_posts_board_status_createdAt_idx" ON "community_posts"("board", "status", "createdAt");

-- CreateIndex
CREATE INDEX "community_posts_authorId_createdAt_idx" ON "community_posts"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "community_replies_postId_createdAt_idx" ON "community_replies"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "community_post_likes_postId_idx" ON "community_post_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "community_help_offers_postId_userId_key" ON "community_help_offers"("postId", "userId");

-- CreateIndex
CREATE INDEX "community_team_applications_postId_status_idx" ON "community_team_applications"("postId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_team_applications_postId_applicantId_key" ON "community_team_applications"("postId", "applicantId");

-- CreateIndex
CREATE INDEX "community_post_reports_status_createdAt_idx" ON "community_post_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_reports_postId_reporterId_key" ON "community_post_reports"("postId", "reporterId");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_help_offers" ADD CONSTRAINT "community_help_offers_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_help_offers" ADD CONSTRAINT "community_help_offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_team_applications" ADD CONSTRAINT "community_team_applications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_team_applications" ADD CONSTRAINT "community_team_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

