-- Additive checks and feedback, with no new public/eligibility/XP behavior or seeded grants.
CREATE TABLE "agri_technical_checks" (
 "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "submissionId" TEXT NOT NULL,
 "result" VARCHAR(16) NOT NULL, "basis" VARCHAR(24) NOT NULL, "checklist" JSONB NOT NULL, "internalNote" TEXT,
 "checkedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "checkedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE ("id","competitionId"),
 CHECK ("result" IN ('PASS','NEEDS_ACTION','UNREACHABLE') AND "basis" IN ('METADATA','PRIVATE_MATERIALS')),
 CHECK ("internalNote" IS NULL OR length(btrim("internalNote")) BETWEEN 1 AND 4000),
 CHECK (jsonb_typeof("checklist")='object' AND COALESCE("checklist"->>'schemaVersion'='1',false)
   AND jsonb_typeof("checklist"->'items')='array' AND jsonb_array_length("checklist"->'items') BETWEEN 1 AND 30)
);
CREATE INDEX "agri_technical_checks_competitionId_submissionId_checkedAt_id_idx" ON "agri_technical_checks"("competitionId","submissionId","checkedAt","id");
CREATE TABLE "agri_check_feedback_events" (
 "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "checkId" TEXT NOT NULL, "sequence" INTEGER NOT NULL,
 "action" VARCHAR(16) NOT NULL, "body" TEXT, "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("checkId","competitionId") REFERENCES "agri_technical_checks"("id","competitionId") ON DELETE RESTRICT,
 UNIQUE ("checkId","sequence"), UNIQUE ("id","checkId","competitionId"),
 CHECK ("sequence">=1 AND (("action"='PUBLISH' AND "body" IS NOT NULL AND length(btrim("body")) BETWEEN 1 AND 4000)
   OR ("action"='WITHDRAW' AND "body" IS NULL)))
);
CREATE TABLE "agri_review_receipts" (
 "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "checkId" TEXT NOT NULL, "feedbackEventId" TEXT,
 "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "operation" VARCHAR(32) NOT NULL,
 "idempotencyKey" VARCHAR(36) NOT NULL, "requestHash" VARCHAR(64) NOT NULL, "appliedSequence" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("checkId","competitionId") REFERENCES "agri_technical_checks"("id","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("feedbackEventId","checkId","competitionId") REFERENCES "agri_check_feedback_events"("id","checkId","competitionId") ON DELETE RESTRICT,
 UNIQUE ("competitionId","actorId","operation","idempotencyKey"),
 CHECK ("requestHash" ~ '^[a-f0-9]{64}$' AND (("operation"='recordCheck' AND "feedbackEventId" IS NULL AND "appliedSequence"=0)
   OR ("operation" IN ('publishFeedback','withdrawFeedback') AND "feedbackEventId" IS NOT NULL AND "appliedSequence">=1)))
);
CREATE TRIGGER "agri_check_immutable" BEFORE UPDATE OR DELETE ON "agri_technical_checks" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_feedback_immutable" BEFORE UPDATE OR DELETE ON "agri_check_feedback_events" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_review_receipt_immutable" BEFORE UPDATE OR DELETE ON "agri_review_receipts" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE FUNCTION "agri_feedback_sequence_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last_sequence INTEGER; last_action TEXT;
BEGIN
 PERFORM 1 FROM "agri_technical_checks" WHERE id=NEW."checkId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 SELECT "sequence","action" INTO last_sequence,last_action FROM "agri_check_feedback_events" WHERE "checkId"=NEW."checkId" ORDER BY "sequence" DESC LIMIT 1;
 IF NEW."sequence"<>COALESCE(last_sequence,0)+1 OR (NEW."action"='WITHDRAW' AND last_action IS DISTINCT FROM 'PUBLISH')
 THEN RAISE EXCEPTION 'AGRI_FEEDBACK_SEQUENCE_INVALID'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_feedback_sequence_guard" BEFORE INSERT ON "agri_check_feedback_events" FOR EACH ROW EXECUTE FUNCTION "agri_feedback_sequence_guard"();
CREATE FUNCTION "agri_review_receipt_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."operation"='recordCheck' THEN
   IF NOT EXISTS (SELECT 1 FROM "agri_technical_checks" WHERE id=NEW."checkId" AND "competitionId"=NEW."competitionId" AND "checkedById"=NEW."actorId")
   THEN RAISE EXCEPTION 'AGRI_REVIEW_RECEIPT_MISMATCH'; END IF;
 ELSE
   IF NOT EXISTS (SELECT 1 FROM "agri_check_feedback_events" WHERE id=NEW."feedbackEventId" AND "checkId"=NEW."checkId" AND "competitionId"=NEW."competitionId"
     AND "actorId"=NEW."actorId" AND "sequence"=NEW."appliedSequence" AND "action"=CASE NEW."operation" WHEN 'publishFeedback' THEN 'PUBLISH' ELSE 'WITHDRAW' END)
   THEN RAISE EXCEPTION 'AGRI_REVIEW_RECEIPT_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_review_receipt_guard" BEFORE INSERT ON "agri_review_receipts" FOR EACH ROW EXECUTE FUNCTION "agri_review_receipt_guard"();
