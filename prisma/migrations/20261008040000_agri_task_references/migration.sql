-- Additive reference records; no users, grants, editions or official dates are seeded.
CREATE UNIQUE INDEX "agri_issue_task_reference_identity" ON "agri_issues" ("id", "submissionId", "competitionId");
CREATE TABLE "agri_task_references" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "entryStageId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "issueId" TEXT,
  "attachedAt" TIMESTAMPTZ(3) NOT NULL,
  "detachedAt" TIMESTAMPTZ(3),
  "attachedRevision" INTEGER NOT NULL CHECK ("attachedRevision" > 1),
  "detachedRevision" INTEGER,
  CONSTRAINT "agri_task_references_task_edition_fkey" FOREIGN KEY ("taskId", "competitionId") REFERENCES "agri_personal_tasks" ("id", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "agri_task_references_submission_identity_fkey" FOREIGN KEY ("submissionId", "entryStageId", "competitionId") REFERENCES "agri_stage_submissions" ("id", "entryStageId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "agri_task_references_issue_identity_fkey" FOREIGN KEY ("issueId", "submissionId", "competitionId") REFERENCES "agri_issues" ("id", "submissionId", "competitionId") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "agri_task_references_dates" CHECK ((("detachedAt" IS NULL AND "detachedRevision" IS NULL) OR ("detachedAt" >= "attachedAt" AND "detachedRevision" > "attachedRevision")) IS TRUE)
);
CREATE INDEX "agri_task_references_active_idx" ON "agri_task_references" ("taskId", "detachedAt");
CREATE UNIQUE INDEX "agri_task_reference_active_submission" ON "agri_task_references" ("taskId", "submissionId") WHERE "detachedAt" IS NULL AND "issueId" IS NULL;
CREATE UNIQUE INDEX "agri_task_reference_active_issue" ON "agri_task_references" ("taskId", "issueId") WHERE "detachedAt" IS NULL AND "issueId" IS NOT NULL;
CREATE FUNCTION ans_agri_task_reference_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'agri task reference history cannot be deleted'; END IF;
  IF OLD."detachedAt" IS NOT NULL OR NEW."detachedAt" IS NULL OR
    (NEW.id, NEW."competitionId", NEW."taskId", NEW."entryStageId", NEW."submissionId", NEW."issueId", NEW."attachedAt", NEW."attachedRevision")
      IS DISTINCT FROM
    (OLD.id, OLD."competitionId", OLD."taskId", OLD."entryStageId", OLD."submissionId", OLD."issueId", OLD."attachedAt", OLD."attachedRevision")
    THEN RAISE EXCEPTION 'agri task reference identity is immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ans_agri_task_reference_history_guard BEFORE UPDATE OR DELETE ON "agri_task_references" FOR EACH ROW EXECUTE FUNCTION ans_agri_task_reference_history_guard();

ALTER TABLE agri_task_events DROP CONSTRAINT agri_task_event_valid;
ALTER TABLE agri_task_events ADD CONSTRAINT agri_task_event_valid CHECK ((
  revision BETWEEN 1 AND 2147483646 AND action IN ('create','update','initialize','share','revokeShare','attachReference','detachReference') AND
  jsonb_typeof(snapshot) = 'object' AND snapshot->'schemaVersion' = '1'::jsonb AND
  jsonb_typeof(snapshot->'task') = 'object' AND octet_length(snapshot::text) <= 100000 AND
  (action NOT IN ('attachReference','detachReference') OR
    (jsonb_typeof(snapshot->'referenceChange')='object' AND
     snapshot->'referenceChange'->>'action'=CASE WHEN action='attachReference' THEN 'attach' ELSE 'detach' END AND
     length(snapshot->'referenceChange'->>'referenceId') BETWEEN 1 AND 80))
) IS TRUE);
ALTER TABLE agri_task_command_receipts DROP CONSTRAINT agri_task_receipt_valid;
ALTER TABLE agri_task_command_receipts ADD CONSTRAINT agri_task_receipt_valid CHECK ((
  operation IN ('create','update','initialize','share','revokeShare','attachReference','detachReference') AND "requestHash" ~ '^[a-f0-9]{64}$' AND
  ((operation = 'initialize' AND "taskId" IS NULL AND "appliedRevision" IS NULL AND "createdTaskCount" BETWEEN 0 AND 6) OR
   (operation <> 'initialize' AND "taskId" IS NOT NULL AND "appliedRevision" > 0 AND "createdTaskCount" IS NULL))
) IS TRUE);
CREATE FUNCTION ans_agri_task_reference_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_revision INTEGER; expected_action TEXT;
BEGIN
  expected_revision := CASE WHEN TG_OP='INSERT' THEN NEW."attachedRevision" ELSE NEW."detachedRevision" END;
  expected_action := CASE WHEN TG_OP='INSERT' THEN 'attachReference' ELSE 'detachReference' END;
  IF NOT EXISTS(SELECT 1 FROM agri_task_events e WHERE e."taskId"=NEW."taskId" AND e.revision=expected_revision
    AND e.action=expected_action AND e.snapshot->'referenceChange'->>'referenceId'=NEW.id)
    THEN RAISE EXCEPTION 'agri task reference requires matching history'; END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER ans_agri_task_reference_event_guard AFTER INSERT OR UPDATE ON agri_task_references DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_agri_task_reference_event_guard();
