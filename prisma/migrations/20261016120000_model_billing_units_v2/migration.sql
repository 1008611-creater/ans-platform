-- Forward-only compatibility: historical receipts retain USD-credit=point semantics.
-- New request snapshots convert USD list cost -> CNY -> ANS points, and are
-- already protected by API_COMPUTE_QUOTE_IMMUTABLE. No historical row is rewritten.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE "api_compute_requests" DROP CONSTRAINT "api_compute_request_quote_valid";
ALTER TABLE "api_compute_requests" ADD CONSTRAINT "api_compute_request_quote_valid" CHECK (COALESCE(
  "requestHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("price") = 'object' AND (
    ("provider" = 'apic-codex' AND "modelId" IN ('deepseek-v4.1-flash','gpt-6-astra','gpt-6.1-sol')
     AND "maxUnits" BETWEEN 1 AND 16384 AND "authorizedPoints" > 0 AND "authorizedPoints" <= 10 AND NOT ("price" ? 'billing'))
    OR
    ("provider" = 'apic-codex' AND "modelId" IN ('deepseek-v4.1-flash','gpt-6-astra','gpt-6.1-sol','claude-opus-5-5')
     AND "maxUnits" BETWEEN 1 AND CASE WHEN "modelId"='claude-opus-5-5' THEN 8192 ELSE 16384 END
     AND "authorizedPoints">0 AND "authorizedPoints"<=10000
     AND "price"->'billing'->>'version'='usd-cny-points-v2'
     AND "price"->'billing'->>'modelId'="modelId"
     AND jsonb_typeof("price"->'billing'->'requestMaxPoints')='number'
     AND ("price"->'billing'->>'requestMaxPoints')::numeric BETWEEN 0.000001 AND 10000
     AND "authorizedPoints"<=("price"->'billing'->>'requestMaxPoints')::numeric)
    OR
    ("provider" = 'mimo-tts' AND "modelId" = 'mimo-v2.5-tts' AND "maxUnits" BETWEEN 1 AND 1200
     AND "authorizedPoints" = 0 AND "policyVersion" ~ '^mimo-tts-free-reviewed-[0-9]{8}-v[0-9]+$'
     AND "idempotencyKey" ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
     AND "price"->>'mode' = 'free' AND "price"->'points' = '0'::jsonb
     AND "price"->'providerListedPrice' = '0'::jsonb AND "price"->>'version' = "policyVersion"
     AND "price"->>'source' = 'https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go'
     AND "price"->>'voice' = 'Chloe' AND "price"->>'unit' = 'unicode-character'
     AND jsonb_typeof("price"->'checkedAt') = 'string' AND jsonb_typeof("price"->'reviewBy') = 'string')
  ), false));

-- Keep legacy terminal limits; v2 may settle up to its immutable authorized
-- points, including expensive native models. Free TTS retains its old branch.
ALTER TABLE "api_compute_requests" DROP CONSTRAINT "api_compute_request_state_valid";
ALTER TABLE "api_compute_requests" ADD CONSTRAINT "api_compute_request_state_valid" CHECK (COALESCE(
 ("state" IN ('RUNNING','UNCERTAIN') AND "settledPoints" IS NULL AND "finishedAt" IS NULL AND "startedAt" IS NOT NULL) OR
 ("state" IN ('SETTLED','RELEASED') AND "settledPoints" IS NOT NULL AND "settledPoints">=0
  AND ((NOT ("price" ? 'billing') AND "settledPoints"<=10) OR
       ("price"->'billing'->>'version'='usd-cny-points-v2' AND "settledPoints"<="authorizedPoints"))
  AND "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND ("state"<>'RELEASED' OR "settledPoints"=0))
,false));

ALTER TABLE api_compute_billing_evidence DROP CONSTRAINT api_compute_billing_evidence_valid;
ALTER TABLE api_compute_billing_evidence ADD CONSTRAINT api_compute_billing_evidence_valid CHECK(COALESCE(
 (kind='VERIFIED' AND "upstreamRequestId" IS NOT NULL AND "upstreamRequestId" ~ '^[A-Za-z0-9_-]{8,128}$'
  AND "upstreamQuota" IS NOT NULL AND "upstreamQuota" BETWEEN 0 AND 500000000
  AND "upstreamPoints" IS NOT NULL AND "upstreamPoints">=0 AND "billedPoints">=0 AND "billedPoints"<="upstreamPoints"
  AND "platformCoveredPoints" IS NOT NULL AND "platformCoveredPoints"="upstreamPoints"-"billedPoints"
  AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NULL)
 OR (kind='REJECTED' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0
  AND "rejectedUpstreamStatus" IS NOT NULL AND "rejectedUpstreamStatus" IN (400,401,403,404,422,429) AND "actorId" IS NULL)
 OR (kind='WAIVER' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0
  AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NOT NULL AND length(btrim("actorId"))>0)
,false));

CREATE OR REPLACE FUNCTION ans_guard_api_billing_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task_ api_compute_requests%ROWTYPE; actor_ users%ROWTYPE; snapshot_ jsonb;
 expected_ numeric; fx_ numeric; consumption_ numeric; receipt_ numeric;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'API_BILLING_EVIDENCE_IMMUTABLE'; END IF;
 SELECT * INTO task_ FROM api_compute_requests WHERE id=NEW."requestId";
 IF NOT FOUND OR task_."userId"<>NEW."ownerId" OR task_.provider<>'apic-codex' OR task_."policyVersion"<>NEW."policyVersion"
  OR task_.state NOT IN ('RUNNING','UNCERTAIN') OR NEW."billedPoints">task_."authorizedPoints" THEN
  RAISE EXCEPTION 'API_BILLING_EVIDENCE_REFERENCE_INVALID';
 END IF;
 IF NEW.kind='VERIFIED' THEN
  snapshot_:=task_.price->'billing';
  IF NOT (task_.price ? 'billing') THEN
   expected_:=NEW."upstreamQuota"::numeric/500000;
  ELSE
   IF NOT COALESCE(jsonb_typeof(snapshot_)='object' AND snapshot_->>'version'='usd-cny-points-v2'
    AND snapshot_->>'modelId'=task_."modelId" AND snapshot_->>'pointsPerCny'='10'
    AND jsonb_typeof(snapshot_->'fx'->'usdCny')='number'
    AND jsonb_typeof(snapshot_->'consumptionMultiplier')='number'
    AND jsonb_typeof(snapshot_->'receiptConsumptionMultiplier')='number'
    AND jsonb_typeof(snapshot_->'procurementMultiplier')='number'
    AND jsonb_typeof(snapshot_->'requestMaxPoints')='number'
    AND (snapshot_->>'requestMaxPoints')::numeric BETWEEN 0.000001 AND 10000
    AND task_."authorizedPoints"<=(snapshot_->>'requestMaxPoints')::numeric
    AND length(snapshot_->>'configVersion') BETWEEN 1 AND 80
    AND snapshot_->'fx'->>'source' ~ '^https://[^/?#@]+(/[^?#]*)?$'
    AND snapshot_->'priceEvidence'->>'source' ~ '^https://[^/?#@]+(/[^?#]*)?$'
    AND snapshot_->'receiptEvidence'->>'source' ~ '^https://[^/?#@]+(/[^?#]*)?$'
    AND (snapshot_->'fx'->>'observedAt')::timestamptz IS NOT NULL
    AND (snapshot_->'priceEvidence'->>'observedAt')::timestamptz IS NOT NULL
    AND (snapshot_->'receiptEvidence'->>'observedAt')::timestamptz IS NOT NULL, false) THEN
    RAISE EXCEPTION 'API_BILLING_SNAPSHOT_INVALID';
   END IF;
   fx_:=(snapshot_->'fx'->>'usdCny')::numeric;
   consumption_:=(snapshot_->>'consumptionMultiplier')::numeric;
   receipt_:=(snapshot_->>'receiptConsumptionMultiplier')::numeric;
   IF fx_<=0 OR fx_>100 OR consumption_<=0 OR receipt_<=0 OR receipt_>1000000
    OR round(fx_,6)<>fx_ OR round(consumption_,6)<>consumption_ OR round(receipt_,6)<>receipt_
    OR (snapshot_->>'procurementMultiplier')::numeric<=0
    OR (task_."modelId"='claude-opus-5-5' AND (snapshot_->>'procurementMultiplier')::numeric<>0.8)
    OR (task_."modelId" IN ('gpt-6-astra','gpt-6.1-sol') AND consumption_<>0.16)
    OR (task_."modelId" IN ('deepseek-v4.1-flash','claude-opus-5-5') AND consumption_<>1)
    OR task_."modelId" NOT IN ('gpt-6-astra','gpt-6.1-sol','deepseek-v4.1-flash','claude-opus-5-5') THEN
    RAISE EXCEPTION 'API_BILLING_SNAPSHOT_INVALID';
   END IF;
   expected_:=ceil(NEW."upstreamQuota"::numeric/500000/receipt_*fx_*10*consumption_*1000000)/1000000;
  END IF;
  IF expected_ IS NULL OR NEW."upstreamPoints" IS DISTINCT FROM expected_ THEN
   RAISE EXCEPTION 'API_BILLING_RECEIPT_UNITS_INVALID';
  END IF;
 END IF;
 IF NEW.kind='WAIVER' THEN
  SELECT * INTO actor_ FROM users WHERE id=NEW."actorId";
  IF NOT FOUND OR actor_.role<>'ADMIN' OR actor_.flagged OR actor_."deletedAt" IS NOT NULL
   OR (jsonb_typeof(actor_."adminPermissions")='array' AND NOT (actor_."adminPermissions" ? 'USERS_MANAGE')) THEN
   RAISE EXCEPTION 'API_BILLING_WAIVER_ACTOR_INVALID';
  END IF;
 END IF;
 RETURN NEW;
END $$;

COMMIT;
