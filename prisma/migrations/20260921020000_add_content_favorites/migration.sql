-- CreateEnum
CREATE TYPE "FavoriteTargetType" AS ENUM ('PROMPT', 'TEMPLATE', 'WORKFLOW');

-- CreateTable
CREATE TABLE "content_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "FavoriteTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_favorites_userId_targetType_targetId_key" ON "content_favorites"("userId", "targetType", "targetId");
CREATE INDEX "content_favorites_userId_createdAt_idx" ON "content_favorites"("userId", "createdAt");
CREATE INDEX "content_favorites_targetType_targetId_idx" ON "content_favorites"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "content_favorites" ADD CONSTRAINT "content_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
