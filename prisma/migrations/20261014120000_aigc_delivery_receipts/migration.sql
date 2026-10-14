-- Additive delivery metadata only. No balance, ledger or compute-state changes.
CREATE TYPE "ComputeDeliveryState" AS ENUM ('PENDING', 'AVAILABLE', 'FAILED', 'UNAVAILABLE');
CREATE UNIQUE INDEX "compute_tasks_id_user_provider_key" ON "compute_tasks"("id", "userId", "provider");

CREATE FUNCTION ans_compute_delivery_artifact_valid(value JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE path TEXT; segment TEXT; bytes NUMERIC;
BEGIN
  IF (jsonb_typeof(value) = 'object' AND value ?& ARRAY['relativePath','sha256','mimeType','sizeBytes'] AND
      value - ARRAY['relativePath','sha256','mimeType','sizeBytes'] = '{}'::jsonb AND
      jsonb_typeof(value->'relativePath') = 'string' AND jsonb_typeof(value->'sha256') = 'string' AND
      jsonb_typeof(value->'mimeType') = 'string' AND jsonb_typeof(value->'sizeBytes') = 'number') IS NOT TRUE THEN RETURN FALSE; END IF;
  path := value->>'relativePath'; bytes := (value->>'sizeBytes')::numeric;
  IF length(path) NOT BETWEEN 1 AND 2048 OR position(E'\\' IN path) > 0 OR path ~ '[<>:"|?*[:cntrl:]]' OR
     value->>'sha256' !~ '^[a-f0-9]{64}$' OR value->>'mimeType' NOT IN ('image/png','image/jpeg','image/webp','video/mp4','video/webm') OR
     bytes NOT BETWEEN 1 AND 104857600 OR bytes <> trunc(bytes) THEN RETURN FALSE; END IF;
  FOREACH segment IN ARRAY string_to_array(path, '/') LOOP
    IF segment IN ('', '.', '..') OR segment ~ '[. ]$' OR segment ~* '^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)' THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

CREATE TABLE "compute_deliveries" (
  "id" VARCHAR(64) NOT NULL,
  "computeTaskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'toonflow',
  "state" "ComputeDeliveryState" NOT NULL DEFAULT 'PENDING',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "artifact" JSONB,
  "failureCode" VARCHAR(40),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "availableAt" TIMESTAMP(3),
  CONSTRAINT "compute_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compute_delivery_identity_valid" CHECK ("id" ~ '^[a-f0-9]{64}$' AND "provider" = 'toonflow' AND
    length("userId") BETWEEN 1 AND 128 AND "userId" ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' AND
    length("computeTaskId") BETWEEN 8 AND 160 AND "computeTaskId" ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' AND "revision" BETWEEN 1 AND 2147483646),
  CONSTRAINT "compute_delivery_artifact_valid" CHECK ("artifact" IS NULL OR ans_compute_delivery_artifact_valid("artifact")),
  CONSTRAINT "compute_delivery_state_valid" CHECK ((
    ("state" IN ('PENDING','FAILED') AND "artifact" IS NULL AND "availableAt" IS NULL) OR
    ("state" IN ('AVAILABLE','UNAVAILABLE') AND "artifact" IS NOT NULL AND "availableAt" IS NOT NULL)
  ) AND (("state" IN ('PENDING','AVAILABLE') AND "failureCode" IS NULL) OR
    ("state" IN ('FAILED','UNAVAILABLE') AND "failureCode" IN ('WORKSPACE_WRITE_FAILED','ARTIFACT_MISSING','ARTIFACT_INVALID','RECOVERY_PENDING','GENERATION_FAILED'))) IS TRUE)
);
CREATE TABLE "compute_delivery_events" (
  "id" TEXT NOT NULL,
  "deliveryId" VARCHAR(64) NOT NULL,
  "eventId" VARCHAR(160) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "revision" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compute_delivery_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compute_delivery_event_valid" CHECK ("revision" BETWEEN 1 AND 2147483646 AND "requestHash" ~ '^[a-f0-9]{64}$' AND
    length("eventId") BETWEEN 8 AND 160 AND "eventId" ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' AND "action" IN ('pending','available','failed','unavailable'))
);
CREATE UNIQUE INDEX "compute_deliveries_computeTaskId_key" ON "compute_deliveries"("computeTaskId");
CREATE UNIQUE INDEX "compute_deliveries_task_user_provider_key" ON "compute_deliveries"("computeTaskId", "userId", "provider");
CREATE INDEX "compute_deliveries_userId_createdAt_idx" ON "compute_deliveries"("userId", "createdAt");
CREATE UNIQUE INDEX "compute_delivery_events_deliveryId_eventId_key" ON "compute_delivery_events"("deliveryId", "eventId");
CREATE UNIQUE INDEX "compute_delivery_events_deliveryId_revision_key" ON "compute_delivery_events"("deliveryId", "revision");
ALTER TABLE "compute_deliveries" ADD CONSTRAINT "compute_deliveries_computeTaskId_userId_provider_fkey"
  FOREIGN KEY ("computeTaskId", "userId", "provider") REFERENCES "compute_tasks"("id", "userId", "provider") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "compute_delivery_events" ADD CONSTRAINT "compute_delivery_events_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "compute_deliveries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE FUNCTION ans_compute_delivery_preserve() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE task_state "ComputeTaskState"; task_outcome TEXT; task_unit TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_HISTORY_REQUIRED'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'PENDING' OR NEW.revision <> 1 OR NEW.artifact IS NOT NULL OR NEW."availableAt" IS NOT NULL THEN
      RAISE EXCEPTION 'COMPUTE_DELIVERY_INITIAL_STATE'; END IF;
  ELSE
    IF ROW(NEW.id, NEW."computeTaskId", NEW."userId", NEW.provider, NEW."createdAt") IS DISTINCT FROM
       ROW(OLD.id, OLD."computeTaskId", OLD."userId", OLD.provider, OLD."createdAt") THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_IDENTITY_IMMUTABLE'; END IF;
    IF OLD.artifact IS NOT NULL AND NEW.artifact IS DISTINCT FROM OLD.artifact THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_ARTIFACT_IMMUTABLE'; END IF;
    IF OLD."availableAt" IS NOT NULL AND NEW."availableAt" IS DISTINCT FROM OLD."availableAt" THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_AVAILABLE_AT_IMMUTABLE'; END IF;
    IF NEW.revision <> OLD.revision + 1 OR NOT (
      (OLD.state = 'PENDING' AND NEW.state IN ('AVAILABLE','FAILED')) OR
      (OLD.state = 'FAILED' AND NEW.state = 'PENDING') OR
      (OLD.state = 'AVAILABLE' AND NEW.state = 'UNAVAILABLE') OR
      (OLD.state = 'UNAVAILABLE' AND NEW.state = 'AVAILABLE')
    ) THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_STATE_CONFLICT'; END IF;
  END IF;
  SELECT state, outcome, price->>'unit' INTO task_state, task_outcome, task_unit FROM compute_tasks
    WHERE id = NEW."computeTaskId" AND "userId" = NEW."userId" AND provider = NEW.provider FOR SHARE;
  IF NOT FOUND OR task_unit IS NULL OR task_unit NOT IN ('image','second') THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_TASK_REQUIRED'; END IF;
  -- Failed pre-output delivery can still be reconciled after a no-usage release.
  IF NEW.state = 'PENDING' AND (task_state IN ('RUNNING','UNCERTAIN','SETTLED')) IS NOT TRUE THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_TASK_NOT_STARTED'; END IF;
  IF NEW.state IN ('AVAILABLE','UNAVAILABLE') AND (
    task_state = 'SETTLED' AND task_outcome IN ('succeeded','partial') AND (
      (task_unit = 'image' AND NEW.artifact->>'mimeType' IN ('image/png','image/jpeg','image/webp')) OR
      (task_unit = 'second' AND NEW.artifact->>'mimeType' IN ('video/mp4','video/webm'))
    )
  ) IS NOT TRUE THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_SETTLEMENT_REQUIRED'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER compute_delivery_preserve BEFORE INSERT OR UPDATE OR DELETE ON compute_deliveries FOR EACH ROW EXECUTE FUNCTION ans_compute_delivery_preserve();

CREATE FUNCTION ans_compute_delivery_event_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE current_revision INTEGER; current_state "ComputeDeliveryState";
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_EVENT_IMMUTABLE'; END IF;
  SELECT revision, state INTO current_revision, current_state FROM compute_deliveries WHERE id = NEW."deliveryId";
  IF current_revision IS DISTINCT FROM NEW.revision OR lower(current_state::text) IS DISTINCT FROM NEW.action THEN RAISE EXCEPTION 'COMPUTE_DELIVERY_EVENT_AUTHORITY'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER compute_delivery_event_guard BEFORE INSERT OR UPDATE OR DELETE ON compute_delivery_events FOR EACH ROW EXECUTE FUNCTION ans_compute_delivery_event_guard();
CREATE FUNCTION ans_compute_delivery_receipt_required() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM compute_delivery_events WHERE "deliveryId" = NEW.id AND revision = NEW.revision AND action = lower(NEW.state::text)) THEN
    RAISE EXCEPTION 'COMPUTE_DELIVERY_EVENT_REQUIRED'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER compute_delivery_receipt_required AFTER INSERT OR UPDATE ON compute_deliveries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_compute_delivery_receipt_required();
