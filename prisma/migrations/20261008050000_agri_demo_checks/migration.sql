-- Additive, exact-submission Demo records. No fixtures, grants or official rules.
CREATE FUNCTION agri_demo_snapshot_valid(value JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB; item_key TEXT; status TEXT; statuses TEXT[] := ARRAY[]::TEXT[]; due_state TEXT;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'object' OR value->'schemaVersion' IS DISTINCT FROM '1'::jsonb
 OR (SELECT count(*) FROM jsonb_object_keys(value))<>10
 OR NOT value ?& ARRAY['schemaVersion','mode','description','device','compatibility','network','audio','backup','conclusion','recheckDue']
 THEN RETURN false; END IF;
 IF value->>'mode' IS NULL OR value->>'mode' NOT IN ('LIVE','VIDEO','HYBRID','OTHER') OR jsonb_typeof(value->'description') IS DISTINCT FROM 'string'
 OR length(btrim(value->>'description')) NOT BETWEEN 1 AND 2000 THEN RETURN false; END IF;
 FOREACH item_key IN ARRAY ARRAY['device','compatibility','network','audio','backup'] LOOP
  item := value->item_key;
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT item ?& ARRAY['status','note']
  OR (SELECT count(*) FROM jsonb_object_keys(item))<>(CASE WHEN item_key='backup' THEN 4 ELSE 2 END)
  OR jsonb_typeof(item->'note') IS DISTINCT FROM 'string' OR length(item->>'note')>2000 THEN RETURN false; END IF;
  status := item->>'status';
  IF status IS NULL OR status NOT IN ('PASS','NEEDS_ACTION','UNREACHABLE','NOT_APPLICABLE','NOT_TESTED') THEN RETURN false; END IF;
  statuses := array_append(statuses,status);
 END LOOP;
 item := value->'backup';
 IF NOT item ?& ARRAY['url','artifactVersionId'] OR jsonb_typeof(item->'url') NOT IN ('null','string')
 OR jsonb_typeof(item->'artifactVersionId') NOT IN ('null','string') THEN RETURN false; END IF;
 IF jsonb_typeof(item->'url')='string' AND (length(item->>'url') NOT BETWEEN 1 AND 2048 OR item->>'url' !~ '^https://[^/?#@[:space:]]+(/[^?#[:space:]]*)?$') THEN RETURN false; END IF;
 IF jsonb_typeof(item->'artifactVersionId')='string' AND length(btrim(item->>'artifactVersionId')) NOT BETWEEN 1 AND 80 THEN RETURN false; END IF;
 item := value->'recheckDue'; due_state := item->>'state';
 IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT item ?& ARRAY['state','at'] OR (SELECT count(*) FROM jsonb_object_keys(item))<>2
 OR due_state IS NULL OR due_state NOT IN ('UNKNOWN','TENTATIVE','CONFIRMED') THEN RETURN false; END IF;
 IF due_state='UNKNOWN' THEN
  IF jsonb_typeof(item->'at') IS DISTINCT FROM 'null' THEN RETURN false; END IF;
 ELSE
  IF jsonb_typeof(item->'at') IS DISTINCT FROM 'string' OR item->>'at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' THEN RETURN false; END IF;
  PERFORM (item->>'at')::timestamptz;
 END IF;
 IF value->>'conclusion'='PASS' THEN RETURN 'PASS'=ANY(statuses) AND statuses<@ARRAY['PASS','NOT_APPLICABLE']::TEXT[] AND due_state='UNKNOWN'; END IF;
 IF value->>'conclusion'='UNREACHABLE' THEN RETURN 'UNREACHABLE'=ANY(statuses); END IF;
 IF value->>'conclusion'='NEEDS_ACTION' THEN RETURN statuses&&ARRAY['NEEDS_ACTION','NOT_TESTED']::TEXT[]; END IF;
 RETURN false;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;
CREATE TABLE agri_demo_checks (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"entryStageId" TEXT NOT NULL,"submissionId" TEXT NOT NULL,
 sequence INTEGER NOT NULL,"recheckOfId" TEXT UNIQUE,result VARCHAR(16) NOT NULL,basis VARCHAR(24) NOT NULL,demo JSONB NOT NULL,"internalNote" TEXT,
 "checkedById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"checkedAt" TIMESTAMPTZ(3) NOT NULL,
 UNIQUE (id,"competitionId"),UNIQUE (id,"submissionId","entryStageId","competitionId"),UNIQUE ("submissionId",sequence),
 UNIQUE ("recheckOfId","submissionId","entryStageId","competitionId"),
 FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("recheckOfId","submissionId","entryStageId","competitionId") REFERENCES agri_demo_checks(id,"submissionId","entryStageId","competitionId") ON DELETE RESTRICT,
 CHECK (sequence>=1 AND ((sequence=1 AND "recheckOfId" IS NULL) OR (sequence>1 AND "recheckOfId" IS NOT NULL))),
 CHECK (result IN ('PASS','NEEDS_ACTION','UNREACHABLE') AND basis IN ('METADATA','PRIVATE_MATERIALS')),
 CHECK ((agri_demo_snapshot_valid(demo) AND result=demo->>'conclusion') IS TRUE),
 CHECK ((basis='PRIVATE_MATERIALS' OR (demo->'backup'->'url'='null'::jsonb AND demo->'backup'->'artifactVersionId'='null'::jsonb)) IS TRUE),
 CHECK ("internalNote" IS NULL OR length(btrim("internalNote")) BETWEEN 1 AND 4000)
);
CREATE INDEX "agri_demo_checks_competitionId_submissionId_checkedAt_id_idx" ON agri_demo_checks("competitionId","submissionId","checkedAt",id);
CREATE TABLE agri_demo_feedback_events (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"checkId" TEXT NOT NULL,sequence INTEGER NOT NULL,action VARCHAR(16) NOT NULL,body TEXT,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("checkId","competitionId") REFERENCES agri_demo_checks(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE ("checkId",sequence),UNIQUE (id,"checkId","competitionId"),
 CHECK (sequence>=1 AND ((action='PUBLISH' AND body IS NOT NULL AND length(btrim(body)) BETWEEN 1 AND 4000) OR (action='WITHDRAW' AND body IS NULL)))
);
CREATE TABLE agri_demo_events (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"checkId" TEXT NOT NULL,action VARCHAR(32) NOT NULL,"appliedSequence" INTEGER NOT NULL,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("checkId","competitionId") REFERENCES agri_demo_checks(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE(id,"checkId","competitionId"),
 CHECK ((action='recordDemoCheck' AND "appliedSequence"=0) OR (action IN ('publishDemoFeedback','withdrawDemoFeedback') AND "appliedSequence">=1))
);
CREATE TABLE agri_demo_receipts (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"checkId" TEXT NOT NULL,"eventId" TEXT NOT NULL UNIQUE,"feedbackEventId" TEXT,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,operation VARCHAR(32) NOT NULL,"idempotencyKey" VARCHAR(36) NOT NULL,"requestHash" VARCHAR(64) NOT NULL,
 "appliedSequence" INTEGER NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("checkId","competitionId") REFERENCES agri_demo_checks(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("eventId","checkId","competitionId") REFERENCES agri_demo_events(id,"checkId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY ("feedbackEventId","checkId","competitionId") REFERENCES agri_demo_feedback_events(id,"checkId","competitionId") ON DELETE RESTRICT,
 UNIQUE ("competitionId","actorId",operation,"idempotencyKey"),UNIQUE ("eventId","checkId","competitionId"),
 CHECK ("requestHash" ~ '^[a-f0-9]{64}$' AND ((operation='recordDemoCheck' AND "feedbackEventId" IS NULL AND "appliedSequence"=0)
 OR (operation IN ('publishDemoFeedback','withdrawDemoFeedback') AND "feedbackEventId" IS NOT NULL AND "appliedSequence">=1)))
);
CREATE FUNCTION agri_demo_chain_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE latest_id TEXT; latest_sequence INTEGER; backup_id TEXT;
BEGIN
 PERFORM 1 FROM agri_entry_stages WHERE id=NEW."entryStageId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 SELECT id,sequence INTO latest_id,latest_sequence FROM agri_demo_checks WHERE "submissionId"=NEW."submissionId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(latest_sequence,0)+1 OR NEW."recheckOfId" IS DISTINCT FROM latest_id THEN RAISE EXCEPTION 'AGRI_DEMO_CHAIN_INVALID'; END IF;
 backup_id := NEW.demo->'backup'->>'artifactVersionId';
 IF backup_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agri_stage_submissions s WHERE s.id=NEW."submissionId" AND s."competitionId"=NEW."competitionId" AND s."artifactVersionId"=backup_id)
 AND NOT EXISTS (SELECT 1 FROM agri_submission_material_refs r WHERE r."submissionId"=NEW."submissionId" AND r."competitionId"=NEW."competitionId" AND r."artifactVersionId"=backup_id)
 THEN RAISE EXCEPTION 'AGRI_DEMO_BACKUP_VERSION_UNAVAILABLE'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_demo_chain_guard BEFORE INSERT ON agri_demo_checks FOR EACH ROW EXECUTE FUNCTION agri_demo_chain_guard();
CREATE FUNCTION agri_demo_feedback_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_sequence INTEGER; previous_action TEXT;
BEGIN
 PERFORM 1 FROM agri_demo_checks WHERE id=NEW."checkId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 SELECT sequence,action INTO previous_sequence,previous_action FROM agri_demo_feedback_events WHERE "checkId"=NEW."checkId" ORDER BY sequence DESC LIMIT 1;
 IF NEW.sequence<>COALESCE(previous_sequence,0)+1 OR (NEW.action='WITHDRAW' AND previous_action IS DISTINCT FROM 'PUBLISH') THEN RAISE EXCEPTION 'AGRI_DEMO_FEEDBACK_SEQUENCE_INVALID'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_demo_feedback_guard BEFORE INSERT ON agri_demo_feedback_events FOR EACH ROW EXECUTE FUNCTION agri_demo_feedback_guard();
CREATE FUNCTION agri_demo_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM agri_demo_events WHERE id=NEW."eventId" AND "checkId"=NEW."checkId" AND "competitionId"=NEW."competitionId" AND "actorId"=NEW."actorId" AND action=NEW.operation AND "appliedSequence"=NEW."appliedSequence") THEN RAISE EXCEPTION 'AGRI_DEMO_RECEIPT_EVENT_MISMATCH'; END IF;
 IF NEW.operation='recordDemoCheck' THEN
  IF NOT EXISTS (SELECT 1 FROM agri_demo_checks WHERE id=NEW."checkId" AND "competitionId"=NEW."competitionId" AND "checkedById"=NEW."actorId") THEN RAISE EXCEPTION 'AGRI_DEMO_RECEIPT_MISMATCH'; END IF;
 ELSE
  IF NOT EXISTS (SELECT 1 FROM agri_demo_feedback_events WHERE id=NEW."feedbackEventId" AND "checkId"=NEW."checkId" AND "competitionId"=NEW."competitionId" AND "actorId"=NEW."actorId" AND sequence=NEW."appliedSequence" AND action=CASE NEW.operation WHEN 'publishDemoFeedback' THEN 'PUBLISH' ELSE 'WITHDRAW' END) THEN RAISE EXCEPTION 'AGRI_DEMO_RECEIPT_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_demo_receipt_guard BEFORE INSERT ON agri_demo_receipts FOR EACH ROW EXECUTE FUNCTION agri_demo_receipt_guard();
CREATE TRIGGER agri_demo_check_immutable BEFORE UPDATE OR DELETE ON agri_demo_checks FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_demo_feedback_immutable BEFORE UPDATE OR DELETE ON agri_demo_feedback_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_demo_event_immutable BEFORE UPDATE OR DELETE ON agri_demo_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_demo_receipt_immutable BEFORE UPDATE OR DELETE ON agri_demo_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();

-- Prevent otherwise valid records being committed without their command event/receipt.
CREATE FUNCTION agri_demo_atomic_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='agri_demo_checks' THEN
  IF NOT EXISTS (SELECT 1 FROM agri_demo_receipts r JOIN agri_demo_events e ON e.id=r."eventId"
    WHERE r."checkId"=NEW.id AND r."competitionId"=NEW."competitionId" AND r.operation='recordDemoCheck'
      AND r."actorId"=NEW."checkedById" AND e."actorId"=NEW."checkedById" AND r."createdAt"=NEW."checkedAt" AND e."createdAt"=NEW."checkedAt")
  THEN RAISE EXCEPTION 'AGRI_DEMO_ATOMIC_RECORD_REQUIRED'; END IF;
 ELSIF TG_TABLE_NAME='agri_demo_feedback_events' THEN
  IF NOT EXISTS (SELECT 1 FROM agri_demo_receipts r JOIN agri_demo_events e ON e.id=r."eventId"
    WHERE r."feedbackEventId"=NEW.id AND r."checkId"=NEW."checkId" AND r."competitionId"=NEW."competitionId"
      AND r."actorId"=NEW."actorId" AND e."actorId"=NEW."actorId" AND r."appliedSequence"=NEW.sequence
      AND r.operation=CASE NEW.action WHEN 'PUBLISH' THEN 'publishDemoFeedback' ELSE 'withdrawDemoFeedback' END
      AND r."createdAt"=NEW."createdAt" AND e."createdAt"=NEW."createdAt")
  THEN RAISE EXCEPTION 'AGRI_DEMO_ATOMIC_FEEDBACK_REQUIRED'; END IF;
 ELSE
  IF NOT EXISTS (SELECT 1 FROM agri_demo_receipts r WHERE r."eventId"=NEW.id AND r."competitionId"=NEW."competitionId"
    AND r."checkId"=NEW."checkId" AND r."actorId"=NEW."actorId" AND r.operation=NEW.action AND r."appliedSequence"=NEW."appliedSequence" AND r."createdAt"=NEW."createdAt")
  THEN RAISE EXCEPTION 'AGRI_DEMO_ATOMIC_EVENT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER agri_demo_atomic_check AFTER INSERT ON agri_demo_checks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_demo_atomic_guard();
CREATE CONSTRAINT TRIGGER agri_demo_atomic_feedback AFTER INSERT ON agri_demo_feedback_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_demo_atomic_guard();
CREATE CONSTRAINT TRIGGER agri_demo_atomic_event AFTER INSERT ON agri_demo_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_demo_atomic_guard();
