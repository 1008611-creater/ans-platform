BEGIN;
-- Nullable exact Demo links preserve existing task references; no real users or data are seeded.
ALTER TABLE agri_task_references ADD COLUMN "demoCheckId" TEXT;
ALTER TABLE agri_task_references ADD CONSTRAINT agri_task_references_demo_identity_fkey FOREIGN KEY ("demoCheckId","submissionId","entryStageId","competitionId") REFERENCES agri_demo_checks (id,"submissionId","entryStageId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE agri_task_references ADD CONSTRAINT agri_task_reference_single_detail CHECK ("demoCheckId" IS NULL OR "issueId" IS NULL);
DROP INDEX agri_task_reference_active_submission;
CREATE UNIQUE INDEX agri_task_reference_active_submission ON agri_task_references ("taskId","submissionId") WHERE "detachedAt" IS NULL AND "issueId" IS NULL AND "demoCheckId" IS NULL;
CREATE UNIQUE INDEX agri_task_reference_active_demo ON agri_task_references ("taskId","demoCheckId") WHERE "detachedAt" IS NULL AND "demoCheckId" IS NOT NULL;
CREATE OR REPLACE FUNCTION ans_agri_task_reference_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'agri task reference history cannot be deleted'; END IF;
 IF OLD."detachedAt" IS NOT NULL OR NEW."detachedAt" IS NULL OR
 (NEW.id,NEW."competitionId",NEW."taskId",NEW."entryStageId",NEW."submissionId",NEW."issueId",NEW."demoCheckId",NEW."attachedAt",NEW."attachedRevision") IS DISTINCT FROM
 (OLD.id,OLD."competitionId",OLD."taskId",OLD."entryStageId",OLD."submissionId",OLD."issueId",OLD."demoCheckId",OLD."attachedAt",OLD."attachedRevision") THEN RAISE EXCEPTION 'agri task reference identity is immutable'; END IF;
 RETURN NEW;
END; $$;
-- Keep original archive bytes/immutability and permit a v2 snapshot with onsite history.
ALTER TABLE agri_record_archives DROP CONSTRAINT agri_record_archives_check;
ALTER TABLE agri_record_archives ADD CONSTRAINT agri_record_archives_check CHECK (sequence BETWEEN 1 AND 2147483646 AND "snapshotSchemaVersion" IN (1,2) AND "snapshotHash" ~ '^[a-f0-9]{64}$' AND "byteLength"=octet_length("snapshotCanonical") AND "byteLength">0 AND "snapshotHash"=encode(sha256(convert_to("snapshotCanonical",'UTF8')),'hex') AND ("previousArchiveId" IS NULL OR "previousArchiveId"<>id));
CREATE OR REPLACE FUNCTION agri_record_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source agri_stage_submissions%ROWTYPE; previous agri_record_archives%ROWTYPE; payload JSONB; record JSONB; collection_name TEXT; item JSONB;
BEGIN
 SELECT * INTO source FROM agri_stage_submissions WHERE id=NEW."submissionId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 IF source.id IS NULL OR source."entryStageId"<>NEW."entryStageId" OR source."artifactVersionId"<>NEW."artifactVersionId" OR source."ruleVersionId"<>NEW."ruleVersionId" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SOURCE_MISMATCH'; END IF;
 SELECT * INTO previous FROM agri_record_archives WHERE "submissionId"=NEW."submissionId" AND "competitionId"=NEW."competitionId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(previous.sequence,0)+1 OR NEW."previousArchiveId" IS DISTINCT FROM previous.id OR (previous.id IS NOT NULL AND NEW."collectedAt"<previous."collectedAt") THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SEQUENCE_INVALID'; END IF;
 payload:=NEW."snapshotCanonical"::jsonb; record:=payload->'record';
 IF jsonb_typeof(payload) IS DISTINCT FROM 'object' OR payload->'schemaVersion' IS DISTINCT FROM to_jsonb(NEW."snapshotSchemaVersion") OR payload->>'source' IS DISTINCT FROM 'ANS_AGRI_SAVED_RECORD_ARCHIVE' OR payload->'includesOnsite' IS DISTINCT FROM to_jsonb(NEW."snapshotSchemaVersion"=2) OR payload->>'archiveId' IS DISTINCT FROM NEW.id OR payload->'sequence' IS DISTINCT FROM to_jsonb(NEW.sequence) OR payload->'previousArchiveId' IS DISTINCT FROM COALESCE(to_jsonb(NEW."previousArchiveId"),'null'::jsonb) OR payload->>'createdById' IS DISTINCT FROM NEW."createdById" OR (payload->>'collectedAt')::timestamptz IS DISTINCT FROM NEW."collectedAt" THEN RAISE EXCEPTION 'AGRI_ARCHIVE_SNAPSHOT_MISMATCH'; END IF;
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
 IF NEW."snapshotSchemaVersion"=2 THEN
  IF jsonb_typeof(payload->'onsite') IS DISTINCT FROM 'object' OR jsonb_typeof(payload#>'{onsite,items}') IS DISTINCT FROM 'array' OR jsonb_typeof(payload#>'{onsite,events}') IS DISTINCT FROM 'array' OR jsonb_array_length(payload#>'{onsite,items}')>100 OR jsonb_array_length(payload#>'{onsite,events}')>100 THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_INVALID'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload#>'{onsite,items}') LOOP
   IF NOT EXISTS(SELECT 1 FROM agri_onsite_items i LEFT JOIN agri_demo_checks d ON d.id=i."demoCheckId" WHERE i.id=item->>'id' AND i."submissionId"=NEW."submissionId" AND i."competitionId"=NEW."competitionId" AND i.revision=(item->>'revision')::integer AND i."createdById"=item->>'createdById' AND i."demoCheckId" IS NOT DISTINCT FROM item->>'demoCheckId' AND i.published=(item->>'published')::boolean AND i.fields-'schemaVersion'=item->'fields' AND (d.id IS NULL OR ((d.basis='METADATA' OR NEW."includePrivate") AND (d."internalNote" IS NULL OR NEW."includeInternal")))) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_SOURCE_MISMATCH'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(payload#>'{onsite,events}') LOOP
   IF NOT EXISTS(SELECT 1 FROM agri_onsite_events e JOIN agri_onsite_items i ON i.id=e."itemId" WHERE e.id=item->>'id' AND e."itemId"=item->>'itemId' AND e.revision=(item->>'revision')::integer AND e."actorId"=item->>'actorId' AND e.action=item->>'action' AND e.published=(item->>'published')::boolean AND e.fields-'schemaVersion'=item->'fields' AND i."submissionId"=NEW."submissionId" AND e."competitionId"=NEW."competitionId" AND EXISTS(SELECT 1 FROM jsonb_array_elements(payload#>'{onsite,items}') stored WHERE stored->>'id'=e."itemId")) THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_EVENT_MISMATCH'; END IF;
  END LOOP;
 ELSIF payload ? 'onsite' THEN RAISE EXCEPTION 'AGRI_ARCHIVE_ONSITE_VERSION_MISMATCH'; END IF;
 RETURN NEW;
END;
$$;
COMMIT;
