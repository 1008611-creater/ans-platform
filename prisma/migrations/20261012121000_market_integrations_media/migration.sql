CREATE TABLE "market_integrations" (
"id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "keyHash" VARCHAR(64) NOT NULL, "keyPrefix" VARCHAR(24) NOT NULL,
"returnOrigins" TEXT[] NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "market_integrations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "market_integrations_listingId_key" ON "market_integrations"("listingId");
CREATE UNIQUE INDEX "market_integrations_keyHash_key" ON "market_integrations"("keyHash");
ALTER TABLE "market_integrations" ADD CONSTRAINT "market_integrations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "market_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "market_external_checkouts" (
"id" TEXT NOT NULL, "integrationId" TEXT NOT NULL, "reference" VARCHAR(80) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
"listingVersion" INTEGER NOT NULL, "tierId" VARCHAR(60), "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
"returnUrl" VARCHAR(1000) NOT NULL, "buyerId" TEXT, "orderId" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "market_external_checkouts_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "market_external_checkouts_integrationId_reference_key" ON "market_external_checkouts"("integrationId", "reference");
CREATE UNIQUE INDEX "market_external_checkouts_orderId_key" ON "market_external_checkouts"("orderId");
CREATE INDEX "market_external_checkouts_buyerId_createdAt_idx" ON "market_external_checkouts"("buyerId", "createdAt");
ALTER TABLE "market_external_checkouts" ADD CONSTRAINT "market_external_checkouts_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "market_integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_external_checkouts" ADD CONSTRAINT "market_external_checkouts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_external_checkouts" ADD CONSTRAINT "market_external_checkouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "market_media" (
"id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "mimeType" VARCHAR(40) NOT NULL, "sha256" VARCHAR(64) NOT NULL,
"size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 4194304), "content" BYTEA NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "market_media_pkey" PRIMARY KEY ("id"));
CREATE INDEX "market_media_ownerId_createdAt_idx" ON "market_media"("ownerId", "createdAt");
ALTER TABLE "market_media" ADD CONSTRAINT "market_media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
