CREATE TABLE "market_listing_stars" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_listing_stars_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_listing_stars_userId_listingId_key" ON "market_listing_stars"("userId", "listingId");
CREATE INDEX "market_listing_stars_listingId_createdAt_idx" ON "market_listing_stars"("listingId", "createdAt");
ALTER TABLE "market_listing_stars" ADD CONSTRAINT "market_listing_stars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_listing_stars" ADD CONSTRAINT "market_listing_stars_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "market_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
