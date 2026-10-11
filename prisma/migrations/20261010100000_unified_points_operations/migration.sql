ALTER TABLE market_orders ADD COLUMN "paymentMethod" VARCHAR(10) NOT NULL DEFAULT 'CASH' CHECK ("paymentMethod" IN ('CASH','POINTS'));
CREATE TABLE "quota_operations" (
 "id" TEXT PRIMARY KEY, "operationKey" VARCHAR(160) NOT NULL UNIQUE,
 "requestHash" VARCHAR(64) NOT NULL, "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "kind" VARCHAR(30) NOT NULL CHECK ("kind" IN ('GRANT','ADJUST','TOP_UP')),
 "amount" NUMERIC(24,6) NOT NULL CHECK ("amount" <> 0),
 "balanceAfter" NUMERIC(24,6) NOT NULL CHECK ("balanceAfter" >= 0),
 "evidenceRef" VARCHAR(200), "note" VARCHAR(1000) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT quota_operation_credit_positive CHECK ("kind" = 'ADJUST' OR "amount" > 0),
 CONSTRAINT quota_operation_evidence CHECK ("kind" <> 'TOP_UP' OR ("evidenceRef" IS NOT NULL AND length("evidenceRef") > 0))
);
CREATE INDEX quota_operations_user_created ON quota_operations("userId", "createdAt");
CREATE UNIQUE INDEX quota_operations_receipt_unique ON quota_operations("evidenceRef") WHERE "kind" = 'TOP_UP';
CREATE TABLE "market_points_escrows" (
 "orderId" TEXT PRIMARY KEY REFERENCES market_orders(id) ON DELETE RESTRICT,
 "amount" NUMERIC(24,6) NOT NULL CHECK ("amount" > 0),
 "sellerPoints" NUMERIC(24,6) NOT NULL CHECK ("sellerPoints" >= 0),
 "feePoints" NUMERIC(24,6) NOT NULL CHECK ("feePoints" >= 0),
 "state" VARCHAR(20) NOT NULL CHECK ("state" IN ('HELD','SETTLED','REFUNDED')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "settledAt" TIMESTAMP(3), "refundedAt" TIMESTAMP(3),
 CONSTRAINT market_points_split CHECK ("amount" = "sellerPoints" + "feePoints"),
 CONSTRAINT market_points_terminal CHECK (
   ("state"='HELD' AND "settledAt" IS NULL AND "refundedAt" IS NULL) OR
   ("state"='SETTLED' AND "settledAt" IS NOT NULL AND "refundedAt" IS NULL) OR
   ("state"='REFUNDED' AND "refundedAt" IS NOT NULL))
);
ALTER TABLE users ADD CONSTRAINT users_credit_nonnegative CHECK ("quotaPoints" >= 0) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_credit_nonnegative;
CREATE FUNCTION ans_credit_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ANS credit history is immutable'; END $$;
CREATE TRIGGER quota_ledger_immutable BEFORE UPDATE OR DELETE ON quota_ledgers FOR EACH ROW EXECUTE FUNCTION ans_credit_history_immutable();
CREATE TRIGGER quota_operation_immutable BEFORE UPDATE OR DELETE ON quota_operations FOR EACH ROW EXECUTE FUNCTION ans_credit_history_immutable();
CREATE FUNCTION ans_escrow_transition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR NEW."orderId"<>OLD."orderId" OR NEW.amount<>OLD.amount
 OR NEW."sellerPoints"<>OLD."sellerPoints" OR NEW."feePoints"<>OLD."feePoints"
 OR NEW."createdAt"<>OLD."createdAt" OR OLD.state='REFUNDED'
 OR (OLD.state='SETTLED' AND NEW.state<>'REFUNDED')
 OR (OLD.state='HELD' AND NEW.state NOT IN ('SETTLED','REFUNDED')) THEN
 RAISE EXCEPTION 'Invalid escrow transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_points_guard BEFORE UPDATE OR DELETE ON market_points_escrows FOR EACH ROW EXECUTE FUNCTION ans_escrow_transition_guard();

CREATE FUNCTION ans_order_payment_method_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW."paymentMethod"<>OLD."paymentMethod" THEN RAISE EXCEPTION 'Order payment method immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER market_order_method_guard BEFORE UPDATE ON market_orders FOR EACH ROW EXECUTE FUNCTION ans_order_payment_method_guard();
