-- Isolated regression only: the runner rejects all other hosts/database names.
BEGIN;
INSERT INTO users (id,email,username,"updatedAt") VALUES ('au-owner','au-owner@example.invalid','au-owner',now());
INSERT INTO teams (id,name,slug,"ownerId") VALUES ('au-team','Audit team','au-team','au-owner'),('au-team-2','Audit second','au-team-2','au-owner');
INSERT INTO competitions (id,title) VALUES ('au-managed','Managed disabled edition'),('au-ordinary','Ordinary edition'),('au-managed-2','Second managed edition');
INSERT INTO agri_workspaces (id,"competitionId",enabled) VALUES ('au-workspace','au-managed',false),('au-workspace-2','au-managed-2',false);
INSERT INTO team_competitions (id,"teamId","competitionId") VALUES ('au-entry','au-team','au-managed'),('au-ordinary-entry','au-team','au-ordinary');
DO $$ BEGIN
  -- A plain registration and independent quota metadata remain compatible.
  UPDATE team_competitions SET "quotaGranted"=15,"memberCap"=5 WHERE id='au-entry';
  IF (SELECT "quotaGranted" FROM team_competitions WHERE id='au-entry')<>15 THEN RAISE EXCEPTION 'quota compatibility failed'; END IF;
  UPDATE team_competitions SET "entryStatus"='SUBMITTED' WHERE id='au-ordinary-entry';
  UPDATE team_competitions SET "entryStatus"='REJECTED' WHERE id='au-ordinary-entry';
END $$;
DO $$ DECLARE operation TEXT; rejected BOOLEAN; BEGIN
  FOREACH operation IN ARRAY ARRAY[
    'UPDATE team_competitions SET "entryStatus"=''SUBMITTED'' WHERE id=''au-entry''',
    'UPDATE team_competitions SET "awardedXp"=10 WHERE id=''au-entry''',
    'UPDATE team_competitions SET "publicConsent"=true WHERE id=''au-entry''',
    'UPDATE team_competitions SET "reviewNote"=''legacy review'' WHERE id=''au-entry''',
    'UPDATE team_competitions SET "competitionId"=''au-ordinary'' WHERE id=''au-entry''',
    'UPDATE team_competitions SET "competitionId"=''au-managed-2'' WHERE id=''au-ordinary-entry''',
    'DELETE FROM team_competitions WHERE id=''au-entry''',
    'INSERT INTO team_competitions (id,"teamId","competitionId","entryStatus") VALUES (''au-insert-bypass'',''au-team-2'',''au-managed'',''SUBMITTED'')'
  ] LOOP
    rejected=false;
    BEGIN EXECUTE operation;
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'AGRI_STAGE_WORKSPACE_REQUIRED' THEN RAISE; END IF;
      rejected=true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'managed mutation was accepted: %',operation; END IF;
  END LOOP;
END $$;
-- Both old and new workspace identities protect moves; no side-effect records appear.
DO $$ BEGIN
  IF (SELECT "entryStatus" FROM team_competitions WHERE id='au-entry')<>'REGISTERED' OR
    (SELECT "awardedXp" FROM team_competitions WHERE id='au-entry')<>0 OR
    (SELECT "publicConsent" FROM team_competitions WHERE id='au-entry') OR
    (SELECT count(*) FROM artifact_publications)<>0 OR
    (SELECT count(*) FROM xp_ledger)<>0 THEN RAISE EXCEPTION 'unexpected protected write'; END IF;
  DELETE FROM team_competitions WHERE id='au-ordinary-entry';
END $$;
SELECT json_build_object('passed',true,'disabledWorkspaceProtected',true,'protectedMutationChecks',8,'registrationAndQuotaCompatible',true,'ordinarySubmissionAndDeleteCompatible',true,'publicationAndXpWrites',0,'productionWrites',false,'fixturesRolledBack',true);
ROLLBACK;