BEGIN;
-- AlterTable
ALTER TABLE "agri_record_archives" ADD COLUMN     "evidenceManifestId" TEXT;

-- CreateTable
CREATE TABLE "agri_evidence_requests" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "entryStageId" TEXT NOT NULL,
    "submissionId" TEXT,
    "projectId" TEXT NOT NULL,
    "artifactVersionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bindingState" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "originalRef" JSONB,
    "provenance" JSONB,
    "fileName" TEXT NOT NULL,
    "maxBytes" INTEGER NOT NULL,
    "storedBytes" INTEGER NOT NULL DEFAULT 0,
    "requestHash" VARCHAR(64) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "nextRunAt" TIMESTAMPTZ(3),
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "objectId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "namespaceVersion" INTEGER NOT NULL DEFAULT 1,
    "errorCode" TEXT,
    "captureStartedAt" TIMESTAMPTZ(3),
    "captureFinishedAt" TIMESTAMPTZ(3),
    "checkpoint" JSONB,
    "cleanupCompletedAt" TIMESTAMPTZ(3),
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "agri_evidence_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_evidence_objects" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "entryStageId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "namespaceVersion" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "descriptor" JSONB NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agri_evidence_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_evidence_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "objectId" TEXT,
    "actorId" TEXT,
    "workerId" TEXT,
    "action" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "errorCode" TEXT,
    "provenance" JSONB NOT NULL,
    "serverAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agri_evidence_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_evidence_manifests" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "entryStageId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "previousManifestId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "canonicalJSON" TEXT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "includePrivate" BOOLEAN NOT NULL DEFAULT true,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "agri_evidence_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_evidence_manifest_objects" (
    "manifestId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "entryStageId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,

    CONSTRAINT "agri_evidence_manifest_objects_pkey" PRIMARY KEY ("manifestId","objectId")
);

-- CreateTable
CREATE TABLE "agri_evidence_command_receipts" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entryStageId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(36) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "requestId" TEXT,
    "submissionId" TEXT,
    "manifestId" TEXT,
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agri_evidence_command_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agri_evidence_requests_state_nextRunAt_createdAt_idx" ON "agri_evidence_requests"("state", "nextRunAt", "createdAt");

-- CreateIndex
CREATE INDEX "agri_evidence_requests_leaseExpiresAt_state_idx" ON "agri_evidence_requests"("leaseExpiresAt", "state");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_requests_id_competitionId_key" ON "agri_evidence_requests"("id", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_requests_id_entryStageId_competitionId_key" ON "agri_evidence_requests"("id", "entryStageId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_requests_id_submissionId_entryStageId_competi_key" ON "agri_evidence_requests"("id", "submissionId", "entryStageId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_objects_requestId_key" ON "agri_evidence_objects"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_objects_id_competitionId_key" ON "agri_evidence_objects"("id", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_objects_id_submissionId_entryStageId_competit_key" ON "agri_evidence_objects"("id", "submissionId", "entryStageId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_objects_id_requestId_competitionId_key" ON "agri_evidence_objects"("id", "requestId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_objects_backend_namespaceVersion_storageKey_key" ON "agri_evidence_objects"("backend", "namespaceVersion", "storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_events_requestId_revision_key" ON "agri_evidence_events"("requestId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_manifests_id_competitionId_key" ON "agri_evidence_manifests"("id", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_manifests_id_submissionId_entryStageId_compet_key" ON "agri_evidence_manifests"("id", "submissionId", "entryStageId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_manifests_submissionId_sequence_key" ON "agri_evidence_manifests"("submissionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "agri_evidence_command_receipts_competitionId_actorId_operat_key" ON "agri_evidence_command_receipts"("competitionId", "actorId", "operation", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "agri_record_archives" ADD CONSTRAINT "agri_record_archives_evidenceManifestId_submissionId_entry_fkey" FOREIGN KEY ("evidenceManifestId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_manifests"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_entryStageId_competitionId_fkey" FOREIGN KEY ("entryStageId", "competitionId") REFERENCES "agri_entry_stages"("id", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_submissionId_entryStageId_competiti_fkey" FOREIGN KEY ("submissionId", "entryStageId", "competitionId") REFERENCES "agri_stage_submissions"("id", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_artifactVersionId_fkey" FOREIGN KEY ("artifactVersionId") REFERENCES "artifact_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_requests" ADD CONSTRAINT "agri_evidence_requests_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_objects" ADD CONSTRAINT "agri_evidence_objects_requestId_submissionId_entryStageId__fkey" FOREIGN KEY ("requestId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_requests"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_objects" ADD CONSTRAINT "agri_evidence_objects_submissionId_entryStageId_competitio_fkey" FOREIGN KEY ("submissionId", "entryStageId", "competitionId") REFERENCES "agri_stage_submissions"("id", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_events" ADD CONSTRAINT "agri_evidence_events_requestId_competitionId_fkey" FOREIGN KEY ("requestId", "competitionId") REFERENCES "agri_evidence_requests"("id", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_events" ADD CONSTRAINT "agri_evidence_events_objectId_requestId_competitionId_fkey" FOREIGN KEY ("objectId", "requestId", "competitionId") REFERENCES "agri_evidence_objects"("id", "requestId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_events" ADD CONSTRAINT "agri_evidence_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_manifests" ADD CONSTRAINT "agri_evidence_manifests_submissionId_entryStageId_competit_fkey" FOREIGN KEY ("submissionId", "entryStageId", "competitionId") REFERENCES "agri_stage_submissions"("id", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_manifests" ADD CONSTRAINT "agri_evidence_manifests_previousManifestId_submissionId_en_fkey" FOREIGN KEY ("previousManifestId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_manifests"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_manifests" ADD CONSTRAINT "agri_evidence_manifests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_manifest_objects" ADD CONSTRAINT "agri_evidence_manifest_objects_manifestId_submissionId_ent_fkey" FOREIGN KEY ("manifestId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_manifests"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_manifest_objects" ADD CONSTRAINT "agri_evidence_manifest_objects_objectId_submissionId_entry_fkey" FOREIGN KEY ("objectId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_objects"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_command_receipts" ADD CONSTRAINT "agri_evidence_command_receipts_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_command_receipts" ADD CONSTRAINT "agri_evidence_command_receipts_entryStageId_competitionId_fkey" FOREIGN KEY ("entryStageId", "competitionId") REFERENCES "agri_entry_stages"("id", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_command_receipts" ADD CONSTRAINT "agri_evidence_command_receipts_requestId_entryStageId_comp_fkey" FOREIGN KEY ("requestId", "entryStageId", "competitionId") REFERENCES "agri_evidence_requests"("id", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agri_evidence_command_receipts" ADD CONSTRAINT "agri_evidence_command_receipts_manifestId_submissionId_ent_fkey" FOREIGN KEY ("manifestId", "submissionId", "entryStageId", "competitionId") REFERENCES "agri_evidence_manifests"("id", "submissionId", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- Original bytes and identities are append-only, including private failed-action evidence.
CREATE FUNCTION agri_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'AGRI_EVIDENCE_IMMUTABLE'; END $$;
CREATE TRIGGER agri_evidence_objects_immutable BEFORE UPDATE OR DELETE ON agri_evidence_objects FOR EACH ROW EXECUTE FUNCTION agri_evidence_immutable();
CREATE TRIGGER agri_evidence_events_immutable BEFORE UPDATE OR DELETE ON agri_evidence_events FOR EACH ROW EXECUTE FUNCTION agri_evidence_immutable();
CREATE TRIGGER agri_evidence_manifests_immutable BEFORE UPDATE OR DELETE ON agri_evidence_manifests FOR EACH ROW EXECUTE FUNCTION agri_evidence_immutable();
CREATE TRIGGER agri_evidence_refs_immutable BEFORE UPDATE OR DELETE ON agri_evidence_manifest_objects FOR EACH ROW EXECUTE FUNCTION agri_evidence_immutable();
CREATE TRIGGER agri_evidence_receipts_immutable BEFORE UPDATE OR DELETE ON agri_evidence_command_receipts FOR EACH ROW EXECUTE FUNCTION agri_evidence_immutable();
ALTER TABLE agri_evidence_requests ADD CONSTRAINT agri_evidence_request_check CHECK (
 revision BETWEEN 1 AND 2147483646 AND attempt BETWEEN 0 AND 3 AND "maxAttempts"=3 AND "maxBytes">0 AND "storedBytes" BETWEEN 0 AND "maxBytes"
 AND mode IN ('UPLOAD','GITHUB_ARCHIVE','ALLOWED_HTTP_CAPTURE') AND kind IN ('REPOSITORY','DEMO_DOCUMENT','DEMO_VIDEO','SUPPORTING_FILE')
 AND authority IN ('TEAM','STAFF') AND state IN ('PREPARED','QUEUED','RUNNING','UPLOADED','STORED','RETRY_WAIT','FAILED','CANCELLED','NEEDS_REVIEW')
 AND (("bindingState"='PREPARED' AND "submissionId" IS NULL AND "expiresAt" IS NOT NULL AND mode='UPLOAD') OR ("bindingState"='BOUND' AND "submissionId" IS NOT NULL))
 AND (state<>'RUNNING' OR ("leaseToken" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL))
 AND (state<>'STORED' OR ("submissionId" IS NOT NULL AND "checkpoint" IS NOT NULL))
 AND (mode<>'GITHUB_ARCHIVE' OR (kind='REPOSITORY' AND "sourceUrl" IS NOT NULL AND "originalRef" IS NOT NULL))
 AND "requestHash"~'^[a-f0-9]{64}$' AND backend IN ('local_private','s3_private') AND "namespaceVersion"=1);
CREATE UNIQUE INDEX agri_evidence_active_source ON agri_evidence_requests("entryStageId",COALESCE("submissionId",''),mode,kind,COALESCE("sourceUrl",''),"artifactVersionId") WHERE state IN ('PREPARED','QUEUED','RUNNING','RETRY_WAIT','UPLOADED');
CREATE FUNCTION agri_evidence_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s agri_stage_submissions%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_EVIDENCE_IMMUTABLE'; END IF;
 IF NEW."cleanupCompletedAt" IS NOT NULL AND (NEW.state<>'CANCELLED' OR EXISTS(SELECT 1 FROM agri_evidence_objects WHERE "requestId"=NEW.id)) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_CLEANUP_INVALID'; END IF;
 IF TG_OP='UPDATE' AND OLD."cleanupCompletedAt" IS NOT NULL AND NEW."cleanupCompletedAt" IS DISTINCT FROM OLD."cleanupCompletedAt" THEN RAISE EXCEPTION 'AGRI_EVIDENCE_CLEANUP_IMMUTABLE'; END IF;

 IF TG_OP='UPDATE' THEN
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
CREATE TRIGGER agri_evidence_request_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_evidence_requests FOR EACH ROW EXECUTE FUNCTION agri_evidence_request_guard();
CREATE FUNCTION agri_evidence_event_complete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM agri_evidence_events e WHERE e."requestId"=NEW.id AND e.revision=NEW.revision AND e.state=NEW.state AND e.attempt=NEW.attempt) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_EVENT_REQUIRED'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER agri_evidence_event_complete AFTER INSERT OR UPDATE ON agri_evidence_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_evidence_event_complete();
ALTER TABLE agri_evidence_objects ADD CONSTRAINT agri_evidence_object_check CHECK ("sha256"~'^[a-f0-9]{64}$' AND "byteLength">0 AND "namespaceVersion"=1 AND backend IN ('local_private','s3_private') AND jsonb_typeof(descriptor)='object');
CREATE FUNCTION agri_evidence_object_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r agri_evidence_requests%ROWTYPE;
BEGIN
 SELECT * INTO r FROM agri_evidence_requests WHERE id=NEW."requestId" FOR UPDATE;
 IF r.id IS NULL OR r."objectId"<>NEW.id OR (r.backend,r."namespaceVersion",r."storageKey") IS DISTINCT FROM (NEW.backend,NEW."namespaceVersion",NEW."storageKey") OR NEW."byteLength">r."maxBytes" OR r."checkpoint" IS NULL OR
 (r."checkpoint"->>'sha256') IS DISTINCT FROM NEW.sha256 OR (r."checkpoint"->>'byteLength')::integer IS DISTINCT FROM NEW."byteLength" OR
 NEW.descriptor->>'mime' IS DISTINCT FROM NEW.mime OR NEW.descriptor->>'kind' IS DISTINCT FROM r.kind OR NEW.descriptor->>'fileName' IS DISTINCT FROM r."fileName" OR (NEW.descriptor->>'startedAt')::timestamptz IS DISTINCT FROM r."captureStartedAt" OR NEW."capturedAt" IS DISTINCT FROM r."captureFinishedAt" OR NEW.mime IS DISTINCT FROM r.checkpoint->>'mime' OR
 NEW.descriptor->>'id' IS DISTINCT FROM NEW.id OR NEW.descriptor->>'requestId' IS DISTINCT FROM r.id OR NEW.descriptor->>'sha256' IS DISTINCT FROM NEW.sha256 OR (NEW.descriptor->>'byteLength')::integer IS DISTINCT FROM NEW."byteLength" OR NEW.descriptor->>'backend' IS DISTINCT FROM NEW.backend OR (NEW.descriptor->>'namespaceVersion')::integer IS DISTINCT FROM NEW."namespaceVersion" OR (NEW.descriptor->>'capturedAt')::timestamptz IS DISTINCT FROM NEW."capturedAt" OR (NEW.descriptor->>'startedAt')::timestamptz>NEW."capturedAt" OR NEW.descriptor ?| ARRAY['storageKey','sourceUrl'] THEN RAISE EXCEPTION 'AGRI_EVIDENCE_OBJECT_INVALID'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agri_evidence_object_guard BEFORE INSERT ON agri_evidence_objects FOR EACH ROW EXECUTE FUNCTION agri_evidence_object_guard();
ALTER TABLE agri_evidence_events ADD CONSTRAINT agri_evidence_event_check CHECK (revision>0 AND ("actorId" IS NOT NULL OR "workerId" IS NOT NULL) AND jsonb_typeof(provenance)='object');
ALTER TABLE agri_evidence_manifests ADD CONSTRAINT agri_evidence_manifest_check CHECK (sequence BETWEEN 1 AND 2147483646 AND "schemaVersion"=1 AND "includePrivate" AND "byteLength"=octet_length("canonicalJSON") AND "byteLength">0 AND sha256=encode(sha256(convert_to("canonicalJSON",'UTF8')),'hex') AND ("previousManifestId" IS NULL OR "previousManifestId"<>id));
CREATE FUNCTION agri_evidence_manifest_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous agri_evidence_manifests%ROWTYPE; payload JSONB;
BEGIN
 PERFORM id FROM agri_stage_submissions WHERE id=NEW."submissionId" FOR UPDATE;
 SELECT * INTO previous FROM agri_evidence_manifests WHERE "submissionId"=NEW."submissionId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(previous.sequence,0)+1 OR NEW."previousManifestId" IS DISTINCT FROM previous.id OR (previous.id IS NOT NULL AND NEW."createdAt"<previous."createdAt") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_MANIFEST_SEQUENCE_INVALID'; END IF;
 payload:=NEW."canonicalJSON"::jsonb;
 IF payload->>'id' IS DISTINCT FROM NEW.id OR payload->>'submissionId' IS DISTINCT FROM NEW."submissionId" OR payload->>'entryStageId' IS DISTINCT FROM NEW."entryStageId" OR payload->>'competitionId' IS DISTINCT FROM NEW."competitionId" OR payload->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR payload->>'source' IS DISTINCT FROM 'ANS_AGRI_EXTERNAL_EVIDENCE' OR payload->'sequence' IS DISTINCT FROM to_jsonb(NEW.sequence) OR payload->'previousManifestId' IS DISTINCT FROM COALESCE(to_jsonb(NEW."previousManifestId"),'null'::jsonb) OR payload->'includePrivate' IS DISTINCT FROM 'true'::jsonb OR (payload->>'createdAt')::timestamptz IS DISTINCT FROM NEW."createdAt" OR jsonb_typeof(payload->'objects') IS DISTINCT FROM 'array' OR jsonb_array_length(payload->'objects')>100 THEN RAISE EXCEPTION 'AGRI_EVIDENCE_MANIFEST_INVALID'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agri_evidence_manifest_guard BEFORE INSERT ON agri_evidence_manifests FOR EACH ROW EXECUTE FUNCTION agri_evidence_manifest_guard();
CREATE FUNCTION agri_evidence_refs_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m agri_evidence_manifests%ROWTYPE; oid TEXT;
BEGIN
 IF TG_TABLE_NAME='agri_evidence_manifests' THEN oid:=NEW.id; ELSE oid:=NEW."manifestId"; END IF;
 SELECT * INTO m FROM agri_evidence_manifests WHERE id=oid FOR SHARE;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(m."canonicalJSON"::jsonb->'objects') j LEFT JOIN agri_evidence_manifest_objects r ON r."manifestId"=m.id AND r."objectId"=j->>'id' LEFT JOIN agri_evidence_objects o ON o.id=r."objectId" WHERE o.id IS NULL OR o.descriptor IS DISTINCT FROM j)
 OR (SELECT count(*) FROM agri_evidence_manifest_objects WHERE "manifestId"=m.id)<>(SELECT jsonb_array_length(m."canonicalJSON"::jsonb->'objects')) THEN RAISE EXCEPTION 'AGRI_EVIDENCE_MANIFEST_REFS_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER agri_evidence_manifest_complete AFTER INSERT ON agri_evidence_manifests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_evidence_refs_complete();
CREATE CONSTRAINT TRIGGER agri_evidence_refs_complete AFTER INSERT ON agri_evidence_manifest_objects DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_evidence_refs_complete();
ALTER TABLE agri_evidence_command_receipts ADD CONSTRAINT agri_evidence_receipt_check CHECK (revision>0 AND "requestHash"~'^[a-f0-9]{64}$' AND (("requestId" IS NOT NULL AND "manifestId" IS NULL) OR ("requestId" IS NULL AND "manifestId" IS NOT NULL AND "submissionId" IS NOT NULL)));
CREATE FUNCTION agri_evidence_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."requestId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agri_evidence_requests r WHERE r.id=NEW."requestId" AND r."submissionId" IS NOT DISTINCT FROM NEW."submissionId" AND r."entryStageId"=NEW."entryStageId" AND r."competitionId"=NEW."competitionId") THEN RAISE EXCEPTION 'AGRI_EVIDENCE_RECEIPT_SOURCE_MISMATCH'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER agri_evidence_receipt_guard BEFORE INSERT ON agri_evidence_command_receipts FOR EACH ROW EXECUTE FUNCTION agri_evidence_receipt_guard();
CREATE INDEX "agri_evidence_requests_submissionId_state_idx" ON agri_evidence_requests("submissionId",state);

-- v1/v2 bytes are unchanged. Only new v3 records may select an exact immutable evidence manifest.
ALTER TABLE agri_record_archives DROP CONSTRAINT agri_record_archives_check;
ALTER TABLE agri_record_archives ADD CONSTRAINT agri_record_archives_check CHECK (sequence BETWEEN 1 AND 2147483646 AND "snapshotSchemaVersion" IN (1,2,3) AND "snapshotHash" ~ '^[a-f0-9]{64}$' AND "byteLength"=octet_length("snapshotCanonical") AND "byteLength">0 AND "snapshotHash"=encode(sha256(convert_to("snapshotCanonical",'UTF8')),'hex') AND ("previousArchiveId" IS NULL OR "previousArchiveId"<>id) AND (("snapshotSchemaVersion" IN(1,2) AND "evidenceManifestId" IS NULL) OR ("snapshotSchemaVersion"=3 AND "evidenceManifestId" IS NOT NULL)));
CREATE OR REPLACE FUNCTION agri_record_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source agri_stage_submissions%ROWTYPE; previous agri_record_archives%ROWTYPE; payload JSONB; record JSONB; collection_name TEXT; item JSONB; evidence agri_evidence_manifests%ROWTYPE;
BEGIN
 SELECT * INTO source FROM agri_stage_submissions WHERE id=NEW."submissionId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 IF source.id IS NULL OR source."entryStageId"<>NEW."entryStageId" OR source."artifactVersionId"<>NEW."artifactVersionId" OR source."ruleVersionId"<>NEW."ruleVersionId" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SOURCE_MISMATCH'; END IF;
 SELECT * INTO previous FROM agri_record_archives WHERE "submissionId"=NEW."submissionId" AND "competitionId"=NEW."competitionId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(previous.sequence,0)+1 OR NEW."previousArchiveId" IS DISTINCT FROM previous.id OR (previous.id IS NOT NULL AND NEW."collectedAt"<previous."collectedAt") THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SEQUENCE_INVALID'; END IF;
 payload:=NEW."snapshotCanonical"::jsonb; record:=payload->'record';
 IF jsonb_typeof(payload) IS DISTINCT FROM 'object' OR payload->'schemaVersion' IS DISTINCT FROM to_jsonb(NEW."snapshotSchemaVersion") OR payload->>'source' IS DISTINCT FROM 'ANS_AGRI_SAVED_RECORD_ARCHIVE' OR payload->'includesOnsite' IS DISTINCT FROM to_jsonb(NEW."snapshotSchemaVersion" IN (2,3)) OR payload->>'archiveId' IS DISTINCT FROM NEW.id OR payload->'sequence' IS DISTINCT FROM to_jsonb(NEW.sequence) OR payload->'previousArchiveId' IS DISTINCT FROM COALESCE(to_jsonb(NEW."previousArchiveId"),'null'::jsonb) OR payload->>'createdById' IS DISTINCT FROM NEW."createdById" OR (payload->>'collectedAt')::timestamptz IS DISTINCT FROM NEW."collectedAt" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SNAPSHOT_MISMATCH'; END IF;
 IF jsonb_typeof(record) IS DISTINCT FROM 'object' OR record->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR record->>'source' IS DISTINCT FROM 'ANS_AGRI_LIVE_RECORD_SUMMARY' OR record->>'generatedAt' IS DISTINCT FROM payload->>'collectedAt' OR record->>'competitionId' IS DISTINCT FROM NEW."competitionId" OR record#>>'{submission,id}' IS DISTINCT FROM NEW."submissionId" OR record#>>'{submission,entryStageId}' IS DISTINCT FROM NEW."entryStageId" OR record#>>'{submission,artifactVersionId}' IS DISTINCT FROM NEW."artifactVersionId" OR record#>>'{submission,ruleVersionId}' IS DISTINCT FROM NEW."ruleVersionId" OR record#>>'{rule,id}' IS DISTINCT FROM NEW."ruleVersionId" OR record#>'{selection,includePrivate}' IS DISTINCT FROM to_jsonb(NEW."includePrivate") OR record#>'{selection,includeInternal}' IS DISTINCT FROM to_jsonb(NEW."includeInternal") OR record->'limits' IS DISTINCT FROM '{"maxPerCollection":100,"complete":true}'::jsonb THEN RAISE EXCEPTION 'AGRI_ARCHIVE_RECORD_MISMATCH'; END IF;
 IF NOT NEW."includePrivate" AND record ? 'content' THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 FOREACH collection_name IN ARRAY ARRAY['stageHistory','technicalChecks','demoChecks','issues','issueEvents'] LOOP
  IF jsonb_typeof(record->collection_name) IS DISTINCT FROM 'array' OR jsonb_array_length(record->collection_name)>100 THEN RAISE EXCEPTION 'AGRI_ARCHIVE_COLLECTION_INVALID'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(record->'technicalChecks') UNION ALL SELECT value FROM jsonb_array_elements(record->'demoChecks') LOOP
  IF (NOT NEW."includePrivate" AND (item ?| ARRAY['checklist','demo'] OR (item->'feedback') ? 'body')) OR ((NOT NEW."includeInternal" OR (item->>'basis'='PRIVATE_MATERIALS' AND NOT NEW."includePrivate")) AND item ? 'internalNote') THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(record->'issues') UNION ALL SELECT value FROM jsonb_array_elements(record->'issueEvents') LOOP
  IF (item->>'visibility'='INTERNAL' AND NOT NEW."includeInternal") OR (item->>'basis'='PRIVATE_MATERIALS' AND NOT NEW."includePrivate") OR (NOT NEW."includePrivate" AND NOT (NEW."includeInternal" AND item->>'visibility'='INTERNAL') AND item ?| ARRAY['title','body','processingSummary','afterState']) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 END LOOP;
 IF NEW."snapshotSchemaVersion" IN (2,3) THEN
  IF jsonb_typeof(payload->'onsite') IS DISTINCT FROM 'object' OR jsonb_typeof(payload#>'{onsite,items}') IS DISTINCT FROM 'array' OR jsonb_typeof(payload#>'{onsite,events}') IS DISTINCT FROM 'array' OR jsonb_array_length(payload#>'{onsite,items}')>100 OR jsonb_array_length(payload#>'{onsite,events}')>100 THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_INVALID'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload#>'{onsite,items}') LOOP
   IF NOT EXISTS(SELECT 1 FROM agri_onsite_items i LEFT JOIN agri_demo_checks d ON d.id=i."demoCheckId" WHERE i.id=item->>'id' AND i."submissionId"=NEW."submissionId" AND i."competitionId"=NEW."competitionId" AND i.revision=(item->>'revision')::integer AND i."createdById"=item->>'createdById' AND i."demoCheckId" IS NOT DISTINCT FROM item->>'demoCheckId' AND i.published=(item->>'published')::boolean AND i.fields-'schemaVersion'=item->'fields' AND (d.id IS NULL OR ((d.basis='METADATA' OR NEW."includePrivate") AND (d."internalNote" IS NULL OR NEW."includeInternal")))) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_SOURCE_MISMATCH'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(payload#>'{onsite,events}') LOOP
   IF NOT EXISTS(SELECT 1 FROM agri_onsite_events e JOIN agri_onsite_items i ON i.id=e."itemId" WHERE e.id=item->>'id' AND e."itemId"=item->>'itemId' AND e.revision=(item->>'revision')::integer AND e."actorId"=item->>'actorId' AND e.action=item->>'action' AND e.published=(item->>'published')::boolean AND e.fields-'schemaVersion'=item->'fields' AND i."submissionId"=NEW."submissionId" AND e."competitionId"=NEW."competitionId" AND EXISTS(SELECT 1 FROM jsonb_array_elements(payload#>'{onsite,items}') stored WHERE stored->>'id'=e."itemId")) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_EVENT_MISMATCH'; END IF;
  END LOOP;
 ELSIF payload ? 'onsite' THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_VERSION_MISMATCH'; END IF;
 IF NEW."snapshotSchemaVersion"=3 THEN
  SELECT * INTO evidence FROM agri_evidence_manifests WHERE id=NEW."evidenceManifestId" FOR SHARE;
  IF evidence.id IS NULL OR NOT NEW."includePrivate" OR (evidence."submissionId",evidence."entryStageId",evidence."competitionId") IS DISTINCT FROM (NEW."submissionId",NEW."entryStageId",NEW."competitionId") OR payload->'evidence' IS DISTINCT FROM jsonb_build_object('manifestId',evidence.id,'manifestSchemaVersion',evidence."schemaVersion",'manifestHash',evidence.sha256,'selectedObjects',evidence."canonicalJSON"::jsonb->'objects') THEN RAISE EXCEPTION 'AGRI_ARCHIVE_EVIDENCE_MISMATCH'; END IF;
 ELSIF payload ? 'evidence' THEN RAISE EXCEPTION 'AGRI_ARCHIVE_EVIDENCE_VERSION_MISMATCH'; END IF;
 RETURN NEW;
END;
$$;

COMMIT;
