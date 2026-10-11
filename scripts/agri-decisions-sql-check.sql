-- Local isolated SQL boundary evidence. Never run against production.
-- Explicit database allowlist, no external services, every fixture is rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_database()<>'ans_audit_20261011' THEN RAISE EXCEPTION 'ISOLATED_AUDIT_DATABASE_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM competitions) OR EXISTS(SELECT 1 FROM users) THEN RAISE EXCEPTION 'EMPTY_ISOLATED_DATABASE_REQUIRED'; END IF;
END $$;
INSERT INTO users(id,email,username,"updatedAt") VALUES('audit_actor','audit-local@example.invalid','audit_local_actor',now());
INSERT INTO teams(id,name,slug,"ownerId") VALUES('audit_team','Local rollback-only team','audit-local-team','audit_actor');
INSERT INTO competitions(id,title) VALUES('audit_edition','LOCAL SQL ROLLBACK ONLY');
INSERT INTO team_competitions(id,"teamId","competitionId") VALUES('audit_entry','audit_team','audit_edition');
INSERT INTO projects(id,"ownerId","teamId",title,goal,"updatedAt") VALUES('audit_project','audit_actor','audit_team','Local rollback-only project','CONTEST',now());
INSERT INTO artifacts(id,"projectId","workflowId",kind,title,"createdById","updatedAt") VALUES('audit_artifact','audit_project','audit-workflow','CONTEST_MVP','Local rollback-only artifact','audit_actor',now());
INSERT INTO artifact_versions(id,"artifactId",version,"contentJson","contentMarkdown","factSnapshotHash","createdById") VALUES('audit_version','audit_artifact',1,'{}','Local SQL evidence',repeat('a',64),'audit_actor');
INSERT INTO agri_workspaces(id,"competitionId") VALUES('audit_workspace','audit_edition');
INSERT INTO agri_rule_versions(id,"competitionId",version,requirements,"guidanceMarkdown","confirmedById","confirmedAt") VALUES('audit_rule','audit_edition',1,'{"schemaVersion":1,"repositoryRequired":false,"repositoryRefRequired":false,"demoRequired":false,"materials":[]}','Local SQL rollback-only rules','audit_actor','2026-10-11T00:00:00Z');
INSERT INTO agri_entry_stages(id,"competitionId","teamCompetitionId",stage) VALUES('audit_stage','audit_edition','audit_entry','PRELIMINARY');
CREATE FUNCTION pg_temp.audit_submission(target_id TEXT, target_sequence INTEGER, target_summary TEXT, target_demo TEXT, accepted_at TIMESTAMPTZ) RETURNS VOID LANGUAGE sql AS $$
 INSERT INTO agri_stage_submissions(id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",summary,"demoUrl",materials,"submittedById","acceptedAt")
 VALUES(target_id,'audit_edition','audit_stage',target_sequence,'audit_rule','audit_project','audit_version',target_summary,target_demo,'{"schemaVersion":1,"items":[]}','audit_actor',accepted_at);
$$;
CREATE FUNCTION pg_temp.audit_permit(target_id TEXT, previous_id TEXT) RETURNS VOID LANGUAGE sql AS $$
 INSERT INTO agri_correction_permits(id,"competitionId","entryStageId","previousSubmissionId","ruleVersionId","allowedFields",reason,"authorizedById","authorizedAt","expiresAt")
 VALUES(target_id,'audit_edition','audit_stage',previous_id,'audit_rule',ARRAY['summary'],'Local explicit approval','audit_actor','2026-10-11T00:00:00Z','2026-10-11T00:01:00Z');
$$;
CREATE FUNCTION pg_temp.audit_chain(target_id TEXT, previous_id TEXT, permit_id TEXT, event_id TEXT) RETURNS VOID LANGUAGE sql AS $$
 INSERT INTO agri_submission_corrections("submissionId","competitionId","entryStageId","previousSubmissionId","permitId") VALUES(target_id,'audit_edition','audit_stage',previous_id,permit_id);
 INSERT INTO agri_correction_permit_events(id,"competitionId","entryStageId","permitId",action,"submissionId","actorId",reason,"createdAt") VALUES(event_id,'audit_edition','audit_stage',permit_id,'USE',target_id,'audit_actor','Local explicit approval','2026-10-11T00:00:30Z');
$$;
SELECT pg_temp.audit_submission('audit_original',1,'Original summary',NULL,'2026-10-11T00:00:00Z');
UPDATE agri_entry_stages SET "currentSubmissionId"='audit_original',revision=2 WHERE id='audit_stage';
UPDATE agri_entry_stages SET "frozenSubmissionId"='audit_original',revision=3 WHERE id='audit_stage';
SELECT pg_temp.audit_permit('audit_permit','audit_original');
SELECT pg_temp.audit_submission('audit_corrected',2,'Corrected summary',NULL,'2026-10-11T00:00:30Z');
SELECT pg_temp.audit_chain('audit_corrected','audit_original','audit_permit','audit_use');
UPDATE agri_entry_stages SET "currentSubmissionId"='audit_corrected',revision=4 WHERE id='audit_stage';
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM agri_entry_stages WHERE id='audit_stage' AND "currentSubmissionId"='audit_corrected' AND "frozenSubmissionId"='audit_original') THEN RAISE EXCEPTION 'CORRECTION_LOST_ORIGINAL_FREEZE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agri_stage_submissions WHERE id='audit_original' AND summary='Original summary') THEN RAISE EXCEPTION 'ORIGINAL_REWRITTEN'; END IF;
 RAISE NOTICE 'PASS allowed correction appends exact chain and retains original freeze/content';
 BEGIN
  INSERT INTO agri_correction_permit_events(id,"competitionId","entryStageId","permitId",action,"submissionId","actorId",reason,"createdAt") VALUES('audit_duplicate','audit_edition','audit_stage','audit_permit','USE','audit_corrected','audit_actor','duplicate',now());
  RAISE EXCEPTION 'EXPECTED_SINGLE_USE_REJECTION';
 EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS permit terminal event is single-use'; END;
 BEGIN
  UPDATE agri_entry_stages SET "frozenSubmissionId"='audit_corrected',revision=5 WHERE id='audit_stage';
  RAISE EXCEPTION 'EXPECTED_FREEZE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_STAGE_REVISION_OR_FROZEN' THEN RAISE; END IF; RAISE NOTICE 'PASS original frozen pointer cannot be overwritten'; END;
 BEGIN
  UPDATE agri_stage_submissions SET summary='Rewrite' WHERE id='audit_original';
  RAISE EXCEPTION 'EXPECTED_IMMUTABLE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_FOUNDATION_IMMUTABLE' THEN RAISE; END IF; RAISE NOTICE 'PASS original submission remains immutable'; END;
END $$;
SET CONSTRAINTS ALL DEFERRED;
DO $$ BEGIN
 BEGIN
  PERFORM pg_temp.audit_permit('audit_fields_permit','audit_corrected');
  PERFORM pg_temp.audit_submission('audit_fields',3,'Corrected summary','https://demo.example.invalid','2026-10-11T00:00:30Z');
  PERFORM pg_temp.audit_chain('audit_fields','audit_corrected','audit_fields_permit','audit_fields_event');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'EXPECTED_FIELD_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_CORRECTION_FIELD_NOT_ALLOWED' THEN RAISE; END IF; RAISE NOTICE 'PASS changed field outside permit rejected'; END;
 BEGIN
  PERFORM pg_temp.audit_permit('audit_expiry_permit','audit_corrected');
  PERFORM pg_temp.audit_submission('audit_expiry',3,'Expired correction',NULL,'2026-10-11T00:01:00Z');
  PERFORM pg_temp.audit_chain('audit_expiry','audit_corrected','audit_expiry_permit','audit_expiry_event');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'EXPECTED_EXPIRY_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_CORRECTION_INTEGRITY_FAILED' THEN RAISE; END IF; RAISE NOTICE 'PASS exact permit expiry instant rejected'; END;
 BEGIN
  PERFORM pg_temp.audit_permit('audit_mismatch_permit','audit_original');
  PERFORM pg_temp.audit_submission('audit_mismatch',3,'Mismatched correction',NULL,'2026-10-11T00:00:30Z');
  PERFORM pg_temp.audit_chain('audit_mismatch','audit_corrected','audit_mismatch_permit','audit_mismatch_event');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'EXPECTED_CHAIN_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_CORRECTION_INTEGRITY_FAILED' THEN RAISE; END IF; RAISE NOTICE 'PASS permit and previous-submission mismatch rejected'; END;
 BEGIN
  PERFORM pg_temp.audit_permit('audit_missing_use_permit','audit_corrected');
  PERFORM pg_temp.audit_submission('audit_missing_use',3,'Missing consumption',NULL,'2026-10-11T00:00:30Z');
  INSERT INTO agri_submission_corrections("submissionId","competitionId","entryStageId","previousSubmissionId","permitId") VALUES('audit_missing_use','audit_edition','audit_stage','audit_corrected','audit_missing_use_permit');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'EXPECTED_CONSUMPTION_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_CORRECTION_INTEGRITY_FAILED' THEN RAISE; END IF; RAISE NOTICE 'PASS chain without atomic permit consumption rejected'; END;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.audit_permit('audit_revoked_permit','audit_corrected');
INSERT INTO agri_correction_permit_events(id,"competitionId","entryStageId","permitId",action,"submissionId","actorId",reason,"createdAt") VALUES('audit_revoke','audit_edition','audit_stage','audit_revoked_permit','REVOKE',NULL,'audit_actor','Local revocation','2026-10-11T00:00:20Z');
SET CONSTRAINTS ALL DEFERRED;
DO $$ BEGIN
 BEGIN
  PERFORM pg_temp.audit_submission('audit_revoked_attempt',3,'Revoked correction',NULL,'2026-10-11T00:00:30Z');
  INSERT INTO agri_submission_corrections("submissionId","competitionId","entryStageId","previousSubmissionId","permitId") VALUES('audit_revoked_attempt','audit_edition','audit_stage','audit_corrected','audit_revoked_permit');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'EXPECTED_REVOKED_USE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_CORRECTION_INTEGRITY_FAILED' THEN RAISE; END IF; RAISE NOTICE 'PASS revoked permit cannot authorize a correction'; END;
 BEGIN
  UPDATE agri_correction_permit_events SET action='USE',"submissionId"='audit_corrected' WHERE id='audit_revoke';
  RAISE EXCEPTION 'EXPECTED_TERMINAL_EVENT_IMMUTABLE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'AGRI_FOUNDATION_IMMUTABLE' THEN RAISE; END IF; RAISE NOTICE 'PASS revoke terminal event remains immutable'; END;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
INSERT INTO agri_final_decisions(id,"competitionId","teamCompetitionId",sequence,state,reason,"sourceReference","actorId","decidedAt") VALUES('audit_eligible','audit_edition','audit_entry',1,'ELIGIBLE','Local explicit decision','Local evidence','audit_actor',now()),('audit_ineligible','audit_edition','audit_entry',2,'INELIGIBLE','Local explicit revocation','Local evidence','audit_actor',now());
DO $$ BEGIN
 IF (SELECT state FROM agri_final_decisions WHERE "teamCompetitionId"='audit_entry' ORDER BY sequence DESC LIMIT 1)<>'INELIGIBLE' THEN RAISE EXCEPTION 'LATEST_DECISION_NOT_EFFECTIVE'; END IF;
 IF (SELECT count(*) FROM agri_final_decisions WHERE "teamCompetitionId"='audit_entry')<>2 THEN RAISE EXCEPTION 'ELIGIBILITY_HISTORY_LOST'; END IF;
 IF EXISTS(SELECT 1 FROM users WHERE id='audit_actor' AND xp<>0) OR EXISTS(SELECT 1 FROM team_competitions WHERE id='audit_entry' AND ("publicConsent" OR "awardedXp"<>0 OR "entryStatus"<>'REGISTERED')) OR EXISTS(SELECT 1 FROM artifact_publications) THEN RAISE EXCEPTION 'PUBLIC_OR_XP_SIDE_EFFECT'; END IF;
 RAISE NOTICE 'PASS eligibility revocation appends history without public or XP effects';
END $$;
ROLLBACK;
SELECT (SELECT count(*) FROM users) AS users_after_rollback, (SELECT count(*) FROM competitions) AS competitions_after_rollback,
 (SELECT count(*) FROM agri_stage_submissions) AS submissions_after_rollback, (SELECT count(*) FROM agri_correction_permits) AS permits_after_rollback;
