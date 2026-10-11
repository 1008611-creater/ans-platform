ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "communityPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avatarFrameKey" VARCHAR(64) NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "chatBubbleKey" VARCHAR(64) NOT NULL DEFAULT 'default';

CREATE TABLE IF NOT EXISTS "growth_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" VARCHAR(64) NOT NULL,
  "sourceType" VARCHAR(64) NOT NULL,
  "sourceId" VARCHAR(128) NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "points" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "growth_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "growth_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_events_userId_type_sourceType_sourceId_key"
  ON "growth_events"("userId", "type", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "growth_events_userId_createdAt_idx"
  ON "growth_events"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "growth_events_type_createdAt_idx"
  ON "growth_events"("type", "createdAt");
