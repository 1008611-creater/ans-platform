-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_RELAY';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_FOLLOWED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_FOLLOWEE_POST';

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "relayOfId" TEXT;

-- CreateTable
CREATE TABLE "community_follows" (
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_follows_pkey" PRIMARY KEY ("followerId","followeeId")
);

-- CreateIndex
CREATE INDEX "community_posts_relayOfId_createdAt_idx" ON "community_posts"("relayOfId", "createdAt");

-- CreateIndex
CREATE INDEX "community_follows_followeeId_createdAt_idx" ON "community_follows"("followeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_relayOfId_fkey" FOREIGN KEY ("relayOfId") REFERENCES "community_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
