BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE TABLE compute_benefit_questionnaires (
  "userId" text PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  version text NOT NULL CHECK (version='onboarding-v1'),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers)='object'),
  "submittedAt" timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE compute_benefit_applications (
  id uuid PRIMARY KEY, "userId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "campaignId" text NOT NULL CHECK ("campaignId"='ans-agrihackathon-2026-v1'),
  "competitionId" text NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  version text NOT NULL CHECK (version='agri-v1'), answers jsonb NOT NULL CHECK (jsonb_typeof(answers)='object'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  "submittedAt" timestamptz NOT NULL DEFAULT clock_timestamp(), "reviewedAt" timestamptz,
  "reviewerId" text REFERENCES users(id) ON DELETE RESTRICT, "reviewNote" text,
  UNIQUE("userId","campaignId"), UNIQUE(id,"userId"),
  CHECK (COALESCE((status='PENDING' AND "reviewedAt" IS NULL AND "reviewerId" IS NULL AND "reviewNote" IS NULL)
    OR (status IN ('APPROVED','REJECTED') AND "reviewedAt" IS NOT NULL AND "reviewerId" IS NOT NULL AND "reviewNote" IS NOT NULL AND length("reviewNote") BETWEEN 2 AND 1000),false))
);
CREATE INDEX compute_benefit_applications_pending ON compute_benefit_applications(status,"submittedAt");
CREATE TABLE compute_benefit_review_events (
  id uuid PRIMARY KEY, "applicationId" uuid NOT NULL REFERENCES compute_benefit_applications(id) ON DELETE RESTRICT,
  "actorId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT, revision integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')), note text NOT NULL CHECK(length(note) BETWEEN 2 AND 1000),
  "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE("applicationId",revision)
);
CREATE TABLE compute_benefit_grants (
  id uuid PRIMARY KEY, "userId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "campaignId" text NOT NULL, kind text NOT NULL,
  "applicationId" uuid, "modelIds" text[] NOT NULL, "policyVersion" text NOT NULL CHECK ("policyVersion"='official-usd-gift-v1'),
  "totalUsdMicros" bigint NOT NULL, "usedUsdMicros" bigint NOT NULL DEFAULT 0, "reservedUsdMicros" bigint NOT NULL DEFAULT 0,
  "grantedAt" timestamptz NOT NULL DEFAULT clock_timestamp(), "expiresAt" timestamptz NOT NULL,
  UNIQUE("userId","campaignId",kind), UNIQUE(id,"userId"),
  FOREIGN KEY("applicationId","userId") REFERENCES compute_benefit_applications(id,"userId") ON DELETE RESTRICT,
  CHECK("expiresAt"="grantedAt"+interval '720 hours'),
  CHECK("usedUsdMicros">=0 AND "reservedUsdMicros">=0 AND "usedUsdMicros"+"reservedUsdMicros"<="totalUsdMicros"),
  CHECK(COALESCE((kind='DEEPSEEK_ONBOARDING' AND "campaignId"='ans-onboarding-2026-v1' AND "totalUsdMicros"=1000000000 AND "applicationId" IS NULL AND "modelIds"=ARRAY['deepseek-v4.1-flash'])
    OR (kind='TERRA_AGRI' AND "campaignId"='ans-agrihackathon-2026-v1' AND "totalUsdMicros"=300000000 AND "applicationId" IS NOT NULL AND "modelIds"=ARRAY['gpt-5.6-terra'])
    OR (kind='GPT_AGRI' AND "campaignId"='ans-agrihackathon-2026-v1' AND "totalUsdMicros"=200000000 AND "applicationId" IS NOT NULL AND "modelIds"=ARRAY['gpt-6-astra','gpt-6.1-sol'])
    OR (kind='OPUS_AGRI' AND "campaignId"='ans-agrihackathon-2026-v1' AND "totalUsdMicros"=100000000 AND "applicationId" IS NOT NULL AND "modelIds"=ARRAY['claude-opus-5-5']),false))
);
CREATE INDEX compute_benefit_grants_owner ON compute_benefit_grants("userId","expiresAt");
CREATE TABLE compute_benefit_reservations (
  "requestId" text PRIMARY KEY, "grantId" uuid NOT NULL, "userId" text NOT NULL,
  "modelId" text NOT NULL, "policyVersion" text NOT NULL CHECK("policyVersion"='official-usd-gift-v1'),
  "reservedUsdMicros" bigint NOT NULL CHECK("reservedUsdMicros">0),
  "actualUsdMicros" bigint, "chargedUsdMicros" bigint, "platformUsdMicros" bigint,
  state text NOT NULL DEFAULT 'RESERVED' CHECK(state IN ('RESERVED','SETTLED','RELEASED')),
  "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp(), "completedAt" timestamptz,
  FOREIGN KEY("grantId","userId") REFERENCES compute_benefit_grants(id,"userId") ON DELETE RESTRICT,
  CHECK(COALESCE((state='RESERVED' AND "actualUsdMicros" IS NULL AND "chargedUsdMicros" IS NULL AND "platformUsdMicros" IS NULL AND "completedAt" IS NULL)
    OR (state='SETTLED' AND "actualUsdMicros" IS NOT NULL AND "chargedUsdMicros" IS NOT NULL AND "platformUsdMicros" IS NOT NULL AND "actualUsdMicros">=0 AND "chargedUsdMicros"=LEAST("actualUsdMicros","reservedUsdMicros") AND "platformUsdMicros"="actualUsdMicros"-"chargedUsdMicros" AND "completedAt" IS NOT NULL)
    OR (state='RELEASED' AND "actualUsdMicros" IS NOT NULL AND "chargedUsdMicros" IS NOT NULL AND "platformUsdMicros" IS NOT NULL AND "actualUsdMicros"=0 AND "chargedUsdMicros"=0 AND "platformUsdMicros"=0 AND "completedAt" IS NOT NULL),false))
);
CREATE INDEX compute_benefit_reservations_owner ON compute_benefit_reservations("userId","createdAt" DESC);
CREATE FUNCTION compute_benefit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_DELETE_FORBIDDEN'; END IF;
 IF TG_TABLE_NAME IN ('compute_benefit_questionnaires','compute_benefit_review_events') THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_RECORD_IMMUTABLE'; END IF;
 IF TG_TABLE_NAME='compute_benefit_grants' THEN
   IF (to_jsonb(NEW)-'usedUsdMicros'-'reservedUsdMicros') IS DISTINCT FROM (to_jsonb(OLD)-'usedUsdMicros'-'reservedUsdMicros') THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_GRANT_IMMUTABLE'; END IF;
 ELSIF TG_TABLE_NAME='compute_benefit_reservations' THEN
   IF OLD.state<>'RESERVED' OR (to_jsonb(NEW)-'state'-'actualUsdMicros'-'chargedUsdMicros'-'platformUsdMicros'-'completedAt') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'actualUsdMicros'-'chargedUsdMicros'-'platformUsdMicros'-'completedAt') THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_RESERVATION_IMMUTABLE'; END IF;
 ELSIF TG_TABLE_NAME='compute_benefit_applications' THEN
   IF NEW.id<>OLD.id OR NEW."userId"<>OLD."userId" OR NEW."campaignId"<>OLD."campaignId" OR NEW."competitionId"<>OLD."competitionId" OR NEW.version<>OLD.version OR OLD.status='APPROVED' OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_APPLICATION_IMMUTABLE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER compute_benefit_questionnaires_immutable BEFORE UPDATE OR DELETE ON compute_benefit_questionnaires FOR EACH ROW EXECUTE FUNCTION compute_benefit_immutable();
CREATE TRIGGER compute_benefit_review_events_immutable BEFORE UPDATE OR DELETE ON compute_benefit_review_events FOR EACH ROW EXECUTE FUNCTION compute_benefit_immutable();
CREATE TRIGGER compute_benefit_grants_immutable BEFORE UPDATE OR DELETE ON compute_benefit_grants FOR EACH ROW EXECUTE FUNCTION compute_benefit_immutable();
CREATE TRIGGER compute_benefit_reservations_immutable BEFORE UPDATE OR DELETE ON compute_benefit_reservations FOR EACH ROW EXECUTE FUNCTION compute_benefit_immutable();
CREATE TRIGGER compute_benefit_applications_immutable BEFORE UPDATE OR DELETE ON compute_benefit_applications FOR EACH ROW EXECUTE FUNCTION compute_benefit_immutable();
CREATE FUNCTION compute_benefit_proof_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='compute_benefit_grants' THEN
   IF NEW.kind='DEEPSEEK_ONBOARDING' THEN
     IF NOT EXISTS(SELECT 1 FROM compute_benefit_questionnaires WHERE "userId"=NEW."userId") THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_QUESTIONNAIRE_REQUIRED'; END IF;
   ELSIF NOT EXISTS(SELECT 1 FROM compute_benefit_applications a JOIN compute_benefit_review_events e ON e."applicationId"=a.id
      AND e.revision=a.revision-1 AND e.decision='APPROVED' AND e."actorId"=a."reviewerId" AND e.note=a."reviewNote"
      WHERE a.id=NEW."applicationId" AND a."userId"=NEW."userId" AND a.status='APPROVED') THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_APPROVAL_REQUIRED'; END IF;
 ELSIF TG_TABLE_NAME='compute_benefit_review_events' THEN
   IF NOT EXISTS(SELECT 1 FROM users u JOIN compute_benefit_applications a ON a.id=NEW."applicationId"
      WHERE u.id=NEW."actorId" AND u.role='ADMIN' AND NOT u.flagged AND u."deletedAt" IS NULL
      AND (jsonb_typeof(u."adminPermissions") IS DISTINCT FROM 'array' OR u."adminPermissions" ? 'USERS_MANAGE')
      AND a."reviewerId"=u.id AND a.revision=NEW.revision+1 AND a.status=NEW.decision AND a."reviewNote"=NEW.note)
   THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_REVIEW_INVALID'; END IF;
 ELSIF TG_TABLE_NAME='compute_benefit_reservations' THEN
   IF NOT EXISTS(SELECT 1 FROM compute_benefit_grants WHERE id=NEW."grantId" AND "userId"=NEW."userId" AND NEW."modelId"=ANY("modelIds") AND "expiresAt">clock_timestamp()) THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_GRANT_UNAVAILABLE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER compute_benefit_review_proof BEFORE INSERT ON compute_benefit_review_events FOR EACH ROW EXECUTE FUNCTION compute_benefit_proof_guard();
CREATE TRIGGER compute_benefit_grant_proof BEFORE INSERT ON compute_benefit_grants FOR EACH ROW EXECUTE FUNCTION compute_benefit_proof_guard();
CREATE TRIGGER compute_benefit_reservation_proof BEFORE INSERT ON compute_benefit_reservations FOR EACH ROW EXECUTE FUNCTION compute_benefit_proof_guard();
CREATE FUNCTION compute_benefit_conservation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE gid uuid; actual_reserved bigint; actual_used bigint; recorded_reserved bigint; recorded_used bigint;
BEGIN
 gid := (CASE WHEN TG_TABLE_NAME='compute_benefit_grants' THEN to_jsonb(NEW)->>'id' ELSE to_jsonb(NEW)->>'grantId' END)::uuid;
 SELECT "reservedUsdMicros","usedUsdMicros" INTO recorded_reserved,recorded_used FROM compute_benefit_grants WHERE id=gid;
 SELECT COALESCE(SUM(CASE WHEN state='RESERVED' THEN "reservedUsdMicros" ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN state='SETTLED' THEN "chargedUsdMicros" ELSE 0 END),0)
 INTO actual_reserved,actual_used FROM compute_benefit_reservations WHERE "grantId"=gid;
 IF recorded_reserved IS DISTINCT FROM actual_reserved OR recorded_used IS DISTINCT FROM actual_used THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_CONSERVATION_VIOLATION'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER compute_benefit_grant_conservation AFTER INSERT OR UPDATE ON compute_benefit_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION compute_benefit_conservation_guard();
CREATE CONSTRAINT TRIGGER compute_benefit_reservation_conservation AFTER INSERT OR UPDATE ON compute_benefit_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION compute_benefit_conservation_guard();
-- Every gift hold is bound to the existing authoritative gateway request at commit.
-- This is deferred because the hold is allocated before the immutable quote is inserted.
CREATE FUNCTION compute_benefit_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r compute_benefit_reservations; q api_compute_requests; e api_compute_billing_evidence; rid text; receipt_ numeric; expected_ numeric;
BEGIN
 rid := CASE WHEN TG_TABLE_NAME='api_compute_requests' THEN to_jsonb(NEW)->>'id' ELSE to_jsonb(NEW)->>'requestId' END;
 SELECT * INTO r FROM compute_benefit_reservations WHERE "requestId"=rid;
 SELECT * INTO q FROM api_compute_requests WHERE id=rid;
 IF r."requestId" IS NULL AND NOT COALESCE(q.price ? 'benefitFunding',false) THEN RETURN NULL; END IF;
 IF r."requestId" IS NULL THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_REQUEST_MISSING'; END IF;
 IF NOT COALESCE(q.id IS NOT NULL AND q."userId"=r."userId" AND q."modelId"=r."modelId" AND q.provider='apic-codex'
 AND q.price->'benefitFunding'->>'version'='official-usd-gift-v1'
 AND q.price->'benefitFunding'->>'grantId'=r."grantId"::text
 AND q.price->'benefitFunding'->>'reservedUsdMicros'=r."reservedUsdMicros"::text
 AND ((r.state='RESERVED' AND q.state::text IN ('RUNNING','UNCERTAIN'))
   OR (r.state='SETTLED' AND q.state::text='SETTLED' AND q."settledPoints"=0)
   OR (r.state='RELEASED' AND q.state::text='RELEASED' AND q."settledPoints"=0)),false)
 THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_REQUEST_MISMATCH'; END IF;
 IF r.state IN ('SETTLED','RELEASED') THEN
   SELECT * INTO e FROM api_compute_billing_evidence WHERE "requestId"=rid;
   IF e.id IS NULL OR e."ownerId" IS DISTINCT FROM r."userId" OR e."billedPoints" IS DISTINCT FROM 0::numeric THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_EVIDENCE_REQUIRED'; END IF;
   IF r.state='SETTLED' THEN
     IF e.kind IS DISTINCT FROM 'VERIFIED' OR e."upstreamQuota" IS NULL THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_VERIFIED_REQUIRED'; END IF;
     -- Evidence insertion already validates the immutable complete billing snapshot.
     receipt_:=(q.price->'billing'->>'receiptConsumptionMultiplier')::numeric;
     IF receipt_ IS NULL OR receipt_<=0 OR receipt_>1000000 OR round(receipt_,6)<>receipt_ THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_RECEIPT_INVALID'; END IF;
     expected_:=ceil(e."upstreamQuota"::numeric/500000/receipt_*1000000);
     IF r."actualUsdMicros" IS DISTINCT FROM expected_ THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_RECEIPT_AMOUNT_INVALID'; END IF;
   ELSIF e.kind IS DISTINCT FROM 'REJECTED' AND e.kind IS DISTINCT FROM 'WAIVER' THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_NONEXECUTION_REQUIRED';
   ELSIF e.kind='WAIVER' AND NOT EXISTS(SELECT 1 FROM audit_logs WHERE "actorId"=e."actorId" AND action='API_COMPUTE_OPERATOR_WAIVER' AND "resourceType"='api_compute_request' AND "resourceId"=rid) THEN RAISE EXCEPTION 'COMPUTE_BENEFIT_WAIVER_AUDIT_REQUIRED';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER compute_benefit_request_binding AFTER INSERT OR UPDATE ON compute_benefit_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION compute_benefit_request_guard();
CREATE CONSTRAINT TRIGGER compute_benefit_gateway_binding AFTER INSERT OR UPDATE ON api_compute_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION compute_benefit_request_guard();
COMMIT;
