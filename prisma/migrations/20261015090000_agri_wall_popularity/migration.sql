CREATE TABLE "agri_wall_entries" (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 "teamCompetitionId" TEXT NOT NULL UNIQUE,"listingId" TEXT NOT NULL REFERENCES market_listings(id) ON DELETE RESTRICT,
 "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 "artifactVersionId" TEXT NOT NULL REFERENCES artifact_versions(id) ON DELETE RESTRICT,"listingVersion" INTEGER NOT NULL CHECK("listingVersion">0),
 "createdAt" TIMESTAMPTZ(3) NOT NULL,"updatedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("teamCompetitionId","competitionId") REFERENCES team_competitions(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("listingId","listingVersion") REFERENCES market_listing_versions("listingId",version) ON DELETE RESTRICT,
 UNIQUE("teamCompetitionId","competitionId"),UNIQUE("competitionId","listingId"),UNIQUE(id,"competitionId")
);
CREATE TABLE "agri_popularity_rounds" (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL UNIQUE REFERENCES agri_workspaces("competitionId") ON DELETE RESTRICT,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),"opensAt" TIMESTAMPTZ(3) NOT NULL,"closesAt" TIMESTAMPTZ(3) NOT NULL,
 "configuredById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"frozenAt" TIMESTAMPTZ(3),results JSONB,
 CHECK("opensAt"<"closesAt"),CHECK(("frozenAt" IS NULL AND results IS NULL) OR ("frozenAt" IS NOT NULL AND results IS NOT NULL AND jsonb_typeof(results)='array')),
 UNIQUE(id,"competitionId")
);
CREATE TABLE "agri_popularity_votes" (
 id TEXT PRIMARY KEY,"competitionId" TEXT NOT NULL,"roundId" TEXT NOT NULL,"wallEntryId" TEXT NOT NULL,
 "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,"createdAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY("roundId","competitionId") REFERENCES agri_popularity_rounds(id,"competitionId") ON DELETE RESTRICT,
 FOREIGN KEY("wallEntryId","competitionId") REFERENCES agri_wall_entries(id,"competitionId") ON DELETE RESTRICT,
 UNIQUE("roundId","wallEntryId","userId")
);
CREATE INDEX "agri_popularity_votes_roundId_wallEntryId_idx" ON agri_popularity_votes("roundId","wallEntryId");
CREATE FUNCTION agri_wall_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE listing RECORD; expected_team TEXT; round_open TIMESTAMPTZ;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_WALL_HISTORY_REQUIRED'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW."competitionId"<>OLD."competitionId" OR NEW."teamCompetitionId"<>OLD."teamCompetitionId" OR NEW."listingId"<>OLD."listingId" OR NEW."projectId"<>OLD."projectId" OR NEW."createdAt"<>OLD."createdAt") THEN RAISE EXCEPTION 'AGRI_WALL_IDENTITY_IMMUTABLE'; END IF;
 SELECT "opensAt" INTO round_open FROM agri_popularity_rounds WHERE "competitionId"=NEW."competitionId" FOR UPDATE;
 IF TG_OP='INSERT' AND round_open IS NOT NULL AND clock_timestamp()>=round_open THEN RAISE EXCEPTION 'AGRI_WALL_BINDING_CLOSED'; END IF;
 SELECT "teamId" INTO expected_team FROM team_competitions WHERE id=NEW."teamCompetitionId" AND "competitionId"=NEW."competitionId";
 SELECT l.*,v.payload INTO listing FROM market_listings l JOIN market_listing_versions v ON v."listingId"=l.id AND v.version=l."publishedVersion" WHERE l.id=NEW."listingId" FOR SHARE OF l;
 IF listing.id IS NULL OR listing.status<>'PUBLISHED' OR listing."publishedVersion"<>NEW."listingVersion" OR listing.payload->>'category' IS DISTINCT FROM 'competition' OR listing.payload->>'subcategory' IS DISTINCT FROM 'agri-wall' OR (listing.payload->>'priceMinor')::numeric IS DISTINCT FROM 0 OR listing.payload->>'fulfillment' IS DISTINCT FROM 'resource' OR listing.payload ? 'execution' OR coalesce((listing.payload->>'computeIncluded')::boolean,true) OR coalesce(jsonb_array_length(listing.payload->'pricingTiers'),0)>0 THEN RAISE EXCEPTION 'AGRI_WALL_PUBLIC_PROJECT_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM projects p JOIN artifacts a ON a."projectId"=p.id JOIN artifact_versions v ON v."artifactId"=a.id JOIN users u ON u.id=p."ownerId" WHERE p.id=NEW."projectId" AND p."teamId"=expected_team AND p."ownerId"=listing."sellerId" AND p.status='ACTIVE' AND NOT u.flagged AND u."deletedAt" IS NULL AND v.id=NEW."artifactVersionId") THEN RAISE EXCEPTION 'AGRI_WALL_PROJECT_MISMATCH'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_wall_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_wall_entries FOR EACH ROW EXECUTE FUNCTION agri_wall_guard();
CREATE FUNCTION agri_popularity_round_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AGRI_POPULARITY_HISTORY_REQUIRED'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW."opensAt"<=clock_timestamp() OR NEW."frozenAt" IS NOT NULL THEN RAISE EXCEPTION 'AGRI_POPULARITY_FUTURE_WINDOW_REQUIRED'; END IF;
 ELSE
  IF OLD."frozenAt" IS NOT NULL THEN RAISE EXCEPTION 'AGRI_POPULARITY_FROZEN'; END IF;
  IF NEW.id<>OLD.id OR NEW."competitionId"<>OLD."competitionId" THEN RAISE EXCEPTION 'AGRI_POPULARITY_IDENTITY_IMMUTABLE'; END IF;
  IF NEW."frozenAt" IS NOT NULL THEN
   IF clock_timestamp()<OLD."closesAt" OR NEW."opensAt"<>OLD."opensAt" OR NEW."closesAt"<>OLD."closesAt" OR NEW.revision<>OLD.revision OR NEW."configuredById"<>OLD."configuredById" THEN RAISE EXCEPTION 'AGRI_POPULARITY_INVALID_FREEZE'; END IF;
  ELSIF clock_timestamp()>=OLD."opensAt" OR NEW."opensAt"<=clock_timestamp() OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'AGRI_POPULARITY_WINDOW_LOCKED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_popularity_round_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_popularity_rounds FOR EACH ROW EXECUTE FUNCTION agri_popularity_round_guard();
CREATE FUNCTION agri_popularity_vote_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE round RECORD; wall RECORD; actor TEXT;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'AGRI_POPULARITY_VOTE_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN actor=OLD."userId"; SELECT * INTO round FROM agri_popularity_rounds WHERE id=OLD."roundId" FOR UPDATE;
 ELSE actor=NEW."userId"; SELECT * INTO round FROM agri_popularity_rounds WHERE id=NEW."roundId" FOR UPDATE; END IF;
 IF round.id IS NULL OR round."frozenAt" IS NOT NULL OR clock_timestamp()<round."opensAt" OR clock_timestamp()>=round."closesAt" THEN RAISE EXCEPTION 'AGRI_POPULARITY_VOTING_CLOSED'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT w.*,tc."teamId",l."sellerId" INTO wall FROM agri_wall_entries w JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN market_listings l ON l.id=w."listingId" JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" JOIN users seller ON seller.id=l."sellerId" WHERE w.id=NEW."wallEntryId" AND w."competitionId"=round."competitionId" AND l.status='PUBLISHED' AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall' AND NOT seller.flagged AND seller."deletedAt" IS NULL;
 IF wall.id IS NULL OR NEW."competitionId"<>round."competitionId" OR NEW."createdAt"<round."opensAt" OR NEW."createdAt">=round."closesAt" OR NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND NOT flagged AND "deletedAt" IS NULL) OR actor=wall."sellerId" OR EXISTS(SELECT 1 FROM team_members WHERE "teamId"=wall."teamId" AND "userId"=actor AND status='ACTIVE') OR EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."teamCompetitionId"=wall."teamCompetitionId" AND m."userId"=actor) OR NOT EXISTS(SELECT 1 FROM market_listing_stars WHERE "listingId"=wall."listingId" AND "userId"=actor) THEN RAISE EXCEPTION 'AGRI_POPULARITY_VOTE_INELIGIBLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_popularity_vote_guard BEFORE INSERT OR UPDATE OR DELETE ON agri_popularity_votes FOR EACH ROW EXECUTE FUNCTION agri_popularity_vote_guard();
CREATE FUNCTION agri_wall_listing_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM agri_wall_entries WHERE "listingId"=NEW."listingId") AND (NEW.payload->>'category' IS DISTINCT FROM 'competition' OR NEW.payload->>'subcategory' IS DISTINCT FROM 'agri-wall' OR (NEW.payload->>'priceMinor')::numeric IS DISTINCT FROM 0 OR NEW.payload->>'fulfillment' IS DISTINCT FROM 'resource' OR NEW.payload ? 'execution' OR coalesce((NEW.payload->>'computeIncluded')::boolean,true) OR coalesce(jsonb_array_length(NEW.payload->'pricingTiers'),0)>0) THEN RAISE EXCEPTION 'AGRI_WALL_CATEGORY_LOCKED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_wall_listing_version_guard BEFORE INSERT ON market_listing_versions FOR EACH ROW EXECUTE FUNCTION agri_wall_listing_version_guard();
-- Freeze the pre-change electorate before any post-deadline eligibility mutation,
-- including maintenance SQL that bypasses application services.
CREATE FUNCTION agri_popularity_freeze_due(target_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
DECLARE round RECORD; frozen_results JSONB;
BEGIN
 SELECT * INTO round FROM agri_popularity_rounds WHERE id=target_id FOR UPDATE NOWAIT;
 IF NOT FOUND OR round."frozenAt" IS NOT NULL OR clock_timestamp()<round."closesAt" THEN RETURN; END IF;
 WITH counts AS (
  SELECT w.id AS "entryId",w."listingId",lv.payload->>'title' AS title,t.name AS "teamName",
   (SELECT count(*)::integer FROM agri_popularity_votes v JOIN users voter ON voter.id=v."userId"
    WHERE v."roundId"=round.id AND v."wallEntryId"=w.id AND NOT voter.flagged AND voter."deletedAt" IS NULL AND v."userId"<>l."sellerId"
    AND NOT EXISTS(SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=v."userId" AND tm.status='ACTIVE')
    AND NOT EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."teamCompetitionId"=tc.id AND m."userId"=v."userId")) AS votes
  FROM agri_wall_entries w JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN teams t ON t.id=tc."teamId" JOIN market_listings l ON l.id=w."listingId"
  JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" JOIN users seller ON seller.id=l."sellerId"
  WHERE w."competitionId"=round."competitionId" AND l.status='PUBLISHED' AND NOT seller.flagged AND seller."deletedAt" IS NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall'
 ), ranked AS (SELECT *,rank() OVER(ORDER BY votes DESC)::integer AS position FROM counts)
 SELECT coalesce(jsonb_agg(jsonb_build_object('entryId',"entryId",'listingId',"listingId",'title',title,'teamName',"teamName",'votes',votes,'rank',position,'winner',position=1 AND votes>0) ORDER BY votes DESC,"entryId"),'[]'::jsonb) INTO frozen_results FROM ranked;
 UPDATE agri_popularity_rounds SET "frozenAt"=clock_timestamp(),results=frozen_results WHERE id=round.id;
END; $$;
CREATE FUNCTION agri_popularity_eligibility_freeze_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target RECORD; account_id TEXT; team_id TEXT; old_account_id TEXT; old_team_id TEXT; listing_id TEXT; edition_id TEXT;
BEGIN
 IF TG_TABLE_NAME='users' THEN
  IF TG_OP='UPDATE' AND NEW.flagged IS NOT DISTINCT FROM OLD.flagged AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt" THEN RETURN NEW; END IF;
  account_id=OLD.id;
 ELSIF TG_TABLE_NAME='team_members' THEN
  IF TG_OP<>'INSERT' THEN old_account_id=OLD."userId";old_team_id=OLD."teamId"; END IF;
  IF TG_OP='DELETE' THEN account_id=OLD."userId";team_id=OLD."teamId"; ELSE account_id=NEW."userId";team_id=NEW."teamId"; END IF;
 ELSIF TG_TABLE_NAME='teams' THEN team_id=OLD.id;
  IF TG_OP='UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN RETURN NEW; END IF;
 ELSIF TG_TABLE_NAME='agri_official_roster_members' THEN account_id=NEW."userId";edition_id=NEW."competitionId";
 ELSIF TG_TABLE_NAME='market_listings' THEN
  listing_id=OLD.id;
  IF NEW."sellerId"<>OLD."sellerId" AND EXISTS(SELECT 1 FROM agri_wall_entries WHERE "listingId"=OLD.id) THEN RAISE EXCEPTION 'AGRI_WALL_IDENTITY_IMMUTABLE'; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW."publishedVersion" IS NOT DISTINCT FROM OLD."publishedVersion" THEN RETURN NEW; END IF;
 END IF;
 FOR target IN SELECT DISTINCT r.id FROM agri_popularity_rounds r
  LEFT JOIN agri_wall_entries w ON w."competitionId"=r."competitionId" LEFT JOIN team_competitions tc ON tc.id=w."teamCompetitionId" LEFT JOIN market_listings l ON l.id=w."listingId"
  WHERE r."frozenAt" IS NULL AND
    (r."competitionId"=edition_id OR w."listingId"=listing_id OR tc."teamId"=team_id OR tc."teamId"=old_team_id OR l."sellerId"=account_id OR EXISTS(SELECT 1 FROM agri_popularity_votes v WHERE v."roundId"=r.id AND (v."userId"=account_id OR v."userId"=old_account_id))) ORDER BY r.id
 LOOP PERFORM agri_popularity_freeze_due(target.id); END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER agri_popularity_user_freeze BEFORE UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION agri_popularity_eligibility_freeze_guard();
CREATE TRIGGER agri_popularity_membership_freeze BEFORE INSERT OR UPDATE OR DELETE ON team_members FOR EACH ROW EXECUTE FUNCTION agri_popularity_eligibility_freeze_guard();
CREATE TRIGGER agri_popularity_roster_freeze BEFORE INSERT ON agri_official_roster_members FOR EACH ROW EXECUTE FUNCTION agri_popularity_eligibility_freeze_guard();
CREATE TRIGGER agri_popularity_listing_freeze BEFORE UPDATE ON market_listings FOR EACH ROW EXECUTE FUNCTION agri_popularity_eligibility_freeze_guard();

CREATE FUNCTION agri_external_artifact_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM artifacts WHERE id=OLD."artifactId" AND "workflowId"='agri-external-project') THEN RAISE EXCEPTION 'AGRI_WALL_SNAPSHOT_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER agri_external_artifact_immutable BEFORE UPDATE OR DELETE ON artifact_versions FOR EACH ROW EXECUTE FUNCTION agri_external_artifact_immutable();

CREATE TRIGGER agri_popularity_team_freeze BEFORE UPDATE OR DELETE ON teams FOR EACH ROW EXECUTE FUNCTION agri_popularity_eligibility_freeze_guard();

CREATE FUNCTION agri_external_artifact_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."workflowId"='agri-external-project' AND (NEW.id<>OLD.id OR NEW."projectId"<>OLD."projectId" OR NEW."workflowId"<>OLD."workflowId" OR NEW.kind<>OLD.kind OR NEW."createdById"<>OLD."createdById" OR NEW.visibility<>OLD.visibility) THEN RAISE EXCEPTION 'AGRI_WALL_SNAPSHOT_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER agri_external_artifact_identity_guard BEFORE UPDATE ON artifacts FOR EACH ROW EXECUTE FUNCTION agri_external_artifact_identity_guard();
