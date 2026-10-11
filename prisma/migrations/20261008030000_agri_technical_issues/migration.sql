-- Submission-bound issues; no publication, eligibility, rewards or compute side effects.
CREATE TABLE agri_issues (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "submissionId" TEXT NOT NULL,
 title VARCHAR(180) NOT NULL, body TEXT NOT NULL, status VARCHAR(20) NOT NULL, severity VARCHAR(16) NOT NULL, type VARCHAR(20) NOT NULL,
 basis VARCHAR(24) NOT NULL, visibility VARCHAR(16) NOT NULL, "assigneeId" TEXT REFERENCES users(id) ON DELETE RESTRICT,
 "dueState" VARCHAR(16) NOT NULL, "dueAt" TIMESTAMPTZ(3), "processingSummary" TEXT,
 "completedById" TEXT REFERENCES users(id) ON DELETE RESTRICT, "completedAt" TIMESTAMPTZ(3), revision INTEGER NOT NULL,
 "createdById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "createdAt" TIMESTAMPTZ(3) NOT NULL, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT,
 UNIQUE(id,"competitionId"),
 CHECK(length(btrim(title)) BETWEEN 1 AND 180 AND length(btrim(body)) BETWEEN 1 AND 4000),
 CHECK(status IN ('OPEN','IN_PROGRESS','BLOCKED','RESOLVED','CLOSED') AND severity IN ('LOW','MEDIUM','HIGH','CRITICAL') AND type IN ('BUG','ENVIRONMENT','DATA','ACCESS','OTHER')),
 CHECK(basis IN ('METADATA','PRIVATE_MATERIALS') AND visibility IN ('TEAM','INTERNAL') AND revision>=1),
 CHECK(("dueState"='UNKNOWN' AND "dueAt" IS NULL) OR ("dueState" IN ('TENTATIVE','CONFIRMED') AND "dueAt" IS NOT NULL)),
 CHECK((status IN ('RESOLVED','CLOSED') AND "processingSummary" IS NOT NULL AND length(btrim("processingSummary")) BETWEEN 1 AND 4000 AND "completedById" IS NOT NULL AND "completedAt" IS NOT NULL)
   OR (status NOT IN ('RESOLVED','CLOSED') AND "processingSummary" IS NULL AND "completedById" IS NULL AND "completedAt" IS NULL))
);
CREATE INDEX agri_issues_submission_created_idx ON agri_issues("competitionId","submissionId","createdAt",id);
CREATE INDEX agri_issues_status_due_idx ON agri_issues("competitionId",status,"dueAt");
CREATE INDEX agri_issues_assignee_status_idx ON agri_issues("assigneeId",status);
CREATE TABLE agri_issue_events (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "issueId" TEXT NOT NULL, revision INTEGER NOT NULL,
 kind VARCHAR(16) NOT NULL, visibility VARCHAR(16) NOT NULL, basis VARCHAR(24) NOT NULL, body TEXT NOT NULL, "afterState" JSONB,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("issueId","competitionId") REFERENCES agri_issues(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE("issueId",revision), UNIQUE(id,"issueId","competitionId"),
 CHECK(revision>=1 AND kind IN ('CREATE','UPDATE','COMMENT') AND visibility IN ('TEAM','INTERNAL') AND basis IN ('METADATA','PRIVATE_MATERIALS') AND length(btrim(body)) BETWEEN 1 AND 4000),
 CHECK((kind='COMMENT' AND "afterState" IS NULL) OR (kind IN ('CREATE','UPDATE') AND "afterState" IS NOT NULL AND jsonb_typeof("afterState")='object'))
);
CREATE TABLE agri_issue_receipts (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "issueId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, operation VARCHAR(24) NOT NULL, "idempotencyKey" VARCHAR(36) NOT NULL,
 "requestHash" VARCHAR(64) NOT NULL, "appliedRevision" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("issueId","competitionId") REFERENCES agri_issues(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("eventId","issueId","competitionId") REFERENCES agri_issue_events(id,"issueId","competitionId") ON DELETE RESTRICT,
 UNIQUE("competitionId","actorId",operation,"idempotencyKey"),
 CHECK(operation IN ('createIssue','updateIssue','appendEvent') AND "appliedRevision">=1 AND "requestHash" ~ '^[a-f0-9]{64}$')
);
CREATE FUNCTION agri_issue_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_ISSUE_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW."competitionId" IS DISTINCT FROM OLD."competitionId" OR NEW."entryStageId" IS DISTINCT FROM OLD."entryStageId" OR NEW."submissionId" IS DISTINCT FROM OLD."submissionId" OR NEW.basis IS DISTINCT FROM OLD.basis OR NEW."createdById" IS DISTINCT FROM OLD."createdById" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" OR NEW.revision<>OLD.revision+1)
 THEN RAISE EXCEPTION 'AGRI_ISSUE_IDENTITY_OR_REVISION_INVALID'; END IF;
 IF TG_OP='INSERT' AND NEW.revision<>1 THEN RAISE EXCEPTION 'AGRI_ISSUE_REVISION_INVALID'; END IF;
 IF NEW."assigneeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id=NEW."assigneeId" AND NOT flagged AND "deletedAt" IS NULL) THEN RAISE EXCEPTION 'AGRI_ISSUE_ASSIGNEE_UNAVAILABLE'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_issue_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_issues FOR EACH ROW EXECUTE FUNCTION agri_issue_guard();
CREATE TRIGGER agri_issue_event_immutable BEFORE UPDATE OR DELETE ON agri_issue_events FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE TRIGGER agri_issue_receipt_immutable BEFORE UPDATE OR DELETE ON agri_issue_receipts FOR EACH ROW EXECUTE FUNCTION agri_foundation_immutable();
CREATE FUNCTION agri_issue_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_issue agri_issues%ROWTYPE; previous_revision INTEGER;
BEGIN
 SELECT * INTO row_issue FROM agri_issues WHERE id=NEW."issueId" AND "competitionId"=NEW."competitionId" FOR UPDATE;
 SELECT max(revision) INTO previous_revision FROM agri_issue_events WHERE "issueId"=NEW."issueId";
 IF NEW.revision<>row_issue.revision OR NEW.revision<>COALESCE(previous_revision,0)+1 OR (NEW.visibility='TEAM' AND row_issue.visibility<>'TEAM')
   OR (row_issue.basis='PRIVATE_MATERIALS' AND NEW.basis<>'PRIVATE_MATERIALS') OR (NEW.kind='CREATE') IS DISTINCT FROM (NEW.revision=1)
 THEN RAISE EXCEPTION 'AGRI_ISSUE_EVENT_INVALID'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_issue_event_guard BEFORE INSERT ON agri_issue_events FOR EACH ROW EXECUTE FUNCTION agri_issue_event_guard();
CREATE FUNCTION agri_issue_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM agri_issue_events WHERE id=NEW."eventId" AND "issueId"=NEW."issueId" AND "competitionId"=NEW."competitionId" AND "actorId"=NEW."actorId" AND revision=NEW."appliedRevision" AND kind=CASE NEW.operation WHEN 'createIssue' THEN 'CREATE' WHEN 'updateIssue' THEN 'UPDATE' ELSE 'COMMENT' END)
 THEN RAISE EXCEPTION 'AGRI_ISSUE_RECEIPT_MISMATCH'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agri_issue_receipt_guard BEFORE INSERT ON agri_issue_receipts FOR EACH ROW EXECUTE FUNCTION agri_issue_receipt_guard();
-- Each revision must have an event by commit, so partial writes cannot erase history.
CREATE FUNCTION agri_issue_revision_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM agri_issue_events WHERE "issueId"=NEW.id AND revision=NEW.revision)
 THEN RAISE EXCEPTION 'AGRI_ISSUE_REVISION_EVENT_REQUIRED'; END IF;
 RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER agri_issue_revision_event_guard AFTER INSERT OR UPDATE ON agri_issues DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION agri_issue_revision_event_guard();
