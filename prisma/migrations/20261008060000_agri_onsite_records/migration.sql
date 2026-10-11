BEGIN;
-- Additive onsite safe collaboration. No accounts, official dates, eligibility or rules seeded.
ALTER TABLE agri_access_grants DROP CONSTRAINT agri_grant_valid;
ALTER TABLE agri_access_grants ADD CONSTRAINT agri_grant_valid CHECK (revision>=1 AND scope IN ('WORKS_READ','PRIVATE_MATERIALS_READ','TECHNICAL_WRITE','INTERNAL_NOTES_READ','ISSUES_WRITE','DEMO_WRITE','ONSITE_READ','ONSITE_WRITE','ARCHIVE_WRITE','EXPORT','RULES_CONFIRM','ACCESS_MANAGE')
 AND ("expiresAt" IS NULL OR "expiresAt">"grantedAt") AND (("sourceGrantId" IS NULL AND "sourceRevision" IS NULL AND "managerGrantId" IS NULL AND "managerRevision" IS NULL) OR
 ("sourceGrantId" IS NOT NULL AND "sourceRevision" IS NOT NULL AND "sourceRevision">=1 AND "managerGrantId" IS NOT NULL AND "managerRevision" IS NOT NULL AND "managerRevision">=1 AND scope<>'ACCESS_MANAGE' AND "sourceGrantId"<>id AND "managerGrantId"<>id)));
CREATE FUNCTION agri_onsite_fields_valid(value JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE operations JSONB; schedule JSONB; text_value TEXT; key_name TEXT;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(value))<>6 OR NOT value ?& ARRAY['title','mode','summary','backupSummary','operations','schemaVersion'] OR value->'schemaVersion'<>'1'::jsonb THEN RETURN false; END IF;
 FOR key_name IN SELECT unnest(ARRAY['title','summary','backupSummary']) LOOP
  IF jsonb_typeof(value->key_name) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  text_value:=value->>key_name;
  IF length(text_value)>(CASE key_name WHEN 'title' THEN 180 ELSE 2000 END) OR (key_name='title' AND length(btrim(text_value))=0) OR text_value ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})' THEN RETURN false; END IF;
 END LOOP;
 IF value->>'mode' NOT IN ('LIVE','VIDEO','HYBRID','OTHER') OR jsonb_typeof(value->'mode') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 operations:=value->'operations'; schedule:=operations->'schedule';
 IF jsonb_typeof(operations) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(operations))<>5 OR NOT operations ?& ARRAY['device','conditions','schedule','status','result'] THEN RETURN false; END IF;
 FOR key_name IN SELECT unnest(ARRAY['device','conditions']) LOOP
  IF jsonb_typeof(operations->key_name) IS DISTINCT FROM 'string' OR length(operations->>key_name)>2000 OR operations->>key_name ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})' THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(schedule) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(schedule))<>2 OR NOT schedule ?& ARRAY['state','at'] OR jsonb_typeof(schedule->'state') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 IF schedule->>'state'='UNKNOWN' THEN IF schedule->'at'<>'null'::jsonb THEN RETURN false; END IF;
 ELSIF schedule->>'state' IN ('TENTATIVE','CONFIRMED') THEN
  IF jsonb_typeof(schedule->'at') IS DISTINCT FROM 'string' OR (schedule->>'at') !~ '^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:\d{2})$' THEN RETURN false; END IF;
  BEGIN PERFORM (schedule->>'at')::timestamptz; EXCEPTION WHEN OTHERS THEN RETURN false; END;
 ELSE RETURN false; END IF;
 IF jsonb_typeof(operations->'status') IS DISTINCT FROM 'string' OR operations->>'status' NOT IN ('NOT_STARTED','IN_PROGRESS','BLOCKED','DONE') THEN RETURN false; END IF;
 IF operations->>'status'='DONE' THEN
  IF jsonb_typeof(operations->'result') IS DISTINCT FROM 'string' OR length(btrim(operations->>'result')) NOT BETWEEN 1 AND 2000 OR operations->>'result' ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})' THEN RETURN false; END IF;
 ELSIF operations->'result'<>'null'::jsonb THEN RETURN false; END IF;
 RETURN true;
END;
$$;
CREATE TABLE agri_onsite_items (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"entryStageId" TEXT NOT NULL,"submissionId" TEXT NOT NULL,"demoCheckId" TEXT,
 fields JSONB NOT NULL,published BOOLEAN NOT NULL DEFAULT false,revision INTEGER NOT NULL,"createdById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,"updatedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY("demoCheckId","submissionId","entryStageId","competitionId") REFERENCES agri_demo_checks(id,"submissionId","entryStageId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 UNIQUE(id,"competitionId"),CHECK(revision BETWEEN 1 AND 2147483646 AND "updatedAt">="createdAt" AND agri_onsite_fields_valid(fields))
);
CREATE INDEX agri_onsite_items_published_idx ON agri_onsite_items("competitionId",published,"createdAt",id);
CREATE INDEX agri_onsite_items_submission_idx ON agri_onsite_items("competitionId","submissionId","createdAt",id);
CREATE TABLE agri_onsite_events (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"itemId" TEXT NOT NULL,revision INTEGER NOT NULL,action VARCHAR(32) NOT NULL,fields JSONB NOT NULL,published BOOLEAN NOT NULL,"actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("itemId","competitionId") REFERENCES agri_onsite_items(id,"competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 UNIQUE("itemId",revision),UNIQUE(id,"itemId","competitionId"),CHECK(revision BETWEEN 1 AND 2147483646 AND action IN ('createOnsite','editOnsiteDraft','publishOnsite','withdrawOnsite','updateOnsiteOperations') AND agri_onsite_fields_valid(fields))
);
CREATE TABLE agri_onsite_receipts (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"itemId" TEXT NOT NULL,"eventId" TEXT NOT NULL UNIQUE,"actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,operation VARCHAR(32) NOT NULL,"idempotencyKey" VARCHAR(36) NOT NULL,"requestHash" VARCHAR(64) NOT NULL,"appliedRevision" INTEGER NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("itemId","competitionId") REFERENCES agri_onsite_items(id,"competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY("eventId","itemId","competitionId") REFERENCES agri_onsite_events(id,"itemId","competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
 UNIQUE("competitionId","actorId",operation,"idempotencyKey"),CHECK("appliedRevision" BETWEEN 1 AND 2147483646 AND "requestHash" ~ '^[a-f0-9]{64}$' AND operation IN ('createOnsite','editOnsiteDraft','publishOnsite','withdrawOnsite','updateOnsiteOperations'))
);
CREATE FUNCTION agri_onsite_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_ONSITE_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN IF NEW.revision<>1 OR NEW.published THEN RAISE EXCEPTION 'AGRI_ONSITE_CREATE_INVALID'; END IF;
 ELSIF (NEW.id,NEW."competitionId",NEW."entryStageId",NEW."submissionId",NEW."demoCheckId",NEW."createdById",NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."competitionId",OLD."entryStageId",OLD."submissionId",OLD."demoCheckId",OLD."createdById",OLD."createdAt") OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'AGRI_ONSITE_IDENTITY_OR_REVISION'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_onsite_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_onsite_items FOR EACH ROW EXECUTE FUNCTION agri_onsite_identity_guard();
CREATE TRIGGER agri_onsite_event_immutable BEFORE UPDATE OR DELETE ON agri_onsite_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_onsite_receipt_immutable BEFORE UPDATE OR DELETE ON agri_onsite_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE FUNCTION agri_onsite_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item agri_onsite_items%ROWTYPE; previous agri_onsite_events%ROWTYPE;
BEGIN
 SELECT * INTO item FROM agri_onsite_items WHERE id=NEW."itemId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 SELECT * INTO previous FROM agri_onsite_events WHERE "itemId"=NEW."itemId" ORDER BY revision DESC LIMIT 1;
 IF NEW.revision<>item.revision OR NEW.revision<>COALESCE(previous.revision,0)+1 OR NEW.fields IS DISTINCT FROM item.fields OR NEW.published IS DISTINCT FROM item.published OR NEW."createdAt"<>item."updatedAt" THEN RAISE EXCEPTION 'AGRI_ONSITE_EVENT_INVALID'; END IF;
 IF NEW.action='createOnsite' THEN IF NEW.revision<>1 OR NEW.published OR NEW."actorId"<>item."createdById" THEN RAISE EXCEPTION 'AGRI_ONSITE_EVENT_INVALID'; END IF;
 ELSIF previous.id IS NULL THEN RAISE EXCEPTION 'AGRI_ONSITE_EVENT_INVALID';
 ELSIF NEW.action='editOnsiteDraft' THEN IF previous.published OR NEW.published THEN RAISE EXCEPTION 'AGRI_ONSITE_DRAFT_REQUIRED'; END IF;
 ELSIF NEW.action='publishOnsite' THEN IF previous.published OR NOT NEW.published OR NEW.fields IS DISTINCT FROM previous.fields THEN RAISE EXCEPTION 'AGRI_ONSITE_PUBLICATION_INVALID'; END IF;
 ELSIF NEW.action='withdrawOnsite' THEN IF NOT previous.published OR NEW.published OR NEW.fields IS DISTINCT FROM previous.fields THEN RAISE EXCEPTION 'AGRI_ONSITE_PUBLICATION_INVALID'; END IF;
 ELSE IF NOT previous.published OR NOT NEW.published OR (NEW.fields-'operations') IS DISTINCT FROM (previous.fields-'operations') THEN RAISE EXCEPTION 'AGRI_ONSITE_OPERATIONS_INVALID'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_onsite_event_guard BEFORE INSERT ON agri_onsite_events FOR EACH ROW EXECUTE FUNCTION agri_onsite_event_guard();
CREATE FUNCTION agri_onsite_atomic_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id TEXT; target_competition TEXT; target_revision INTEGER;
BEGIN
 IF TG_TABLE_NAME='agri_onsite_items' THEN target_id:=NEW.id; ELSE target_id:=NEW."itemId"; END IF;
 target_competition:=NEW."competitionId"; target_revision:=NEW.revision;
 IF NOT EXISTS (SELECT 1 FROM agri_onsite_events e JOIN agri_onsite_receipts r ON r."eventId"=e.id AND r."itemId"=e."itemId" AND r."competitionId"=e."competitionId" WHERE e."itemId"=target_id AND e."competitionId"=target_competition AND e.revision=target_revision AND r."appliedRevision"=e.revision AND r.operation=e.action AND r."actorId"=e."actorId" AND r."createdAt"=e."createdAt") THEN RAISE EXCEPTION 'AGRI_ONSITE_ATOMIC_RECORD_REQUIRED'; END IF;
 RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER agri_onsite_atomic_item AFTER INSERT OR UPDATE ON agri_onsite_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_onsite_atomic_guard();
CREATE CONSTRAINT TRIGGER agri_onsite_atomic_event AFTER INSERT ON agri_onsite_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_onsite_atomic_guard();
CREATE FUNCTION agri_onsite_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agri_onsite_events WHERE id=NEW."eventId" AND "itemId"=NEW."itemId" AND "competitionId"=NEW."competitionId" AND "actorId"=NEW."actorId" AND action=NEW.operation AND revision=NEW."appliedRevision" AND "createdAt"=NEW."createdAt") THEN RAISE EXCEPTION 'AGRI_ONSITE_RECEIPT_MISMATCH'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_onsite_receipt_guard BEFORE INSERT ON agri_onsite_receipts FOR EACH ROW EXECUTE FUNCTION agri_onsite_receipt_guard();

COMMIT;
