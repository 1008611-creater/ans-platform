-- Additive stage history; no production editions, users, rules or eligibility seeded.
CREATE UNIQUE INDEX "team_competitions_id_competitionId_key" ON "team_competitions"("id","competitionId");
CREATE TABLE "agri_entry_stages" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT,
  "teamCompetitionId" TEXT NOT NULL, "stage" VARCHAR(16) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1, "draft" JSONB,
  "currentSubmissionId" TEXT, "frozenSubmissionId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("teamCompetitionId","competitionId") REFERENCES "team_competitions"("id","competitionId") ON DELETE RESTRICT,
  UNIQUE ("teamCompetitionId","stage"), UNIQUE ("id","competitionId"),
  CHECK ("stage" IN ('PRELIMINARY','FINAL') AND "revision" >= 1),
  CHECK ("draft" IS NULL OR jsonb_typeof("draft")='object'),
  CHECK ("frozenSubmissionId" IS NULL OR ("currentSubmissionId" IS NOT NULL AND "frozenSubmissionId"="currentSubmissionId"))
);
CREATE TABLE "agri_stage_submissions" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL, "ruleVersionId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
  "artifactVersionId" TEXT NOT NULL REFERENCES "artifact_versions"("id") ON DELETE RESTRICT,
  "repository" JSONB, "demoUrl" TEXT, "summary" TEXT NOT NULL, "materials" JSONB NOT NULL,
  "submittedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL,
  FOREIGN KEY ("entryStageId","competitionId") REFERENCES "agri_entry_stages"("id","competitionId") ON DELETE RESTRICT,
  FOREIGN KEY ("ruleVersionId","competitionId") REFERENCES "agri_rule_versions"("id","competitionId") ON DELETE RESTRICT,
  UNIQUE ("entryStageId","sequence"), UNIQUE ("id","entryStageId","competitionId"),
  CHECK ("sequence">=1 AND length("summary") BETWEEN 1 AND 4000),
  CHECK ("repository" IS NULL OR jsonb_typeof("repository")='object'),
  CHECK (jsonb_typeof("materials")='object' AND COALESCE("materials"->>'schemaVersion'='1',false))
);
ALTER TABLE "agri_entry_stages" ADD CONSTRAINT "agri_stage_current_same_entry"
  FOREIGN KEY ("currentSubmissionId","id","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT;
ALTER TABLE "agri_entry_stages" ADD CONSTRAINT "agri_stage_frozen_same_entry"
  FOREIGN KEY ("frozenSubmissionId","id","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT;
CREATE INDEX "agri_stage_submissions_competitionId_acceptedAt_id_idx" ON "agri_stage_submissions"("competitionId","acceptedAt","id");
CREATE TABLE "agri_submission_material_refs" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL, "submissionId" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL, "artifactVersionId" TEXT NOT NULL REFERENCES "artifact_versions"("id") ON DELETE RESTRICT,
  FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT,
  UNIQUE ("submissionId","key")
);
CREATE TABLE "agri_submission_events" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL, "action" VARCHAR(32) NOT NULL, "submissionId" TEXT,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "createdAt" TIMESTAMPTZ(3) NOT NULL,
  FOREIGN KEY ("entryStageId","competitionId") REFERENCES "agri_entry_stages"("id","competitionId") ON DELETE RESTRICT,
  FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT,
  UNIQUE ("entryStageId","revision"),
  CHECK ("revision">=2 AND (("action"='saveDraft' AND "submissionId" IS NULL) OR ("action" IN ('submit','freezeStage') AND "submissionId" IS NOT NULL)))
);
CREATE TABLE "agri_submission_receipts" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "operation" VARCHAR(32) NOT NULL,
  "idempotencyKey" VARCHAR(36) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
  "submissionId" TEXT, "appliedRevision" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
  FOREIGN KEY ("entryStageId","competitionId") REFERENCES "agri_entry_stages"("id","competitionId") ON DELETE RESTRICT,
  FOREIGN KEY ("submissionId","entryStageId","competitionId") REFERENCES "agri_stage_submissions"("id","entryStageId","competitionId") ON DELETE RESTRICT,
  UNIQUE ("competitionId","actorId","operation","idempotencyKey"),
  CHECK ("appliedRevision">=2 AND "requestHash" ~ '^[a-f0-9]{64}$' AND
    (("operation"='saveDraft' AND "submissionId" IS NULL) OR ("operation"='submit' AND "submissionId" IS NOT NULL)))
);
CREATE FUNCTION "agri_stage_identity_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_STAGE_DELETE_FORBIDDEN'; END IF;
  IF NEW."id"<>OLD."id" OR NEW."competitionId"<>OLD."competitionId" OR NEW."teamCompetitionId"<>OLD."teamCompetitionId"
    OR NEW."stage"<>OLD."stage" OR NEW."createdAt"<>OLD."createdAt" OR NEW."revision"<>OLD."revision"+1
    OR (OLD."frozenSubmissionId" IS NOT NULL AND NEW IS DISTINCT FROM OLD)
    THEN RAISE EXCEPTION 'AGRI_STAGE_REVISION_OR_FROZEN'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_stage_identity_guard" BEFORE UPDATE OR DELETE ON "agri_entry_stages" FOR EACH ROW EXECUTE FUNCTION "agri_stage_identity_guard"();
CREATE FUNCTION "agri_submission_project_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_team TEXT;
BEGIN
  SELECT tc."teamId" INTO expected_team FROM "agri_entry_stages" es JOIN "team_competitions" tc ON tc.id=es."teamCompetitionId"
    WHERE es.id=NEW."entryStageId" AND es."competitionId"=NEW."competitionId" FOR SHARE OF tc;
  IF NOT EXISTS (SELECT 1 FROM "projects" p JOIN "artifacts" a ON a."projectId"=p.id JOIN "artifact_versions" v ON v."artifactId"=a.id
    WHERE p.id=NEW."projectId" AND p."teamId"=expected_team AND v.id=NEW."artifactVersionId")
    THEN RAISE EXCEPTION 'AGRI_SUBMISSION_PROJECT_MISMATCH'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_submission_project_guard" BEFORE INSERT ON "agri_stage_submissions" FOR EACH ROW EXECUTE FUNCTION "agri_submission_project_guard"();
CREATE TRIGGER "agri_submission_immutable" BEFORE UPDATE OR DELETE ON "agri_stage_submissions" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_material_ref_immutable" BEFORE UPDATE OR DELETE ON "agri_submission_material_refs" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_submission_event_immutable" BEFORE UPDATE OR DELETE ON "agri_submission_events" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_submission_receipt_immutable" BEFORE UPDATE OR DELETE ON "agri_submission_receipts" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
-- Artifact material references must belong to the exact submitted project.
CREATE FUNCTION "agri_material_project_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "agri_stage_submissions" s JOIN "artifacts" a ON a."projectId"=s."projectId"
    JOIN "artifact_versions" v ON v."artifactId"=a.id WHERE s.id=NEW."submissionId" AND v.id=NEW."artifactVersionId")
    THEN RAISE EXCEPTION 'AGRI_MATERIAL_PROJECT_MISMATCH'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_material_project_guard" BEFORE INSERT ON "agri_submission_material_refs" FOR EACH ROW EXECUTE FUNCTION "agri_material_project_guard"();
-- Older images lock the entry first. NOWAIT avoids reversing the new workspace-first
-- order: a contending legacy write fails closed rather than deadlocking new commands.
CREATE FUNCTION "agri_legacy_entry_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE has_history BOOLEAN; target_id TEXT; protected_change BOOLEAN; row_workspace RECORD;
BEGIN
  IF TG_OP='INSERT' THEN
    target_id=NEW."competitionId";
    protected_change=NEW."entryStatus"<>'REGISTERED' OR NEW."submissionVersionId" IS NOT NULL OR
      NEW."submittedById" IS NOT NULL OR NEW."submittedAt" IS NOT NULL OR NEW."submissionNote" IS NOT NULL OR
      NEW."publicConsent" OR NEW."reviewedAt" IS NOT NULL OR NEW."reviewedById" IS NOT NULL OR
      NEW."reviewNote" IS NOT NULL OR NEW."awardedXp"<>0;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "agri_entry_stages" WHERE "teamCompetitionId"=OLD.id) INTO has_history;
    IF TG_OP='DELETE' THEN protected_change=true; target_id=OLD."competitionId";
    ELSE
      target_id=NEW."competitionId";
      protected_change=NEW.id IS DISTINCT FROM OLD.id OR NEW."competitionId" IS DISTINCT FROM OLD."competitionId" OR
        NEW."teamId" IS DISTINCT FROM OLD."teamId" OR NEW."entryStatus" IS DISTINCT FROM OLD."entryStatus" OR
        NEW."submissionVersionId" IS DISTINCT FROM OLD."submissionVersionId" OR NEW."submittedById" IS DISTINCT FROM OLD."submittedById" OR
        NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt" OR NEW."submissionNote" IS DISTINCT FROM OLD."submissionNote" OR
        NEW."publicConsent" IS DISTINCT FROM OLD."publicConsent" OR NEW."reviewedAt" IS DISTINCT FROM OLD."reviewedAt" OR
        NEW."reviewedById" IS DISTINCT FROM OLD."reviewedById" OR NEW."reviewNote" IS DISTINCT FROM OLD."reviewNote" OR
        NEW."awardedXp" IS DISTINCT FROM OLD."awardedXp";
    END IF;
    IF has_history AND protected_change THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END IF;
  END IF;
  IF protected_change THEN
    BEGIN
      FOR row_workspace IN SELECT enabled FROM "agri_workspaces"
        WHERE "competitionId"=target_id OR (TG_OP<>'INSERT' AND "competitionId"=OLD."competitionId")
        ORDER BY "competitionId" FOR SHARE NOWAIT
      LOOP
        IF row_workspace.enabled THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END IF;
      END LOOP;
    EXCEPTION WHEN lock_not_available THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_legacy_entry_guard" BEFORE INSERT OR UPDATE OR DELETE ON "team_competitions" FOR EACH ROW EXECUTE FUNCTION "agri_legacy_entry_guard"();
