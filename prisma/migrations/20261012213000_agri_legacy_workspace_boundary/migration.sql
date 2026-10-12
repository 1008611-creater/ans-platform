-- A managed edition stays managed while disabled or before its first stage exists.
-- No rows or historical migration checksums are modified. Keep pure registration,
-- unrelated quota fields, historical stage protection and NOWAIT lock ordering.
-- ENV-only binding is also checked by the application; SQL recognizes persisted
-- workspaces and stage history without guessing an edition from its title.
CREATE OR REPLACE FUNCTION "agri_legacy_entry_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
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
        RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED';
      END LOOP;
    EXCEPTION WHEN lock_not_available THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
