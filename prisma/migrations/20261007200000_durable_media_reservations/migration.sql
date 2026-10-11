-- Add an allowance epoch without changing existing user balances.
ALTER TABLE "users" ADD COLUMN "generationCreditsRevision" INTEGER NOT NULL DEFAULT 0;
CREATE TYPE "MediaGenerationState" AS ENUM ('RESERVED', 'SUBMITTING', 'ACCEPTED', 'UNCERTAIN', 'FAILED');
CREATE TABLE "media_generations" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "idempotencyKey" VARCHAR(100) NOT NULL,
 "requestHash" VARCHAR(64) NOT NULL,
 "provider" VARCHAR(100) NOT NULL,
 "model" VARCHAR(200) NOT NULL,
 "type" VARCHAR(10) NOT NULL,
 "status" "MediaGenerationState" NOT NULL DEFAULT 'RESERVED',
 "creditRevision" INTEGER NOT NULL,
 "creditReturned" BOOLEAN NOT NULL DEFAULT false,
 "encryptedTask" TEXT,
 "webSocketUrl" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "media_generations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "media_generations_credit_epoch" CHECK ("creditRevision" >= 0),
 CONSTRAINT "media_generations_type" CHECK ("type" IN ('image','video','audio')),
 CONSTRAINT "media_generations_accepted_task" CHECK (("status" = 'ACCEPTED') = ("encryptedTask" IS NOT NULL)),
 CONSTRAINT "media_generations_returned_state" CHECK (NOT "creditReturned" OR "status" = 'FAILED'),
 CONSTRAINT "media_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "media_generations_userId_idempotencyKey_key" ON "media_generations"("userId","idempotencyKey");
CREATE INDEX "media_generations_status_updatedAt_idx" ON "media_generations"("status","updatedAt");
