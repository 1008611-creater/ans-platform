BEGIN;
-- Fixed, private archival snapshots of the existing authorized summary; no onsite/public/eligibility behavior.
CREATE TABLE agri_record_archives (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"submissionId" TEXT NOT NULL,"entryStageId" TEXT NOT NULL,"artifactVersionId" TEXT NOT NULL,"ruleVersionId" TEXT NOT NULL,
 sequence INTEGER NOT NULL,"previousArchiveId" TEXT,"createdById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,"collectedAt" TIMESTAMPTZ(3) NOT NULL,
 "includePrivate" BOOLEAN NOT NULL,"includeInternal" BOOLEAN NOT NULL,"snapshotSchemaVersion" INTEGER NOT NULL,"snapshotCanonical" TEXT NOT NULL,"snapshotHash" VARCHAR(64) NOT NULL,"byteLength" INTEGER NOT NULL,
 FOREIGN KEY("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY("ruleVersionId","competitionId") REFERENCES agri_rule_versions(id,"competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY("artifactVersionId") REFERENCES artifact_versions(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 UNIQUE(id,"submissionId","competitionId"),UNIQUE(id,"competitionId"),UNIQUE("submissionId",sequence),
 FOREIGN KEY("previousArchiveId","submissionId","competitionId") REFERENCES agri_record_archives(id,"submissionId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 CHECK(sequence BETWEEN 1 AND 2147483646 AND "snapshotSchemaVersion"=1 AND "snapshotHash" ~ '^[a-f0-9]{64}$' AND "byteLength"=octet_length("snapshotCanonical") AND "byteLength">0 AND "snapshotHash"=encode(sha256(convert_to("snapshotCanonical",'UTF8')),'hex') AND ("previousArchiveId" IS NULL OR "previousArchiveId"<>id))
);
CREATE INDEX agri_record_archives_source_idx ON agri_record_archives("competitionId","submissionId",sequence,id);
CREATE TABLE agri_record_archive_receipts (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"archiveId" TEXT NOT NULL UNIQUE,"actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "idempotencyKey" VARCHAR(36) NOT NULL,"requestHash" VARCHAR(64) NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("archiveId","competitionId") REFERENCES agri_record_archives(id,"competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 UNIQUE("archiveId","competitionId"),UNIQUE("competitionId","actorId","idempotencyKey"),CHECK("requestHash" ~ '^[a-f0-9]{64}$')
);
CREATE TRIGGER agri_record_archive_immutable BEFORE UPDATE OR DELETE ON agri_record_archives FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_record_archive_receipt_immutable BEFORE UPDATE OR DELETE ON agri_record_archive_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE FUNCTION agri_record_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source agri_stage_submissions%ROWTYPE; previous agri_record_archives%ROWTYPE; payload JSONB; record JSONB; collection_name TEXT; item JSONB;
BEGIN
 SELECT * INTO source FROM agri_stage_submissions WHERE id=NEW."submissionId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 IF source.id IS NULL OR source."entryStageId"<>NEW."entryStageId" OR source."artifactVersionId"<>NEW."artifactVersionId" OR source."ruleVersionId"<>NEW."ruleVersionId" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SOURCE_MISMATCH'; END IF;
 SELECT * INTO previous FROM agri_record_archives WHERE "submissionId"=NEW."submissionId" AND "competitionId"=NEW."competitionId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(previous.sequence,0)+1 OR NEW."previousArchiveId" IS DISTINCT FROM previous.id OR (previous.id IS NOT NULL AND NEW."collectedAt"<previous."collectedAt") THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SEQUENCE_INVALID'; END IF;
 payload:=NEW."snapshotCanonical"::jsonb; record:=payload->'record';
 IF jsonb_typeof(payload) IS DISTINCT FROM 'object' OR payload->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR payload->>'source' IS DISTINCT FROM 'ANS_AGRI_SAVED_RECORD_ARCHIVE' OR payload->'includesOnsite' IS DISTINCT FROM 'false'::jsonb OR payload->>'archiveId' IS DISTINCT FROM NEW.id OR payload->'sequence' IS DISTINCT FROM to_jsonb(NEW.sequence) OR payload->'previousArchiveId' IS DISTINCT FROM COALESCE(to_jsonb(NEW."previousArchiveId"),'null'::jsonb) OR payload->>'createdById' IS DISTINCT FROM NEW."createdById" OR (payload->>'collectedAt')::timestamptz IS DISTINCT FROM NEW."collectedAt" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SNAPSHOT_MISMATCH'; END IF;
 IF jsonb_typeof(record) IS DISTINCT FROM 'object' OR record->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR record->>'source' IS DISTINCT FROM 'ANS_AGRI_LIVE_RECORD_SUMMARY' OR record->>'generatedAt' IS DISTINCT FROM payload->>'collectedAt' OR record->>'competitionId' IS DISTINCT FROM NEW."competitionId" OR record#>>'{submission,id}' IS DISTINCT FROM NEW."submissionId" OR record#>>'{submission,entryStageId}' IS DISTINCT FROM NEW."entryStageId" OR record#>>'{submission,artifactVersionId}' IS DISTINCT FROM NEW."artifactVersionId" OR record#>>'{submission,ruleVersionId}' IS DISTINCT FROM NEW."ruleVersionId" OR record#>>'{rule,id}' IS DISTINCT FROM NEW."ruleVersionId" OR record#>'{selection,includePrivate}' IS DISTINCT FROM to_jsonb(NEW."includePrivate") OR record#>'{selection,includeInternal}' IS DISTINCT FROM to_jsonb(NEW."includeInternal") OR record->'limits' IS DISTINCT FROM '{"maxPerCollection":100,"complete":true}'::jsonb THEN RAISE EXCEPTION 'AGRI_ARCHIVE_RECORD_MISMATCH'; END IF;
 IF NOT NEW."includePrivate" AND record ? 'content' THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 FOREACH collection_name IN ARRAY ARRAY['stageHistory','technicalChecks','demoChecks','issues','issueEvents'] LOOP
  IF jsonb_typeof(record->collection_name) IS DISTINCT FROM 'array' OR jsonb_array_length(record->collection_name)>100 THEN RAISE EXCEPTION 'AGRI_ARCHIVE_COLLECTION_INVALID'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(record->'technicalChecks') UNION ALL SELECT value FROM jsonb_array_elements(record->'demoChecks') LOOP
  IF (NOT NEW."includePrivate" AND (item ?| ARRAY['checklist','demo'] OR (item->'feedback') ? 'body')) OR ((NOT NEW."includeInternal" OR (item->>'basis'='PRIVATE_MATERIALS' AND NOT NEW."includePrivate")) AND item ? 'internalNote') THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(record->'issues') UNION ALL SELECT value FROM jsonb_array_elements(record->'issueEvents') LOOP
  IF (item->>'visibility'='INTERNAL' AND NOT NEW."includeInternal") OR (item->>'basis'='PRIVATE_MATERIALS' AND NOT NEW."includePrivate") OR (NOT NEW."includePrivate" AND NOT (NEW."includeInternal" AND item->>'visibility'='INTERNAL') AND item ?| ARRAY['title','body','processingSummary']) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SELECTION_MISMATCH'; END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_record_archive_guard BEFORE INSERT ON agri_record_archives FOR EACH ROW EXECUTE FUNCTION agri_record_archive_guard();
CREATE FUNCTION agri_record_archive_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agri_record_archives WHERE id=NEW."archiveId" AND "competitionId"=NEW."competitionId" AND "createdById"=NEW."actorId" AND "collectedAt"=NEW."createdAt") THEN RAISE EXCEPTION 'AGRI_ARCHIVE_RECEIPT_MISMATCH'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_record_archive_receipt_guard BEFORE INSERT ON agri_record_archive_receipts FOR EACH ROW EXECUTE FUNCTION agri_record_archive_receipt_guard();
CREATE FUNCTION agri_record_archive_atomic_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM agri_record_archive_receipts r WHERE r."archiveId"=NEW.id AND r."competitionId"=NEW."competitionId" AND r."actorId"=NEW."createdById" AND r."createdAt"=NEW."collectedAt") OR NOT EXISTS(SELECT 1 FROM audit_logs a WHERE a."resourceId"=NEW.id AND a."actorId"=NEW."createdById" AND a.action='AGRI_CREATE_RECORD_ARCHIVE' AND a."resourceType"='agri_record_archive') THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ATOMIC_RECORD_REQUIRED'; END IF;
 RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER agri_record_archive_atomic_guard AFTER INSERT ON agri_record_archives DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_record_archive_atomic_guard();
COMMIT;
