-- CreateEnum
CREATE TYPE "PromptReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "prompts_isPrivate_isUnlisted_deletedAt_createdAt_idx";

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" "PromptReviewStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "prompts_isPrivate_reviewStatus_isUnlisted_deletedAt_created_idx" ON "prompts"("isPrivate", "reviewStatus", "isUnlisted", "deletedAt", "createdAt" DESC);

