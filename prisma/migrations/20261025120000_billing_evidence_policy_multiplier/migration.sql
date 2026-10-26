-- Retail multipliers are owned by ANS_MODEL_BILLING_POLICY (PR #203). The
-- evidence guard still pinned deepseek/claude to 1x and GPT to 0.16x, so once
-- the policy priced deepseek-v4.1-flash at 1.5x every VERIFIED receipt was
-- rejected with API_BILLING_SNAPSHOT_INVALID: replies returned, settlement
-- failed, and the reservation stayed UNCERTAIN forever.
-- The guard keeps every structural, range and arithmetic check; only the two
-- hardcoded retail-multiplier pins are removed. Receipts still must equal the
-- request's own frozen snapshot, so a multiplier cannot change after quoting.
BEGIN;
SET LOCAL lock_timeout = '10s';
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
