-- CreateEnum
CREATE TYPE "MarketListingStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MarketOrderStatus" AS ENUM ('AWAITING_PAYMENT', 'AWAITING_REQUIREMENTS', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MarketCashAccount" AS ENUM ('PROVIDER_RECEIVABLE', 'BUYER_HELD', 'SELLER_PAYABLE', 'PLATFORM_REVENUE', 'REFUND_PAYABLE');

-- CreateTable
CREATE TABLE "market_listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "status" "MarketListingStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_listing_versions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" VARCHAR(2000),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_listing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_orders" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "MarketOrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "quote" JSONB NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "requirements" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "revisionRequests" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_order_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "fromStatus" "MarketOrderStatus",
    "toStatus" "MarketOrderStatus" NOT NULL,
    "revision" INTEGER NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "operationKey" VARCHAR(200) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_order_messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderRevision" INTEGER NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "sourceArtifactVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "providerPaymentId" VARCHAR(120) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "allocation" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_payment_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "providerEventId" VARCHAR(120) NOT NULL,
    "orderId" TEXT NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(40) NOT NULL,
    "payload" JSONB NOT NULL,
    "outcome" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_refunds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "requestedById" TEXT,
    "providerRefundId" VARCHAR(120),
    "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_cash_entries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "journalKey" VARCHAR(200) NOT NULL,
    "account" "MarketCashAccount" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_reviews" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_listings_slug_key" ON "market_listings"("slug");

-- CreateIndex
CREATE INDEX "market_listings_sellerId_updatedAt_idx" ON "market_listings"("sellerId", "updatedAt");

-- CreateIndex
CREATE INDEX "market_listings_status_updatedAt_idx" ON "market_listings"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_listing_versions_listingId_version_key" ON "market_listing_versions"("listingId", "version");

-- CreateIndex
CREATE INDEX "market_orders_buyerId_updatedAt_idx" ON "market_orders"("buyerId", "updatedAt");

-- CreateIndex
CREATE INDEX "market_orders_sellerId_status_updatedAt_idx" ON "market_orders"("sellerId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_orders_buyerId_idempotencyKey_key" ON "market_orders"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "market_order_events_orderId_createdAt_idx" ON "market_order_events"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_order_events_orderId_operationKey_key" ON "market_order_events"("orderId", "operationKey");

-- CreateIndex
CREATE INDEX "market_order_messages_orderId_createdAt_idx" ON "market_order_messages"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_order_messages_orderId_authorId_idempotencyKey_key" ON "market_order_messages"("orderId", "authorId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "market_deliveries_orderId_orderRevision_key" ON "market_deliveries"("orderId", "orderRevision");

-- CreateIndex
CREATE INDEX "market_payments_orderId_idx" ON "market_payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "market_payments_provider_providerPaymentId_key" ON "market_payments"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "market_payment_events_orderId_createdAt_idx" ON "market_payment_events"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_payment_events_provider_providerEventId_key" ON "market_payment_events"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "market_refunds_paymentId_key" ON "market_refunds"("paymentId");

-- CreateIndex
CREATE INDEX "market_refunds_orderId_idx" ON "market_refunds"("orderId");

-- CreateIndex
CREATE INDEX "market_cash_entries_account_createdAt_idx" ON "market_cash_entries"("account", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_cash_entries_orderId_journalKey_account_key" ON "market_cash_entries"("orderId", "journalKey", "account");

-- CreateIndex
CREATE UNIQUE INDEX "market_reviews_orderId_key" ON "market_reviews"("orderId");

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listing_versions" ADD CONSTRAINT "market_listing_versions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "market_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "market_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_events" ADD CONSTRAINT "market_order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_events" ADD CONSTRAINT "market_order_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_messages" ADD CONSTRAINT "market_order_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_order_messages" ADD CONSTRAINT "market_order_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_deliveries" ADD CONSTRAINT "market_deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_payments" ADD CONSTRAINT "market_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_refunds" ADD CONSTRAINT "market_refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_refunds" ADD CONSTRAINT "market_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "market_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_cash_entries" ADD CONSTRAINT "market_cash_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_reviews" ADD CONSTRAINT "market_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_reviews" ADD CONSTRAINT "market_reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial history is append-only and prices are integer fen. These constraints
-- also protect imports and maintenance scripts that bypass application schemas.
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listing_versions_valid" CHECK (
  "currentVersion" > 0 AND ("publishedVersion" IS NULL OR "publishedVersion" BETWEEN 1 AND "currentVersion")
  AND ("status" <> 'PUBLISHED' OR "publishedVersion" IS NOT NULL)
);
ALTER TABLE "market_listing_versions" ADD CONSTRAINT "market_offer_version_positive" CHECK ("version" > 0);
ALTER TABLE "market_orders" ADD CONSTRAINT "market_order_money_valid" CHECK (
  "totalMinor" BETWEEN 1 AND 100000000 AND "currency" = 'CNY'
  AND "buyerId" <> "sellerId" AND "revision" >= 0 AND "revisionRequests" >= 0
  AND "quote"->>'currency' = "currency" AND ("quote"->>'priceMinor')::numeric = "totalMinor"
  AND "quote"->>'sellerId' = "sellerId" AND "quote"->>'listingId' = "listingId"
);
ALTER TABLE "market_payments" ADD CONSTRAINT "market_payment_money_valid" CHECK (
  "amountMinor" BETWEEN 1 AND 100000000 AND "currency" ~ '^[A-Z]{3}$'
  AND "allocation" IN ('ORDER', 'RETURN_REQUIRED')
);
CREATE UNIQUE INDEX "market_payments_primary_order_key" ON "market_payments"("orderId") WHERE "allocation" = 'ORDER';
ALTER TABLE "market_refunds" ADD CONSTRAINT "market_refund_money_valid" CHECK ("amountMinor" BETWEEN 1 AND 100000000 AND "dispatchAttempts" >= 0);
ALTER TABLE "market_cash_entries" ADD CONSTRAINT "market_cash_nonzero" CHECK ("amountMinor" <> 0 AND "currency" ~ '^[A-Z]{3}$');
ALTER TABLE "market_reviews" ADD CONSTRAINT "market_review_rating_valid" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "market_deliveries" ADD CONSTRAINT "market_delivery_revision_valid" CHECK ("orderRevision" > 0);

CREATE FUNCTION "market_prevent_history_rewrite"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'market_listing_versions' AND TG_OP = 'UPDATE' THEN
    IF NEW."payload" = OLD."payload" AND NEW."listingId" = OLD."listingId" AND NEW."version" = OLD."version" THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME = 'market_orders' AND TG_OP = 'UPDATE' THEN
    IF NEW."quote" = OLD."quote" AND NEW."totalMinor" = OLD."totalMinor" AND NEW."currency" = OLD."currency"
      AND NEW."buyerId" = OLD."buyerId" AND NEW."sellerId" = OLD."sellerId" AND NEW."listingId" = OLD."listingId"
      AND NEW."idempotencyKey" = OLD."idempotencyKey" AND NEW."requestHash" = OLD."requestHash" THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'market history is immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "market_offer_immutable" BEFORE UPDATE OR DELETE ON "market_listing_versions" FOR EACH ROW EXECUTE FUNCTION "market_prevent_history_rewrite"();
CREATE TRIGGER "market_order_quote_immutable" BEFORE UPDATE OR DELETE ON "market_orders" FOR EACH ROW EXECUTE FUNCTION "market_prevent_history_rewrite"();
CREATE TRIGGER "market_cash_immutable" BEFORE UPDATE OR DELETE ON "market_cash_entries" FOR EACH ROW EXECUTE FUNCTION "market_prevent_history_rewrite"();
CREATE TRIGGER "market_delivery_immutable" BEFORE UPDATE OR DELETE ON "market_deliveries" FOR EACH ROW EXECUTE FUNCTION "market_prevent_history_rewrite"();
CREATE TRIGGER "market_provider_event_immutable" BEFORE UPDATE OR DELETE ON "market_payment_events" FOR EACH ROW EXECUTE FUNCTION "market_prevent_history_rewrite"();

-- Deferred until commit so all postings in a journal can be inserted together.
CREATE FUNCTION "market_check_journal_balance"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT SUM("amountMinor") FROM "market_cash_entries" WHERE "orderId" = NEW."orderId" AND "journalKey" = NEW."journalKey") <> 0
    OR (SELECT COUNT(DISTINCT "currency") FROM "market_cash_entries" WHERE "orderId" = NEW."orderId" AND "journalKey" = NEW."journalKey") <> 1 THEN
    RAISE EXCEPTION 'market journal is unbalanced' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "market_journal_balanced" AFTER INSERT ON "market_cash_entries"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "market_check_journal_balance"();
