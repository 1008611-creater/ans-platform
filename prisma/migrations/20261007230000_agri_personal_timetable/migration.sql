-- CreateTable
CREATE TABLE "agri_personal_tasks" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "templateKey" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueState" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "dueAt" TIMESTAMPTZ(3),
    "acceptanceCriteria" TEXT NOT NULL,
    "collaborationNotes" VARCHAR(2000),
    "inputRequirements" JSONB NOT NULL,
    "blockingInput" JSONB,
    "completionResult" VARCHAR(2000),
    "completedById" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agri_personal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_task_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agri_task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_task_shares" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "agri_task_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agri_task_command_receipts" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "taskId" TEXT,
    "appliedRevision" INTEGER,
    "createdTaskCount" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agri_task_command_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agri_personal_tasks_ownerId_competitionId_status_dueAt_idx" ON "agri_personal_tasks"("ownerId", "competitionId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "agri_personal_tasks_ownerId_competitionId_templateKey_key" ON "agri_personal_tasks"("ownerId", "competitionId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "agri_personal_tasks_id_competitionId_key" ON "agri_personal_tasks"("id", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_task_events_taskId_revision_key" ON "agri_task_events"("taskId", "revision");

-- CreateIndex
CREATE INDEX "agri_task_shares_userId_revokedAt_expiresAt_idx" ON "agri_task_shares"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "agri_task_shares_taskId_userId_key" ON "agri_task_shares"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "agri_task_command_receipts_competitionId_actorId_operation__key" ON "agri_task_command_receipts"("competitionId", "actorId", "operation", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "agri_personal_tasks" ADD CONSTRAINT "agri_personal_tasks_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_personal_tasks" ADD CONSTRAINT "agri_personal_tasks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_events" ADD CONSTRAINT "agri_task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "agri_personal_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_events" ADD CONSTRAINT "agri_task_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_shares" ADD CONSTRAINT "agri_task_shares_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "agri_personal_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_shares" ADD CONSTRAINT "agri_task_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_shares" ADD CONSTRAINT "agri_task_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_command_receipts" ADD CONSTRAINT "agri_task_command_receipts_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_command_receipts" ADD CONSTRAINT "agri_task_command_receipts_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agri_task_command_receipts" ADD CONSTRAINT "agri_task_command_receipts_taskId_competitionId_fkey" FOREIGN KEY ("taskId", "competitionId") REFERENCES "agri_personal_tasks"("id", "competitionId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve private task ownership/history. No existing competition data is rewritten.
CREATE FUNCTION ans_agri_task_instant_valid(value TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$' THEN RETURN FALSE; END IF;
  PERFORM value::timestamptz;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;
CREATE FUNCTION ans_agri_task_date_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
  SELECT (jsonb_typeof(value) = 'object' AND value ?& ARRAY['state','at'] AND
    value - ARRAY['state','at'] = '{}'::jsonb AND
    ((value->>'state' = 'UNKNOWN' AND value->'at' = 'null'::jsonb) OR
     (value->>'state' IN ('TENTATIVE','CONFIRMED') AND jsonb_typeof(value->'at') = 'string' AND ans_agri_task_instant_valid(value->>'at')))) IS TRUE;
$$;
CREATE FUNCTION ans_agri_task_input_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
  SELECT (jsonb_typeof(value) = 'object' AND value ?& ARRAY['from','needed','latestAt'] AND
    value - ARRAY['from','needed','latestAt'] = '{}'::jsonb AND
    jsonb_typeof(value->'from') = 'string' AND length(btrim(value->>'from')) BETWEEN 1 AND 160 AND
    jsonb_typeof(value->'needed') = 'string' AND length(btrim(value->>'needed')) BETWEEN 1 AND 2000 AND
    ans_agri_task_date_valid(value->'latestAt')) IS TRUE;
$$;
CREATE FUNCTION ans_agri_task_inputs_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB;
BEGIN
  IF (jsonb_typeof(value) = 'object' AND value ?& ARRAY['schemaVersion','items'] AND
    value - ARRAY['schemaVersion','items'] = '{}'::jsonb AND value->'schemaVersion' = '1'::jsonb AND jsonb_typeof(value->'items') = 'array') IS NOT TRUE THEN RETURN FALSE; END IF;
  IF jsonb_array_length(value->'items') > 20 THEN RETURN FALSE; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(value->'items') LOOP
    IF NOT ans_agri_task_input_valid(item) THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;
ALTER TABLE agri_personal_tasks ADD CONSTRAINT agri_task_state_valid CHECK ((
  length(btrim(title)) > 0 AND length(btrim("acceptanceCriteria")) BETWEEN 1 AND 2000 AND
  stage IN ('PREPARATION','PRELIMINARY','FINAL','EVENT_DAY','ARCHIVE') AND
  status IN ('NOT_STARTED','IN_PROGRESS','BLOCKED','DONE') AND priority IN ('LOW','NORMAL','HIGH') AND
  revision BETWEEN 1 AND 2147483646 AND
  (("dueState" = 'UNKNOWN' AND "dueAt" IS NULL) OR ("dueState" IN ('TENTATIVE','CONFIRMED') AND "dueAt" IS NOT NULL)) AND
  ans_agri_task_inputs_valid("inputRequirements") AND
  ("blockingInput" IS NULL OR ans_agri_task_input_valid("blockingInput")) AND
  (status <> 'BLOCKED' OR "blockingInput" IS NOT NULL) AND
  ((status = 'DONE' AND "blockingInput" IS NULL AND length(btrim("completionResult")) BETWEEN 1 AND 2000 AND "completedById" = "ownerId" AND "completedAt" IS NOT NULL) OR
   (status <> 'DONE' AND "completionResult" IS NULL AND "completedById" IS NULL AND "completedAt" IS NULL))
) IS TRUE);
ALTER TABLE agri_task_events ADD CONSTRAINT agri_task_event_valid CHECK ((
  revision BETWEEN 1 AND 2147483646 AND action IN ('create','update','initialize','share','revokeShare') AND
  jsonb_typeof(snapshot) = 'object' AND snapshot->'schemaVersion' = '1'::jsonb AND
  jsonb_typeof(snapshot->'task') = 'object' AND octet_length(snapshot::text) <= 100000
) IS TRUE);
ALTER TABLE agri_task_shares ADD CONSTRAINT agri_task_share_valid CHECK (revision > 0 AND "userId" <> "sharedById" AND ("expiresAt" IS NULL OR "expiresAt" > "sharedAt"));
ALTER TABLE agri_task_command_receipts ADD CONSTRAINT agri_task_receipt_valid CHECK ((
  operation IN ('create','update','initialize','share','revokeShare') AND "requestHash" ~ '^[a-f0-9]{64}$' AND
  ((operation = 'initialize' AND "taskId" IS NULL AND "appliedRevision" IS NULL AND "createdTaskCount" BETWEEN 0 AND 6) OR
   (operation <> 'initialize' AND "taskId" IS NOT NULL AND "appliedRevision" > 0 AND "createdTaskCount" IS NULL))
) IS TRUE);
CREATE FUNCTION ans_agri_task_preserve() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AGRI_TASK_HISTORY_REQUIRED'; END IF;
  IF NEW.id <> OLD.id OR NEW."competitionId" <> OLD."competitionId" OR NEW."ownerId" <> OLD."ownerId" OR
     NEW."templateKey" IS DISTINCT FROM OLD."templateKey" OR NEW."createdAt" <> OLD."createdAt" OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'AGRI_TASK_REVISION_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agri_task_preserve BEFORE UPDATE OR DELETE ON agri_personal_tasks FOR EACH ROW EXECUTE FUNCTION ans_agri_task_preserve();
CREATE FUNCTION ans_agri_task_history_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'AGRI_TASK_HISTORY_IMMUTABLE'; END;
$$;
CREATE TRIGGER agri_task_event_immutable BEFORE UPDATE OR DELETE ON agri_task_events FOR EACH ROW EXECUTE FUNCTION ans_agri_task_history_immutable();
CREATE TRIGGER agri_task_receipt_immutable BEFORE UPDATE OR DELETE ON agri_task_command_receipts FOR EACH ROW EXECUTE FUNCTION ans_agri_task_history_immutable();
CREATE FUNCTION ans_agri_task_share_preserve() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AGRI_TASK_SHARE_HISTORY_REQUIRED'; END IF;
  IF NEW.id <> OLD.id OR NEW."taskId" <> OLD."taskId" OR NEW."userId" <> OLD."userId" OR NEW."sharedById" <> OLD."sharedById" OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'AGRI_TASK_SHARE_REVISION_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agri_task_share_preserve BEFORE UPDATE OR DELETE ON agri_task_shares FOR EACH ROW EXECUTE FUNCTION ans_agri_task_share_preserve();

CREATE FUNCTION ans_agri_task_authority() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; current_revision INTEGER;
BEGIN
  SELECT "ownerId", revision INTO owner_id, current_revision FROM agri_personal_tasks WHERE id = NEW."taskId";
  IF TG_TABLE_NAME = 'agri_task_events' THEN
    IF NEW."actorId" IS DISTINCT FROM owner_id OR NEW.revision IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'AGRI_TASK_EVENT_AUTHORITY'; END IF;
  ELSIF TG_TABLE_NAME = 'agri_task_shares' THEN
    IF NEW."sharedById" IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'AGRI_TASK_SHARE_AUTHORITY'; END IF;
  ELSE
    IF NEW."actorId" IS DISTINCT FROM owner_id OR NEW."appliedRevision" IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'AGRI_TASK_RECEIPT_AUTHORITY'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agri_task_event_authority BEFORE INSERT ON agri_task_events FOR EACH ROW EXECUTE FUNCTION ans_agri_task_authority();
CREATE TRIGGER agri_task_share_authority BEFORE INSERT OR UPDATE ON agri_task_shares FOR EACH ROW EXECUTE FUNCTION ans_agri_task_authority();
CREATE TRIGGER agri_task_receipt_authority BEFORE INSERT ON agri_task_command_receipts FOR EACH ROW WHEN (NEW."taskId" IS NOT NULL) EXECUTE FUNCTION ans_agri_task_authority();
