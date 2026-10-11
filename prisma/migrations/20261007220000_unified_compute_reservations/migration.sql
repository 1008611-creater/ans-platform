-- Additive only. Does not rewrite existing quota points or daily media credits.
CREATE TYPE "ComputeTaskState" AS ENUM ('AUTHORIZED', 'RUNNING', 'UNCERTAIN', 'SETTLED', 'RELEASED');
CREATE TABLE "compute_tasks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "price" JSONB NOT NULL,
  "maxUnits" INTEGER NOT NULL,
  "authorizedPoints" INTEGER NOT NULL,
  "settledPoints" INTEGER,
  "units" INTEGER,
  "outcome" TEXT,
  "state" "ComputeTaskState" NOT NULL DEFAULT 'AUTHORIZED',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "compute_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compute_task_quote_valid" CHECK ((
    "provider" = 'toonflow' AND "requestHash" ~ '^[a-f0-9]{64}$' AND "revision" > 0 AND
    "maxUnits" > 0 AND "maxUnits" <= 1000000000 AND "authorizedPoints" > 0 AND
    "authorizedPoints" <= 2000000000 AND
    jsonb_typeof("price") = 'object' AND ("price" - ARRAY['unit', 'ratePoints', 'rateUnits', 'maxUnits']) = '{}'::jsonb AND "price" ?& ARRAY['unit', 'ratePoints', 'rateUnits', 'maxUnits'] AND
    jsonb_typeof("price"->'unit') = 'string' AND "price"->>'unit' IN ('token', 'image', 'second') AND
    jsonb_typeof("price"->'ratePoints') = 'number' AND jsonb_typeof("price"->'rateUnits') = 'number' AND
    jsonb_typeof("price"->'maxUnits') = 'number' AND
    ("price"->>'ratePoints')::numeric = TRUNC(("price"->>'ratePoints')::numeric) AND
    ("price"->>'rateUnits')::numeric = TRUNC(("price"->>'rateUnits')::numeric) AND
    ("price"->>'maxUnits')::numeric = TRUNC(("price"->>'maxUnits')::numeric) AND
    ("price"->>'ratePoints')::numeric BETWEEN 1 AND 1000000000 AND
    ("price"->>'rateUnits')::numeric BETWEEN 1 AND 1000000000 AND
    ("price"->>'maxUnits')::numeric BETWEEN "maxUnits" AND 1000000000 AND
    "authorizedPoints" = CEIL("maxUnits"::numeric * ("price"->>'ratePoints')::numeric / ("price"->>'rateUnits')::numeric)
  ) IS TRUE),
  CONSTRAINT "compute_task_state_valid" CHECK ((
    ("state" = 'AUTHORIZED' AND "startedAt" IS NULL AND "finishedAt" IS NULL AND "settledPoints" IS NULL AND "units" IS NULL AND "outcome" IS NULL) OR
    ("state" IN ('RUNNING', 'UNCERTAIN') AND "startedAt" IS NOT NULL AND "finishedAt" IS NULL AND "settledPoints" IS NULL AND "units" IS NULL AND "outcome" IS NULL) OR
    ("state" = 'SETTLED' AND "settledPoints" IS NOT NULL AND "units" IS NOT NULL AND "outcome" IS NOT NULL AND "startedAt" IS NOT NULL AND "finishedAt" IS NOT NULL AND "settledPoints" BETWEEN 1 AND "authorizedPoints" AND
      "units" BETWEEN 1 AND "maxUnits" AND "outcome" IN ('succeeded', 'partial', 'failed') AND
      "settledPoints" = CEIL("units"::numeric * ("price"->>'ratePoints')::numeric / ("price"->>'rateUnits')::numeric)) OR
    ("state" = 'RELEASED' AND "settledPoints" IS NOT NULL AND "finishedAt" IS NOT NULL AND "settledPoints" = 0 AND "units" IS NULL AND "outcome" IS NULL)
  ) IS TRUE)
);
CREATE TABLE "compute_task_events" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "evidenceRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compute_task_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compute_task_event_valid" CHECK ("revision" > 1 AND "requestHash" ~ '^[a-f0-9]{64}$' AND
    "action" IN ('start', 'uncertain', 'settle', 'release') AND
    ("action" NOT IN ('settle', 'release') OR "evidenceRef" IS NOT NULL))
);
CREATE UNIQUE INDEX "compute_tasks_userId_provider_idempotencyKey_key" ON "compute_tasks"("userId", "provider", "idempotencyKey");
CREATE INDEX "compute_tasks_userId_createdAt_idx" ON "compute_tasks"("userId", "createdAt");
CREATE INDEX "compute_tasks_provider_state_updatedAt_idx" ON "compute_tasks"("provider", "state", "updatedAt");
CREATE UNIQUE INDEX "compute_task_events_taskId_eventId_key" ON "compute_task_events"("taskId", "eventId");
CREATE UNIQUE INDEX "compute_task_events_taskId_revision_key" ON "compute_task_events"("taskId", "revision");
ALTER TABLE "compute_tasks" ADD CONSTRAINT "compute_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compute_task_events" ADD CONSTRAINT "compute_task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "compute_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION ans_protect_compute_task() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."userId", NEW."provider", NEW."idempotencyKey", NEW."requestHash", NEW."modelId", NEW."policyVersion", NEW."price", NEW."maxUnits", NEW."authorizedPoints", NEW."createdAt")
     IS DISTINCT FROM ROW(OLD."userId", OLD."provider", OLD."idempotencyKey", OLD."requestHash", OLD."modelId", OLD."policyVersion", OLD."price", OLD."maxUnits", OLD."authorizedPoints", OLD."createdAt") THEN
    RAISE EXCEPTION 'COMPUTE_QUOTE_IMMUTABLE';
  END IF;
  IF NEW."revision" <> OLD."revision" + 1 OR
     NOT ((OLD."state" = 'AUTHORIZED' AND NEW."state" IN ('RUNNING', 'RELEASED')) OR
          (OLD."state" = 'RUNNING' AND NEW."state" IN ('UNCERTAIN', 'SETTLED', 'RELEASED')) OR
          (OLD."state" = 'UNCERTAIN' AND NEW."state" IN ('SETTLED', 'RELEASED'))) THEN
    RAISE EXCEPTION 'COMPUTE_STATE_CONFLICT';
  END IF;
  IF OLD."startedAt" IS NOT NULL AND NEW."startedAt" IS DISTINCT FROM OLD."startedAt" THEN
    RAISE EXCEPTION 'COMPUTE_START_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER compute_task_update_guard BEFORE UPDATE ON "compute_tasks" FOR EACH ROW EXECUTE FUNCTION ans_protect_compute_task();
CREATE FUNCTION ans_protect_compute_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'COMPUTE_EVENT_IMMUTABLE';
END $$;
CREATE TRIGGER compute_event_update_guard BEFORE UPDATE ON "compute_task_events" FOR EACH ROW EXECUTE FUNCTION ans_protect_compute_event();
