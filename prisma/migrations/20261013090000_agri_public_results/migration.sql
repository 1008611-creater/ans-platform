-- Additive opt-in public-safe results; no seeds, grants, XP or payment writes.
ALTER TABLE agri_access_grants DROP CONSTRAINT agri_grant_valid;
ALTER TABLE agri_access_grants ADD CONSTRAINT agri_grant_valid CHECK (revision >= 1 AND scope IN
 ('WORKS_READ','PRIVATE_MATERIALS_READ','TECHNICAL_WRITE','INTERNAL_NOTES_READ','ISSUES_WRITE','DEMO_WRITE','ONSITE_READ','ONSITE_WRITE','ARCHIVE_WRITE','EXPORT','RULES_CONFIRM','ACCESS_MANAGE','PUBLICATIONS_REVIEW')
 AND ("expiresAt" IS NULL OR "expiresAt">"grantedAt")
 AND (("sourceGrantId" IS NULL AND "sourceRevision" IS NULL AND "managerGrantId" IS NULL AND "managerRevision" IS NULL)
 OR ("sourceGrantId" IS NOT NULL AND "sourceRevision" IS NOT NULL AND "sourceRevision">=1 AND "managerGrantId" IS NOT NULL AND "managerRevision" IS NOT NULL AND "managerRevision">=1 AND scope<>'ACCESS_MANAGE' AND "sourceGrantId"<>id AND "managerGrantId"<>id)));
CREATE FUNCTION agri_publication_url_valid(value TEXT) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
 SELECT value IS NULL OR (length(value)<=2048 AND value ~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z][A-Za-z0-9-]+(:[0-9]{1,5})?(/[^[:space:]?#@\\]*)?$'
 AND value !~* '^https://([^/]*\.)?(localhost|local|internal)(:[0-9]+)?(/|$)'
 AND value !~* '^https://(ans|ans-preview)\.cauai\.fun(:[0-9]+)?(/|$)' AND value !~* '%(2f|5c|00|0a|0d)');
$$;
CREATE TABLE agri_publications (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 "entryStageId" TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 FOREIGN KEY("entryStageId","competitionId") REFERENCES agri_entry_stages(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE(id,"entryStageId","competitionId")
);
CREATE TABLE agri_publication_events (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL,"entryStageId" TEXT NOT NULL,"publicationId" TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>=1), action VARCHAR(16) NOT NULL,
 "submissionId" TEXT NOT NULL,"artifactVersionId" TEXT NOT NULL REFERENCES artifact_versions(id) ON DELETE RESTRICT,
 "consentEventId" TEXT REFERENCES agri_publication_events(id) ON DELETE RESTRICT, content JSONB, reason TEXT,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("publicationId","entryStageId","competitionId") REFERENCES agri_publications(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE("publicationId",revision),UNIQUE(id,"publicationId","entryStageId","competitionId"),
 CHECK((action='REQUEST' AND "consentEventId" IS NULL AND content IS NOT NULL AND reason IS NULL)
 OR (action IN('APPROVE','REJECT','WITHDRAW') AND "consentEventId" IS NOT NULL AND content IS NULL AND reason IS NOT NULL AND length(btrim(reason)) BETWEEN 1 AND 2000)),
 CHECK(content IS NULL OR (jsonb_typeof(content)='object' AND content ?& ARRAY['title','summary','teamName','track','repositoryUrl','demoUrl']
 AND content - ARRAY['title','summary','teamName','track','repositoryUrl','demoUrl']='{}'::jsonb
 AND jsonb_typeof(content->'title')='string' AND length(btrim(content->>'title')) BETWEEN 1 AND 160
 AND jsonb_typeof(content->'summary')='string' AND length(btrim(content->>'summary')) BETWEEN 1 AND 2000
 AND jsonb_typeof(content->'teamName')='string' AND length(btrim(content->>'teamName')) BETWEEN 1 AND 120
 AND jsonb_typeof(content->'track')='string' AND content->>'track' IN('PEOPLE','DISCOVERY','ACTION')
 AND agri_publication_url_valid(content->>'repositoryUrl') AND agri_publication_url_valid(content->>'demoUrl')
 AND jsonb_typeof(content->'repositoryUrl') IN('string','null') AND jsonb_typeof(content->'demoUrl') IN('string','null')))
);
CREATE TABLE agri_publication_receipts (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"entryStageId" TEXT NOT NULL,"publicationId" TEXT NOT NULL,"eventId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,operation VARCHAR(32) NOT NULL,"idempotencyKey" VARCHAR(36) NOT NULL,
 "requestHash" VARCHAR(64) NOT NULL CHECK("requestHash" ~ '^[a-f0-9]{64}$'),"appliedRevision" INTEGER NOT NULL CHECK("appliedRevision">=1),"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("publicationId","entryStageId","competitionId") REFERENCES agri_publications(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("eventId","publicationId","entryStageId","competitionId") REFERENCES agri_publication_events(id,"publicationId","entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE("competitionId","actorId",operation,"idempotencyKey"),CHECK(operation IN('requestPublication','reviewPublication','withdrawPublication'))
);
CREATE TRIGGER agri_publication_event_immutable BEFORE UPDATE OR DELETE ON agri_publication_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_publication_receipt_immutable BEFORE UPDATE OR DELETE ON agri_publication_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE FUNCTION agri_publication_head_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR NEW.id<>OLD.id OR NEW."entryStageId"<>OLD."entryStageId" OR NEW."competitionId"<>OLD."competitionId" OR NEW.revision<>OLD.revision+1
 THEN RAISE EXCEPTION 'AGRI_PUBLICATION_HEAD_INVALID'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER agri_publication_head_guard BEFORE UPDATE OR DELETE ON agri_publications FOR EACH ROW EXECUTE FUNCTION agri_publication_head_guard();
CREATE FUNCTION agri_publication_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h agri_publications; prior agri_publication_events; consent agri_publication_events; s agri_stage_submissions; current_id TEXT; frozen_id TEXT;
BEGIN
 SELECT * INTO h FROM agri_publications WHERE id=NEW."publicationId" FOR UPDATE;
 SELECT * INTO prior FROM agri_publication_events WHERE "publicationId"=h.id ORDER BY revision DESC LIMIT 1;
 SELECT * INTO s FROM agri_stage_submissions WHERE id=NEW."submissionId" AND "entryStageId"=NEW."entryStageId" AND "competitionId"=NEW."competitionId";
 SELECT "currentSubmissionId","frozenSubmissionId" INTO current_id,frozen_id FROM agri_entry_stages WHERE id=NEW."entryStageId" AND "competitionId"=NEW."competitionId";
 IF NEW.revision<>h.revision+1 OR NEW.revision<>COALESCE(prior.revision,0)+1 OR NEW."artifactVersionId" IS DISTINCT FROM s."artifactVersionId"
 THEN RAISE EXCEPTION 'AGRI_PUBLICATION_SEQUENCE_SOURCE_INVALID'; END IF;
 IF NEW.action='REQUEST' THEN
  IF (current_id IS DISTINCT FROM NEW."submissionId" AND frozen_id IS DISTINCT FROM NEW."submissionId") OR NOT EXISTS(SELECT 1 FROM projects p JOIN team_competitions tc ON tc."teamId"=p."teamId" JOIN agri_entry_stages es ON es."teamCompetitionId"=tc.id
    JOIN team_members m ON m."teamId"=tc."teamId" AND m."userId"=NEW."actorId" AND m.status='ACTIVE' AND m.role IN('OWNER','ADMIN')
    WHERE es.id=NEW."entryStageId" AND p.id=s."projectId" AND p."ownerId"=NEW."actorId" AND p.status='ACTIVE')
    OR ((NEW.content->>'repositoryUrl') IS NOT NULL AND (NEW.content->>'repositoryUrl') IS DISTINCT FROM s.repository->>'url')
    OR ((NEW.content->>'demoUrl') IS NOT NULL AND (NEW.content->>'demoUrl') IS DISTINCT FROM s."demoUrl")
  THEN RAISE EXCEPTION 'AGRI_PUBLICATION_CONSENT_SOURCE_INVALID'; END IF;
 ELSE
  SELECT * INTO consent FROM agri_publication_events WHERE id=NEW."consentEventId";
  IF consent.action IS DISTINCT FROM 'REQUEST' OR consent."publicationId" IS DISTINCT FROM h.id OR consent."submissionId" IS DISTINCT FROM NEW."submissionId" OR consent."artifactVersionId" IS DISTINCT FROM NEW."artifactVersionId"
   OR (NEW.action IN('APPROVE','REJECT') AND (prior.id IS DISTINCT FROM consent.id OR NEW."actorId"=consent."actorId" OR (current_id IS DISTINCT FROM NEW."submissionId" AND frozen_id IS DISTINCT FROM NEW."submissionId")))
   OR (NEW.action='WITHDRAW' AND (prior.action='WITHDRAW' OR COALESCE(prior."consentEventId",prior.id) IS DISTINCT FROM consent.id))
  THEN RAISE EXCEPTION 'AGRI_PUBLICATION_TRANSITION_INVALID'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER agri_publication_event_guard BEFORE INSERT ON agri_publication_events FOR EACH ROW EXECUTE FUNCTION agri_publication_event_guard();
CREATE FUNCTION agri_publication_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agri_publication_events e WHERE e.id=NEW."eventId" AND e."actorId"=NEW."actorId" AND e.revision=NEW."appliedRevision"
  AND e.action=CASE NEW.operation WHEN 'requestPublication' THEN 'REQUEST' WHEN 'withdrawPublication' THEN 'WITHDRAW' ELSE e.action END
  AND (NEW.operation<>'reviewPublication' OR e.action IN('APPROVE','REJECT')))
 THEN RAISE EXCEPTION 'AGRI_PUBLICATION_RECEIPT_INVALID'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER agri_publication_receipt_guard BEFORE INSERT ON agri_publication_receipts FOR EACH ROW EXECUTE FUNCTION agri_publication_receipt_guard();
CREATE FUNCTION agri_publication_complete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target TEXT; n INTEGER; max_rev INTEGER; head_rev INTEGER;
BEGIN
 IF TG_TABLE_NAME='agri_publications' THEN target:=NEW.id; ELSE target:=NEW."publicationId"; END IF;
 SELECT revision INTO head_rev FROM agri_publications WHERE id=target;
 SELECT count(*),max(revision) INTO n,max_rev FROM agri_publication_events WHERE "publicationId"=target;
 IF head_rev<1 OR n<>head_rev OR max_rev<>head_rev OR EXISTS(SELECT 1 FROM agri_publication_events e WHERE e."publicationId"=target AND NOT EXISTS(SELECT 1 FROM agri_publication_receipts r WHERE r."eventId"=e.id))
 THEN RAISE EXCEPTION 'AGRI_PUBLICATION_INCOMPLETE'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER agri_publication_complete_guard AFTER INSERT OR UPDATE ON agri_publications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_publication_complete_guard();
CREATE CONSTRAINT TRIGGER agri_publication_event_complete_guard AFTER INSERT ON agri_publication_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_publication_complete_guard();
