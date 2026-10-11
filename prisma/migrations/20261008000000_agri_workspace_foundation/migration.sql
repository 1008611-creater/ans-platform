-- Additive P1 foundation. Does not create an edition, grant users, publish rules or open submissions.
CREATE TABLE "agri_workspaces" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL UNIQUE REFERENCES "competitions"("id") ON DELETE RESTRICT,
  "enabled" BOOLEAN NOT NULL DEFAULT false, "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "rulesDraft" JSONB, "confirmedRuleVersionId" TEXT, "publishedRuleVersionId" TEXT,
  "updatedById" TEXT REFERENCES "users"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agri_workspace_revision_valid" CHECK ("draftRevision" >= 1),
  CONSTRAINT "agri_workspace_draft_valid" CHECK ("rulesDraft" IS NULL OR
    (jsonb_typeof("rulesDraft") = 'object' AND COALESCE("rulesDraft"->>'schemaVersion' = '1', false))),
  CONSTRAINT "agri_workspace_enabled_requires_rule" CHECK (NOT "enabled" OR "publishedRuleVersionId" IS NOT NULL)
);
CREATE TABLE "agri_rule_versions" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL, "requirements" JSONB NOT NULL, "guidanceMarkdown" TEXT NOT NULL,
  "confirmedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "confirmedAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("competitionId", "version"), UNIQUE ("id", "competitionId"),
  CONSTRAINT "agri_rule_payload_valid" CHECK ("version" >= 1 AND length("guidanceMarkdown") BETWEEN 1 AND 20000
    AND jsonb_typeof("requirements") = 'object' AND COALESCE("requirements"->>'schemaVersion' = '1', false))
);
ALTER TABLE "agri_workspaces" ADD CONSTRAINT "agri_workspace_confirmed_same_edition"
  FOREIGN KEY ("confirmedRuleVersionId", "competitionId") REFERENCES "agri_rule_versions"("id", "competitionId") ON DELETE RESTRICT;
ALTER TABLE "agri_workspaces" ADD CONSTRAINT "agri_workspace_published_same_edition"
  FOREIGN KEY ("publishedRuleVersionId", "competitionId") REFERENCES "agri_rule_versions"("id", "competitionId") ON DELETE RESTRICT;
CREATE TABLE "agri_stage_windows" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL, "ruleVersionId" TEXT NOT NULL,
  "stage" VARCHAR(16) NOT NULL, "state" VARCHAR(16) NOT NULL,
  "opensAt" TIMESTAMPTZ(3), "closesAt" TIMESTAMPTZ(3), "includesDeadline" BOOLEAN,
  FOREIGN KEY ("ruleVersionId", "competitionId") REFERENCES "agri_rule_versions"("id", "competitionId") ON DELETE RESTRICT,
  UNIQUE ("ruleVersionId", "stage"),
  CONSTRAINT "agri_stage_window_valid" CHECK ("stage" IN ('REGISTRATION','PRELIMINARY','FINAL') AND "state" IN ('PENDING','CONFIRMED')
    AND ("opensAt" IS NULL OR "closesAt" IS NULL OR "opensAt" <= "closesAt")
    AND (("state" = 'CONFIRMED' AND "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "includesDeadline" IS NOT NULL)
      OR ("state" = 'PENDING' AND "includesDeadline" IS NULL)))
);
CREATE TABLE "agri_access_grants" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "scope" VARCHAR(32) NOT NULL,
  "grantedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "grantedAt" TIMESTAMPTZ(3) NOT NULL, "revokedAt" TIMESTAMPTZ(3), "expiresAt" TIMESTAMPTZ(3),
  "delegable" BOOLEAN NOT NULL DEFAULT false, "revision" INTEGER NOT NULL DEFAULT 1,
  "sourceGrantId" TEXT, "sourceRevision" INTEGER, "managerGrantId" TEXT, "managerRevision" INTEGER,
  UNIQUE ("competitionId", "userId", "scope"), UNIQUE ("id", "competitionId"),
  FOREIGN KEY ("sourceGrantId", "competitionId") REFERENCES "agri_access_grants"("id", "competitionId") ON DELETE RESTRICT,
  FOREIGN KEY ("managerGrantId", "competitionId") REFERENCES "agri_access_grants"("id", "competitionId") ON DELETE RESTRICT,
  CONSTRAINT "agri_grant_valid" CHECK ("revision" >= 1 AND "scope" IN ('WORKS_READ','PRIVATE_MATERIALS_READ','TECHNICAL_WRITE',
    'INTERNAL_NOTES_READ','ISSUES_WRITE','DEMO_WRITE','ONSITE_READ','ARCHIVE_WRITE','EXPORT','RULES_CONFIRM','ACCESS_MANAGE')
    AND ("expiresAt" IS NULL OR "expiresAt" > "grantedAt")
    AND (("sourceGrantId" IS NULL AND "sourceRevision" IS NULL AND "managerGrantId" IS NULL AND "managerRevision" IS NULL)
      OR ("sourceGrantId" IS NOT NULL AND "sourceRevision" IS NOT NULL AND "sourceRevision" >= 1 AND "managerGrantId" IS NOT NULL AND "managerRevision" IS NOT NULL AND "managerRevision" >= 1
        AND "scope" <> 'ACCESS_MANAGE' AND "sourceGrantId" <> "id" AND "managerGrantId" <> "id")))
);
CREATE INDEX "agri_access_grants_userId_competitionId_idx" ON "agri_access_grants"("userId", "competitionId");
CREATE TABLE "agri_workspace_events" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL, "action" VARCHAR(32) NOT NULL, "ruleVersionId" TEXT,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "createdAt" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE ("competitionId", "revision"),
  FOREIGN KEY ("ruleVersionId", "competitionId") REFERENCES "agri_rule_versions"("id", "competitionId") ON DELETE RESTRICT,
  CONSTRAINT "agri_workspace_event_valid" CHECK ("revision" >= 2 AND "action" IN ('saveRulesDraft','confirmRules','publishRules','setEnabled'))
);
CREATE TABLE "agri_command_receipts" (
  "id" TEXT PRIMARY KEY, "competitionId" TEXT NOT NULL REFERENCES "agri_workspaces"("competitionId") ON DELETE RESTRICT,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "operation" VARCHAR(32) NOT NULL,
  "idempotencyKey" VARCHAR(36) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
  "resourceId" TEXT NOT NULL, "appliedRevision" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE ("competitionId", "actorId", "operation", "idempotencyKey"),
  CONSTRAINT "agri_command_receipt_valid" CHECK ("appliedRevision" >= 1 AND "requestHash" ~ '^[a-f0-9]{64}$'
    AND "operation" IN ('saveRulesDraft','confirmRules','publishRules','setEnabled','delegateScope','revokeScope'))
);
CREATE FUNCTION "agri_foundation_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'AGRI_FOUNDATION_IMMUTABLE'; END;
$$;
CREATE TRIGGER "agri_rule_version_immutable" BEFORE UPDATE OR DELETE ON "agri_rule_versions" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_stage_window_immutable" BEFORE UPDATE OR DELETE ON "agri_stage_windows" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_workspace_event_immutable" BEFORE UPDATE OR DELETE ON "agri_workspace_events" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE TRIGGER "agri_command_receipt_immutable" BEFORE UPDATE OR DELETE ON "agri_command_receipts" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_immutable"();
CREATE FUNCTION "agri_foundation_identity_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AGRI_FOUNDATION_DELETE_FORBIDDEN'; END IF;
  IF TG_TABLE_NAME = 'agri_workspaces' THEN
    IF NEW."id" <> OLD."id" OR NEW."competitionId" <> OLD."competitionId" OR NEW."createdAt" <> OLD."createdAt"
      OR NEW."draftRevision" <> OLD."draftRevision" + 1 THEN RAISE EXCEPTION 'AGRI_WORKSPACE_REVISION_REQUIRED'; END IF;
  ELSE
    IF NEW."id" <> OLD."id" OR NEW."competitionId" <> OLD."competitionId" OR NEW."userId" <> OLD."userId"
      OR NEW."scope" <> OLD."scope" OR NEW."revision" <> OLD."revision" + 1 THEN RAISE EXCEPTION 'AGRI_GRANT_REVISION_REQUIRED'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "agri_workspace_identity_guard" BEFORE UPDATE OR DELETE ON "agri_workspaces" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_identity_guard"();
CREATE TRIGGER "agri_grant_identity_guard" BEFORE UPDATE OR DELETE ON "agri_access_grants" FOR EACH ROW EXECUTE FUNCTION "agri_foundation_identity_guard"();