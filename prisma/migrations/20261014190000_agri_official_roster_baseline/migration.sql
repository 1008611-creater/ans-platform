-- Additive integrity only. Historical submissions keep NULL provenance; do not invent rosters.
CREATE TABLE "agri_official_rosters" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL,
  "teamCompetitionId" TEXT NOT NULL UNIQUE,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
  "memberUserIds" JSONB NOT NULL,
  "confirmedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
  FOREIGN KEY ("teamCompetitionId","competitionId") REFERENCES "team_competitions"("id","competitionId") ON DELETE RESTRICT,
  UNIQUE ("id","competitionId"), UNIQUE ("teamCompetitionId","competitionId"),
  CHECK (jsonb_typeof("memberUserIds")='array' AND jsonb_array_length("memberUserIds") BETWEEN 1 AND 5)
);
CREATE TABLE "agri_official_roster_members" (
  "rosterId" TEXT NOT NULL, "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "username" TEXT NOT NULL, "name" TEXT,
  PRIMARY KEY ("rosterId","userId"),
  FOREIGN KEY ("rosterId","competitionId") REFERENCES "agri_official_rosters"("id","competitionId") ON DELETE RESTRICT,
  UNIQUE ("competitionId","userId")
);
ALTER TABLE "agri_stage_submissions" ADD COLUMN "officialRosterId" TEXT, ADD COLUMN "preliminarySubmissionId" TEXT;
ALTER TABLE "agri_stage_submissions" ADD CONSTRAINT "agri_submission_roster_same_edition"
  FOREIGN KEY ("officialRosterId","competitionId") REFERENCES "agri_official_rosters"("id","competitionId") ON DELETE RESTRICT;
ALTER TABLE "agri_stage_submissions" ADD CONSTRAINT "agri_submission_preliminary_baseline"
  FOREIGN KEY ("preliminarySubmissionId") REFERENCES "agri_stage_submissions"("id") ON DELETE RESTRICT;
CREATE INDEX "agri_stage_submissions_officialRosterId_idx" ON "agri_stage_submissions"("officialRosterId");
CREATE INDEX "agri_stage_submissions_preliminarySubmissionId_idx" ON "agri_stage_submissions"("preliminarySubmissionId");
CREATE TRIGGER "agri_roster_immutable" BEFORE UPDATE OR DELETE ON "agri_official_rosters"
  FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_roster_member_immutable" BEFORE UPDATE OR DELETE ON "agri_official_roster_members"
  FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();

CREATE FUNCTION "agri_roster_create_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_team TEXT;
BEGIN
  -- Application commands already hold these locks. Raw callers fail rather than reverse their order.
  PERFORM id FROM "agri_workspaces" WHERE "competitionId"=NEW."competitionId" FOR UPDATE NOWAIT;
  SELECT "teamId" INTO expected_team FROM "team_competitions"
    WHERE id=NEW."teamCompetitionId" AND "competitionId"=NEW."competitionId" FOR UPDATE NOWAIT;
  IF expected_team IS NULL OR EXISTS (SELECT 1 FROM "agri_stage_submissions" s JOIN "agri_entry_stages" es ON es.id=s."entryStageId"
      WHERE es."teamCompetitionId"=NEW."teamCompetitionId") THEN RAISE EXCEPTION 'AGRI_LEGACY_ROSTER_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW."memberUserIds") value WHERE jsonb_typeof(value)<>'string')
    OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(NEW."memberUserIds") value)<>jsonb_array_length(NEW."memberUserIds")
    OR NOT NEW."memberUserIds" ? NEW."confirmedById" THEN RAISE EXCEPTION 'AGRI_ROSTER_INVALID'; END IF;
  PERFORM id FROM "projects" WHERE id=NEW."projectId" AND "teamId"=expected_team AND "ownerId"=NEW."confirmedById" AND status='ACTIVE' FOR SHARE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGRI_PROJECT_UNAVAILABLE'; END IF;
  PERFORM tm.id FROM "team_members" tm JOIN "users" u ON u.id=tm."userId"
    WHERE tm."teamId"=expected_team AND tm."userId"=NEW."confirmedById" AND tm.status='ACTIVE' AND tm.role IN ('OWNER','ADMIN')
    AND NOT u.flagged AND u."deletedAt" IS NULL FOR SHARE OF tm,u NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGRI_TEAM_MANAGER_REQUIRED'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_roster_create_guard" BEFORE INSERT ON "agri_official_rosters"
  FOR EACH ROW EXECUTE FUNCTION "agri_roster_create_guard"();
CREATE FUNCTION "agri_roster_member_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE roster RECORD; account RECORD;
BEGIN
  SELECT r.*,tc."teamId" INTO roster FROM "agri_official_rosters" r JOIN "team_competitions" tc ON tc.id=r."teamCompetitionId"
    WHERE r.id=NEW."rosterId" AND r."competitionId"=NEW."competitionId";
  IF NOT FOUND OR NOT roster."memberUserIds" ? NEW."userId" THEN RAISE EXCEPTION 'AGRI_ROSTER_INVALID'; END IF;
  SELECT u.username,u.name INTO account FROM "users" u JOIN "team_members" tm ON tm."userId"=u.id
    WHERE u.id=NEW."userId" AND NOT u.flagged AND u."deletedAt" IS NULL AND tm."teamId"=roster."teamId" AND tm.status='ACTIVE'
    FOR SHARE OF u,tm NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGRI_ROSTER_MEMBER_UNAVAILABLE'; END IF;
  IF NEW.username IS DISTINCT FROM account.username OR NEW.name IS DISTINCT FROM account.name
    THEN RAISE EXCEPTION 'AGRI_ROSTER_SNAPSHOT_MISMATCH'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_roster_member_guard" BEFORE INSERT ON "agri_official_roster_members"
  FOR EACH ROW EXECUTE FUNCTION "agri_roster_member_guard"();
CREATE FUNCTION "agri_roster_complete_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE roster_id TEXT; expected_count INTEGER; actual_count INTEGER;
BEGIN
  IF TG_TABLE_NAME='agri_official_rosters' THEN roster_id=NEW.id; ELSE roster_id=NEW."rosterId"; END IF;
  SELECT jsonb_array_length("memberUserIds") INTO expected_count FROM "agri_official_rosters" WHERE id=roster_id;
  SELECT count(*) INTO actual_count FROM "agri_official_roster_members" WHERE "rosterId"=roster_id;
  IF actual_count IS DISTINCT FROM expected_count THEN RAISE EXCEPTION 'AGRI_ROSTER_INCOMPLETE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "agri_stage_submissions" WHERE "officialRosterId"=roster_id)
    THEN RAISE EXCEPTION 'AGRI_ROSTER_SUBMISSION_REQUIRED'; END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER "agri_roster_complete_guard" AFTER INSERT ON "agri_official_rosters"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "agri_roster_complete_guard"();
CREATE CONSTRAINT TRIGGER "agri_roster_members_complete_guard" AFTER INSERT ON "agri_official_roster_members"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "agri_roster_complete_guard"();

CREATE FUNCTION "agri_submission_official_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target RECORD; roster RECORD; prelim RECORD; effective_id TEXT; at_time TIMESTAMPTZ;
BEGIN
  SELECT * INTO target FROM "agri_entry_stages" WHERE id=NEW."entryStageId" AND "competitionId"=NEW."competitionId";
  SELECT * INTO roster FROM "agri_official_rosters" WHERE id=NEW."officialRosterId" AND "competitionId"=NEW."competitionId";
  IF roster.id IS NULL THEN RAISE EXCEPTION 'AGRI_ROSTER_REQUIRED'; END IF;
  IF roster."teamCompetitionId"<>target."teamCompetitionId" OR roster."projectId"<>NEW."projectId"
    THEN RAISE EXCEPTION 'AGRI_ROSTER_PROJECT_MISMATCH'; END IF;
  IF NOT roster."memberUserIds" ? NEW."submittedById" THEN RAISE EXCEPTION 'AGRI_ROSTER_ACTOR_REQUIRED'; END IF;
  -- Check active accounts now; historical roster identities never change if a member later leaves the team.
  PERFORM u.id FROM "users" u WHERE roster."memberUserIds" ? u.id ORDER BY u.id FOR SHARE NOWAIT;
  IF (SELECT count(*) FROM "agri_official_roster_members" WHERE "rosterId"=roster.id)<>jsonb_array_length(roster."memberUserIds")
    THEN RAISE EXCEPTION 'AGRI_ROSTER_INCOMPLETE'; END IF;
  IF EXISTS (SELECT 1 FROM "users" u WHERE roster."memberUserIds" ? u.id AND (u.flagged OR u."deletedAt" IS NOT NULL))
    THEN RAISE EXCEPTION 'AGRI_ROSTER_MEMBER_UNAVAILABLE'; END IF;
  IF target.stage='PRELIMINARY' THEN
    IF NEW."preliminarySubmissionId" IS NOT NULL THEN RAISE EXCEPTION 'AGRI_PRELIMINARY_BASELINE_INVALID'; END IF;
    RETURN NEW;
  END IF;
  SELECT es.id,es."frozenSubmissionId",es."currentSubmissionId",s."projectId",s."officialRosterId",w.state,w."closesAt",w."includesDeadline"
    INTO prelim FROM "agri_entry_stages" es JOIN "agri_stage_submissions" s ON s.id=COALESCE(es."frozenSubmissionId",es."currentSubmissionId")
    JOIN "agri_stage_windows" w ON w."ruleVersionId"=s."ruleVersionId" AND w."competitionId"=es."competitionId" AND w.stage='PRELIMINARY'
    WHERE es."teamCompetitionId"=target."teamCompetitionId" AND es."competitionId"=NEW."competitionId" AND es.stage='PRELIMINARY'
    FOR UPDATE OF es NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGRI_PRELIMINARY_BASELINE_REQUIRED'; END IF;
  at_time=clock_timestamp(); effective_id=prelim."frozenSubmissionId";
  IF effective_id IS NULL AND prelim.state='CONFIRMED' AND
    (at_time>prelim."closesAt" OR (at_time=prelim."closesAt" AND NOT prelim."includesDeadline"))
    THEN effective_id=prelim."currentSubmissionId"; END IF;
  IF effective_id IS NULL OR NEW."preliminarySubmissionId" IS DISTINCT FROM effective_id
    THEN RAISE EXCEPTION 'AGRI_PRELIMINARY_BASELINE_REQUIRED'; END IF;
  IF prelim."projectId"<>NEW."projectId" OR prelim."officialRosterId" IS DISTINCT FROM NEW."officialRosterId"
    THEN RAISE EXCEPTION 'AGRI_FINAL_PROJECT_MISMATCH'; END IF;
  IF EXISTS (SELECT 1 FROM "agri_stage_submissions" s WHERE s."entryStageId"=target.id
    AND (s."preliminarySubmissionId" IS DISTINCT FROM NEW."preliminarySubmissionId" OR s."officialRosterId" IS DISTINCT FROM NEW."officialRosterId"))
    THEN RAISE EXCEPTION 'AGRI_FINAL_BASELINE_CHANGE_FORBIDDEN'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_submission_official_guard" BEFORE INSERT ON "agri_stage_submissions"
  FOR EACH ROW EXECUTE FUNCTION "agri_submission_official_guard"();
