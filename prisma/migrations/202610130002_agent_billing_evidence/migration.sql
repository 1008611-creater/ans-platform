-- Additive immutable-quote settlement evidence only. Preserve original quote/budget/state/wallet guards.
SET lock_timeout = '10s';
CREATE TABLE api_compute_billing_evidence (
 id TEXT PRIMARY KEY, "requestId" TEXT NOT NULL REFERENCES api_compute_requests(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('VERIFIED','REJECTED','WAIVER')),
 "upstreamRequestId" TEXT, "upstreamQuota" BIGINT, "upstreamPoints" NUMERIC(24,6), "billedPoints" NUMERIC(24,6) NOT NULL,
 "platformCoveredPoints" NUMERIC(24,6), "rejectedUpstreamStatus" INTEGER, "actorId" TEXT, "policyVersion" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT api_compute_billing_evidence_request_key UNIQUE("requestId"),
 CONSTRAINT api_compute_billing_evidence_valid CHECK(COALESCE(
  (kind='VERIFIED' AND "upstreamRequestId" IS NOT NULL AND "upstreamRequestId" ~ '^[A-Za-z0-9_-]{8,128}$' AND "upstreamQuota" IS NOT NULL AND "upstreamQuota" BETWEEN 0 AND 500000000
   AND "upstreamPoints" IS NOT NULL AND "upstreamPoints"="upstreamQuota"::numeric/500000 AND "billedPoints">=0 AND "billedPoints"<="upstreamPoints"
   AND "platformCoveredPoints" IS NOT NULL AND "platformCoveredPoints"="upstreamPoints"-"billedPoints" AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NULL)
  OR (kind='REJECTED' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0
   AND "rejectedUpstreamStatus" IS NOT NULL AND "rejectedUpstreamStatus" IN (400,401,403,404,422,429) AND "actorId" IS NULL)
  OR (kind='WAIVER' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0
   AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NOT NULL AND length(btrim("actorId"))>0)
 ,false))
);
CREATE INDEX api_compute_billing_evidence_owner_time_idx ON api_compute_billing_evidence("ownerId","createdAt",id);
CREATE FUNCTION ans_guard_api_billing_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task_ api_compute_requests%ROWTYPE; actor_ users%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'API_BILLING_EVIDENCE_IMMUTABLE'; END IF;
 SELECT * INTO task_ FROM api_compute_requests WHERE id=NEW."requestId";
 IF NOT FOUND OR task_."userId"<>NEW."ownerId" OR task_.provider<>'apic-codex' OR task_."policyVersion"<>NEW."policyVersion"
  OR task_.state NOT IN ('RUNNING','UNCERTAIN') OR NEW."billedPoints">task_."authorizedPoints" THEN
  RAISE EXCEPTION 'API_BILLING_EVIDENCE_REFERENCE_INVALID';
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
CREATE TRIGGER api_billing_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON api_compute_billing_evidence FOR EACH ROW EXECUTE FUNCTION ans_guard_api_billing_evidence();

-- At commit, terminal evidence and the final request must describe the same event.
-- Historical requests without evidence remain compatible; existing request guards stay intact.
CREATE FUNCTION ans_check_api_billing_pair() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_id_ TEXT; task_ api_compute_requests%ROWTYPE; evidence_ api_compute_billing_evidence%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='api_compute_billing_evidence' THEN request_id_:=NEW."requestId"; ELSE request_id_:=NEW.id; END IF;
 SELECT * INTO evidence_ FROM api_compute_billing_evidence WHERE "requestId"=request_id_;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO task_ FROM api_compute_requests WHERE id=request_id_;
 IF NOT FOUND OR task_."userId"<>evidence_."ownerId" OR task_.provider<>'apic-codex'
  OR task_."policyVersion"<>evidence_."policyVersion" OR task_."settledPoints" IS NULL
  OR task_."settledPoints"<>evidence_."billedPoints" OR task_."settledPoints">task_."authorizedPoints"
  OR (evidence_.kind='VERIFIED' AND (task_.state<>'SETTLED' OR task_.outcome IS DISTINCT FROM evidence_."upstreamRequestId"))
  OR (evidence_.kind IN ('REJECTED','WAIVER') AND (task_.state<>'RELEASED' OR task_."settledPoints"<>0))
  OR (evidence_.kind='REJECTED' AND evidence_."upstreamRequestId" IS NOT NULL AND task_.outcome IS DISTINCT FROM evidence_."upstreamRequestId") THEN
  RAISE EXCEPTION 'API_BILLING_TERMINAL_PAIR_INVALID';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER api_billing_evidence_terminal_pair AFTER INSERT ON api_compute_billing_evidence
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_check_api_billing_pair();
CREATE CONSTRAINT TRIGGER api_compute_request_billing_pair AFTER UPDATE ON api_compute_requests
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_check_api_billing_pair();
