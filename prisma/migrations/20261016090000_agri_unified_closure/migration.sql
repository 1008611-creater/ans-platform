BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE agri_team_compute_grants (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "teamCompetitionId" TEXT NOT NULL,
 "ruleVersionId" TEXT NOT NULL, amount NUMERIC(24,6) NOT NULL CHECK(amount>0),
 used NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK(used>=0 AND used<=amount),
 "grantedById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT agri_team_compute_grants_competitionId_teamCompetitionId_key UNIQUE("competitionId","teamCompetitionId"),
 FOREIGN KEY("teamCompetitionId","competitionId") REFERENCES team_competitions(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("ruleVersionId","competitionId") REFERENCES agri_rule_versions(id,"competitionId") ON DELETE RESTRICT
);
CREATE TABLE agri_judge_scores (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "entryStageId" TEXT NOT NULL,
 "submissionId" TEXT NOT NULL, stage TEXT NOT NULL CHECK(stage IN('PRELIMINARY','FINAL')),
 "judgeId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, dimensions JSONB NOT NULL,
 "requestHash" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 UNIQUE("competitionId","submissionId","judgeId"), UNIQUE("competitionId","judgeId","idempotencyKey"),
 FOREIGN KEY("competitionId") REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("submissionId","entryStageId","competitionId") REFERENCES agri_stage_submissions(id,"entryStageId","competitionId") ON DELETE RESTRICT
);
CREATE TABLE agri_ranking_publications (
 id TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 stage TEXT NOT NULL CHECK(stage IN('PRELIMINARY','FINAL')), action TEXT NOT NULL CHECK(action IN('PANEL','CONFIRM','WITHDRAW')),
 "previousId" TEXT REFERENCES agri_ranking_publications(id) ON DELETE RESTRICT, snapshot JSONB NOT NULL,
 "sourceHash" TEXT NOT NULL, "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "idempotencyKey" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 UNIQUE("competitionId","actorId","idempotencyKey")
);
CREATE INDEX agri_ranking_latest ON agri_ranking_publications("competitionId",stage,"createdAt" DESC,id DESC);
ALTER TABLE agri_submission_receipts ADD COLUMN "wallSync" JSONB;

CREATE FUNCTION agri_unified_immutable_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'AGRI_UNIFIED_HISTORY_IMMUTABLE'; END; $$;
CREATE TRIGGER agri_judge_scores_immutable BEFORE UPDATE OR DELETE ON agri_judge_scores FOR EACH ROW EXECUTE FUNCTION agri_unified_immutable_guard();
CREATE TRIGGER agri_ranking_publications_immutable BEFORE UPDATE OR DELETE ON agri_ranking_publications FOR EACH ROW EXECUTE FUNCTION agri_unified_immutable_guard();
CREATE FUNCTION agri_team_compute_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_COMPUTE_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW."competitionId"<>OLD."competitionId" OR NEW."teamCompetitionId"<>OLD."teamCompetitionId" OR NEW."ruleVersionId"<>OLD."ruleVersionId" OR NEW.amount<>OLD.amount OR NEW."grantedById"<>OLD."grantedById" OR NEW."grantedAt"<>OLD."grantedAt") THEN RAISE EXCEPTION 'AGRI_COMPUTE_GRANT_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_team_compute_guard BEFORE UPDATE OR DELETE ON agri_team_compute_grants FOR EACH ROW EXECUTE FUNCTION agri_team_compute_guard();
CREATE FUNCTION agri_judge_score_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE field TEXT; actual_stage TEXT; panel JSONB;
BEGIN
 SELECT es.stage INTO actual_stage FROM agri_entry_stages es WHERE es.id=NEW."entryStageId" AND es."competitionId"=NEW."competitionId";
 IF actual_stage IS DISTINCT FROM NEW.stage THEN RAISE EXCEPTION 'AGRI_SCORE_STAGE_MISMATCH'; END IF;
 IF jsonb_typeof(NEW.dimensions) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(NEW.dimensions))<>5 THEN RAISE EXCEPTION 'AGRI_SCORE_DIMENSIONS_INVALID'; END IF;
 FOREACH field IN ARRAY ARRAY['innovation','technical','completeness','problem','fit'] LOOP
  IF NOT (NEW.dimensions ? field) OR jsonb_typeof(NEW.dimensions->field) IS DISTINCT FROM 'number' OR (NEW.dimensions->>field)::numeric<0 OR (NEW.dimensions->>field)::numeric>100 THEN RAISE EXCEPTION 'AGRI_SCORE_DIMENSIONS_INVALID'; END IF;
 END LOOP;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_judge_score_guard BEFORE INSERT ON agri_judge_scores FOR EACH ROW EXECUTE FUNCTION agri_judge_score_guard();

COMMIT;
