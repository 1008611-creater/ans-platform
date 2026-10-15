BEGIN;
-- Preserve the original six-table migration checksum. Extend the request state only.
ALTER TABLE agri_evidence_requests DROP CONSTRAINT agri_evidence_request_check;
ALTER TABLE agri_evidence_requests ADD CONSTRAINT agri_evidence_request_check CHECK (
 revision BETWEEN 1 AND 2147483646 AND attempt BETWEEN 0 AND 3 AND "maxAttempts"=3 AND "maxBytes">0 AND "storedBytes" BETWEEN 0 AND "maxBytes"
 AND mode IN ('UPLOAD','GITHUB_ARCHIVE','ALLOWED_HTTP_CAPTURE') AND kind IN ('REPOSITORY','DEMO_DOCUMENT','DEMO_VIDEO','SUPPORTING_FILE')
 AND authority IN ('TEAM','STAFF') AND state IN ('PREPARED','QUEUED','RUNNING','UPLOADED','RESOLVED','STORED','RETRY_WAIT','FAILED','CANCELLED','NEEDS_REVIEW')
 AND (("bindingState"='PREPARED' AND "submissionId" IS NULL AND "expiresAt" IS NOT NULL AND mode IN ('UPLOAD','GITHUB_ARCHIVE')) OR ("bindingState"='BOUND' AND "submissionId" IS NOT NULL))
 AND (state<>'RESOLVED' OR (mode='GITHUB_ARCHIVE' AND "submissionId" IS NULL AND provenance IS NOT NULL AND provenance->'fixedBeforeSubmission'='true'::jsonb AND checkpoint IS NULL))
 AND (state<>'RUNNING' OR ("leaseToken" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL))
 AND (state<>'STORED' OR ("submissionId" IS NOT NULL AND "checkpoint" IS NOT NULL))
 AND (mode<>'GITHUB_ARCHIVE' OR (kind='REPOSITORY' AND "sourceUrl" IS NOT NULL AND "originalRef" IS NOT NULL))
 AND "requestHash"~'^[a-f0-9]{64}$' AND backend IN ('local_private','s3_private') AND "namespaceVersion"=1);
DROP INDEX agri_evidence_active_source;
CREATE UNIQUE INDEX agri_evidence_active_source ON agri_evidence_requests("entryStageId",COALESCE("submissionId",''),mode,kind,COALESCE("sourceUrl",''),"artifactVersionId") WHERE state IN ('PREPARED','QUEUED','RUNNING','RETRY_WAIT','UPLOADED','RESOLVED');
CREATE OR REPLACE FUNCTION agri_evidence_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s agri_stage_submissions%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_EVIDENCE_IMMUTABLE'; END IF;
 IF NEW."cleanupCompletedAt" IS NOT NULL AND (NEW.state<>'CANCELLED' OR EXISTS(SELECT 1 FROM agri_evidence_objects WHERE "requestId"=NEW.id)) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_CLEANUP_INVALID'; END IF;
 IF TG_OP='UPDATE' AND OLD."cleanupCompletedAt" IS NOT NULL AND NEW."cleanupCompletedAt" IS DISTINCT FROM OLD."cleanupCompletedAt" THEN RAISE EXCEPTION 'AGRI_EVIDENCE_CLEANUP_IMMUTABLE'; END IF;

 IF NEW.mode='GITHUB_ARCHIVE' AND NEW.provenance IS NOT NULL THEN
  IF jsonb_typeof(NEW.provenance) IS DISTINCT FROM 'object' OR (NEW.provenance->>'sha') IS NULL OR (NEW.provenance->>'sha')!~'^[a-f0-9]{40}$' OR (NEW.provenance->>'resolvedAt') IS NULL OR (NEW.provenance->>'resolvedAt')::timestamptz>clock_timestamp() OR (NEW.provenance->>'resolvedAt')::timestamptz<NEW."createdAt" OR jsonb_typeof(NEW.provenance->'proof') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.provenance->'proof') NOT BETWEEN 1 AND 5 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.provenance->'proof') p WHERE p->>'bodyHash' IS NULL OR p->>'bodyHash'!~'^[a-f0-9]{64}$' OR p->>'sha' IS NULL OR p->>'sha'!~'^[a-f0-9]{40}$' OR p->>'type' IS NULL OR p->>'type' NOT IN ('tag','commit')) OR NEW.provenance#>>'{proof,-1,type}' IS DISTINCT FROM 'commit' OR NEW.provenance#>>'{proof,-1,sha}' IS DISTINCT FROM NEW.provenance->>'sha' THEN RAISE EXCEPTION 'AGRI_EVIDENCE_RESOLUTION_INVALID'; END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.mode='GITHUB_ARCHIVE' AND NEW.provenance IS NOT NULL THEN RAISE EXCEPTION 'AGRI_EVIDENCE_RESOLUTION_INVALID'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.mode='GITHUB_ARCHIVE' AND NEW.provenance IS DISTINCT FROM OLD.provenance THEN
   IF OLD.provenance IS NOT NULL OR OLD.state<>'RUNNING' OR OLD."leaseExpiresAt"<=clock_timestamp() OR NEW.revision<>OLD.revision+1 OR (NEW.provenance->'fixedBeforeSubmission') IS DISTINCT FROM to_jsonb(OLD."submissionId" IS NULL) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_RESOLUTION_IMMUTABLE'; END IF;
  END IF;
  IF (NEW.id,NEW."competitionId",NEW."entryStageId",NEW."projectId",NEW."artifactVersionId",NEW."actorId",NEW.authority,NEW.mode,NEW.kind,NEW."sourceUrl",NEW."originalRef",NEW."fileName",NEW."maxBytes",NEW."requestHash",NEW."createdAt",NEW."expiresAt",NEW."objectId",NEW."storageKey",NEW.backend,NEW."namespaceVersion") IS DISTINCT FROM
  (OLD.id,OLD."competitionId",OLD."entryStageId",OLD."projectId",OLD."artifactVersionId",OLD."actorId",OLD.authority,OLD.mode,OLD.kind,OLD."sourceUrl",OLD."originalRef",OLD."fileName",OLD."maxBytes",OLD."requestHash",OLD."createdAt",OLD."expiresAt",OLD."objectId",OLD."storageKey",OLD.backend,OLD."namespaceVersion") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_IDENTITY_IMMUTABLE'; END IF;
  IF NEW."submissionId" IS DISTINCT FROM OLD."submissionId" AND NOT (OLD."submissionId" IS NULL AND OLD."bindingState"='PREPARED' AND NEW."bindingState"='BOUND' AND NEW."submissionId" IS NOT NULL AND NEW.revision=OLD.revision+1) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_BIND_INVALID'; END IF;
  IF NEW.revision<>OLD.revision+1 AND NOT (NEW.revision=OLD.revision AND (to_jsonb(NEW)-'leaseExpiresAt'-'storedBytes')=(to_jsonb(OLD)-'leaseExpiresAt'-'storedBytes') AND NEW."storedBytes">=OLD."storedBytes" AND OLD.state='RUNNING' AND OLD."leaseExpiresAt">clock_timestamp()) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_REVISION_INVALID'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM artifact_versions v JOIN artifacts a ON a.id=v."artifactId" WHERE v.id=NEW."artifactVersionId" AND a."projectId"=NEW."projectId") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_VERSION_MISMATCH'; END IF;
 IF NOT EXISTS(SELECT 1 FROM projects p JOIN agri_entry_stages es ON es.id=NEW."entryStageId" JOIN team_competitions tc ON tc.id=es."teamCompetitionId" WHERE p.id=NEW."projectId" AND p."teamId"=tc."teamId") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_TEAM_MISMATCH'; END IF;
 IF NEW."submissionId" IS NOT NULL THEN
 SELECT * INTO s FROM agri_stage_submissions WHERE id=NEW."submissionId" FOR SHARE;
 IF s.id IS NULL OR (s."entryStageId",s."competitionId",s."projectId",s."artifactVersionId") IS DISTINCT FROM (NEW."entryStageId",NEW."competitionId",NEW."projectId",NEW."artifactVersionId") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_SUBMISSION_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
