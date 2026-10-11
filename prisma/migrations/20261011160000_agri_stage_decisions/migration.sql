-- Additive decisions only. No competition, accounts, dates or decisions are seeded.
CREATE TABLE agri_final_decisions (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 "teamCompetitionId" TEXT NOT NULL, sequence INTEGER NOT NULL, state VARCHAR(16) NOT NULL,
 reason TEXT NOT NULL, "sourceReference" TEXT NOT NULL, "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "decidedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("teamCompetitionId","competitionId") REFERENCES team_competitions(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE ("teamCompetitionId",sequence), CHECK (sequence>0 AND state IN ('ELIGIBLE','INELIGIBLE') AND length(reason) BETWEEN 1 AND 2000 AND length("sourceReference") BETWEEN 1 AND 2000)
);
CREATE TABLE agri_correction_permits (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "previousSubmissionId" TEXT NOT NULL,
 "ruleVersionId" TEXT NOT NULL, "allowedFields" TEXT[] NOT NULL, reason TEXT NOT NULL,
 "authorizedById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "authorizedAt" TIMESTAMPTZ(3) NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("entryStageId","competitionId") REFERENCES agri_entry_stages(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("previousSubmissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("ruleVersionId","competitionId") REFERENCES agri_rule_versions(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE (id,"entryStageId","competitionId"), CHECK ("expiresAt">"authorizedAt" AND cardinality("allowedFields") BETWEEN 1 AND 5
 AND "allowedFields" <@ ARRAY['artifactVersionId','repository','demoUrl','summary','materials']::TEXT[] AND length(reason) BETWEEN 1 AND 2000)
);
CREATE TABLE agri_correction_permit_events (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "permitId" TEXT NOT NULL UNIQUE,
 action VARCHAR(16) NOT NULL, "submissionId" TEXT, "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("permitId","entryStageId","competitionId") REFERENCES agri_correction_permits(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE ("permitId","entryStageId","competitionId"), CHECK (length(reason) BETWEEN 1 AND 2000 AND ((action='REVOKE' AND "submissionId" IS NULL) OR (action='USE' AND "submissionId" IS NOT NULL)))
);
CREATE TABLE agri_submission_corrections (
 "submissionId" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "previousSubmissionId" TEXT NOT NULL, "permitId" TEXT NOT NULL UNIQUE,
 FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("previousSubmissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("permitId","entryStageId","competitionId") REFERENCES agri_correction_permits(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE ("submissionId","entryStageId","competitionId"), UNIQUE ("permitId","entryStageId","competitionId"), CHECK ("submissionId"<>"previousSubmissionId")
);
CREATE TABLE agri_decision_receipts (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, operation VARCHAR(32) NOT NULL,
 "idempotencyKey" VARCHAR(36) NOT NULL, "requestHash" VARCHAR(64) NOT NULL, "resourceId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 UNIQUE ("competitionId","actorId",operation,"idempotencyKey"), CHECK ("requestHash" ~ '^[a-f0-9]{64}$' AND operation IN ('recordFinalEligibility','issueCorrectionPermit','revokeCorrectionPermit'))
);
CREATE TRIGGER agri_final_decision_immutable BEFORE UPDATE OR DELETE ON agri_final_decisions FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_correction_permit_immutable BEFORE UPDATE OR DELETE ON agri_correction_permits FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_correction_permit_event_immutable BEFORE UPDATE OR DELETE ON agri_correction_permit_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_submission_correction_immutable BEFORE UPDATE OR DELETE ON agri_submission_corrections FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_decision_receipt_immutable BEFORE UPDATE OR DELETE ON agri_decision_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
-- Locate the exact old freeze check; fail instead of silently changing an unexpected schema.
DO $$ DECLARE constraint_name TEXT; matches INTEGER;
BEGIN
 SELECT count(*),min(conname) INTO matches,constraint_name FROM pg_constraint
 WHERE conrelid='agri_entry_stages'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%frozenSubmissionId%' AND pg_get_constraintdef(oid) LIKE '%currentSubmissionId%';
 IF matches<>1 THEN RAISE EXCEPTION 'AGRI_FREEZE_CONSTRAINT_UNEXPECTED'; END IF;
 EXECUTE format('ALTER TABLE agri_entry_stages DROP CONSTRAINT %I',constraint_name);
END $$;
ALTER TABLE agri_entry_stages ADD CONSTRAINT agri_stage_frozen_keeps_original CHECK ("frozenSubmissionId" IS NULL OR "currentSubmissionId" IS NOT NULL);
ALTER TABLE agri_submission_events DROP CONSTRAINT agri_submission_events_check;
ALTER TABLE agri_submission_events ADD CONSTRAINT agri_submission_events_check CHECK (revision>=2 AND ((action='saveDraft' AND "submissionId" IS NULL) OR (action IN ('submit','freezeStage','correctSubmission') AND "submissionId" IS NOT NULL)));
ALTER TABLE agri_submission_receipts DROP CONSTRAINT agri_submission_receipts_check;
ALTER TABLE agri_submission_receipts ADD CONSTRAINT agri_submission_receipts_check CHECK ("appliedRevision">=2 AND "requestHash" ~ '^[a-f0-9]{64}$' AND ((operation='saveDraft' AND "submissionId" IS NULL) OR (operation IN ('submit','correctSubmission') AND "submissionId" IS NOT NULL)));
CREATE OR REPLACE FUNCTION agri_stage_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_STAGE_DELETE_FORBIDDEN'; END IF;
 IF NEW.id<>OLD.id OR NEW."competitionId"<>OLD."competitionId" OR NEW."teamCompetitionId"<>OLD."teamCompetitionId" OR NEW.stage<>OLD.stage
 OR NEW."createdAt"<>OLD."createdAt" OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'AGRI_STAGE_REVISION_OR_FROZEN'; END IF;
 IF OLD."frozenSubmissionId" IS NOT NULL THEN
   IF NEW."frozenSubmissionId" IS DISTINCT FROM OLD."frozenSubmissionId" OR NEW.draft IS NOT NULL OR NOT EXISTS (
     SELECT 1 FROM agri_submission_corrections c JOIN agri_correction_permit_events e ON e."permitId"=c."permitId"
     WHERE c."submissionId"=NEW."currentSubmissionId" AND c."previousSubmissionId"=OLD."currentSubmissionId" AND c."entryStageId"=OLD.id AND c."competitionId"=OLD."competitionId" AND e.action='USE' AND e."submissionId"=c."submissionId")
   THEN RAISE EXCEPTION 'AGRI_STAGE_REVISION_OR_FROZEN'; END IF;
 END IF;
 IF OLD."frozenSubmissionId" IS NULL AND NEW."frozenSubmissionId" IS NOT NULL AND NEW."frozenSubmissionId" IS DISTINCT FROM NEW."currentSubmissionId" THEN
   IF NEW."frozenSubmissionId" IS DISTINCT FROM OLD."currentSubmissionId" OR NOT EXISTS (SELECT 1 FROM agri_submission_corrections WHERE "submissionId"=NEW."currentSubmissionId" AND "previousSubmissionId"=OLD."currentSubmissionId" AND "entryStageId"=OLD.id)
   THEN RAISE EXCEPTION 'AGRI_CORRECTION_CHAIN_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- Validate allowed fields, exact source/rule, author and terminal single-use event at transaction end.
CREATE FUNCTION agri_correction_integrity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c RECORD; p RECORD; old_sub RECORD; new_sub RECORD; changed TEXT[];
BEGIN
 SELECT * INTO c FROM agri_submission_corrections WHERE "permitId"=NEW."permitId";
 IF TG_TABLE_NAME='agri_correction_permit_events' THEN
   IF NEW.action='REVOKE' THEN
     IF c IS NOT NULL THEN RAISE EXCEPTION 'AGRI_REVOKED_PERMIT_USED'; END IF;
     RETURN NEW;
   END IF;
 END IF;
 IF c IS NULL THEN RAISE EXCEPTION 'AGRI_CORRECTION_CHAIN_REQUIRED'; END IF;
 SELECT * INTO p FROM agri_correction_permits WHERE id=c."permitId";
 SELECT * INTO old_sub FROM agri_stage_submissions WHERE id=c."previousSubmissionId";
 SELECT * INTO new_sub FROM agri_stage_submissions WHERE id=c."submissionId";
 IF p."previousSubmissionId"<>old_sub.id OR p."ruleVersionId"<>old_sub."ruleVersionId" OR new_sub."ruleVersionId"<>p."ruleVersionId" OR old_sub."projectId"<>new_sub."projectId" OR new_sub.sequence<>old_sub.sequence+1 OR new_sub."acceptedAt"<p."authorizedAt" OR new_sub."acceptedAt">=p."expiresAt"
 OR NOT EXISTS(SELECT 1 FROM agri_correction_permit_events e WHERE e."permitId"=p.id AND e.action='USE' AND e."submissionId"=new_sub.id AND e."actorId"=new_sub."submittedById")
 THEN RAISE EXCEPTION 'AGRI_CORRECTION_INTEGRITY_FAILED'; END IF;
 SELECT array_agg(field) INTO changed FROM (VALUES
 ('artifactVersionId',old_sub."artifactVersionId" IS DISTINCT FROM new_sub."artifactVersionId"),('repository',old_sub.repository IS DISTINCT FROM new_sub.repository),
 ('demoUrl',old_sub."demoUrl" IS DISTINCT FROM new_sub."demoUrl"),('summary',old_sub.summary IS DISTINCT FROM new_sub.summary),('materials',old_sub.materials IS DISTINCT FROM new_sub.materials)) AS fields(field,is_changed) WHERE is_changed;
 IF changed IS NULL OR NOT changed <@ p."allowedFields" THEN RAISE EXCEPTION 'AGRI_CORRECTION_FIELD_NOT_ALLOWED'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER agri_correction_chain_guard AFTER INSERT ON agri_submission_corrections DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_correction_integrity_guard();
CREATE CONSTRAINT TRIGGER agri_correction_use_guard AFTER INSERT ON agri_correction_permit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_correction_integrity_guard();
