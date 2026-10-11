-- Additive API request audit only. No second wallet and no changes to Toonflow guards.
SET lock_timeout = '10s';
CREATE TABLE "api_compute_requests" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL,
 "provider" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "modelId" TEXT NOT NULL,
 "policyVersion" TEXT NOT NULL,
 "price" JSONB NOT NULL,
 "maxUnits" INTEGER NOT NULL,
 "authorizedPoints" NUMERIC(24,6) NOT NULL,
 "settledPoints" NUMERIC(24,6),
 "outcome" TEXT,
 "state" "ComputeTaskState" NOT NULL DEFAULT 'RUNNING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "startedAt" TIMESTAMP(3),
 "finishedAt" TIMESTAMP(3),
 CONSTRAINT "api_compute_request_quote_valid" CHECK (
  "provider" = 'apic-codex' AND "modelId" IN ('deepseek-v4.1-flash','gpt-6-astra','gpt-6.1-sol') AND
  "requestHash" ~ '^[a-f0-9]{64}$' AND "maxUnits" BETWEEN 1 AND 16384 AND "authorizedPoints" > 0 AND
  "authorizedPoints" <= 10 AND jsonb_typeof("price") = 'object'
 ),
 CONSTRAINT "api_compute_request_state_valid" CHECK (
  ("state" IN ('RUNNING','UNCERTAIN') AND "settledPoints" IS NULL AND "finishedAt" IS NULL AND "startedAt" IS NOT NULL) OR
  ("state" IN ('SETTLED','RELEASED') AND "settledPoints" IS NOT NULL AND "settledPoints" BETWEEN 0 AND "authorizedPoints" AND "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND ("state" != 'RELEASED' OR "settledPoints" = 0))
 ),
 CONSTRAINT "api_compute_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "api_compute_requests_userId_provider_idempotencyKey_key" ON "api_compute_requests"("userId","provider","idempotencyKey");
CREATE INDEX "api_compute_requests_userId_createdAt_idx" ON "api_compute_requests"("userId","createdAt");
CREATE INDEX "api_compute_requests_provider_state_updatedAt_idx" ON "api_compute_requests"("provider","state","updatedAt");

CREATE FUNCTION ans_protect_api_compute_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW."userId",NEW."provider",NEW."idempotencyKey",NEW."requestHash",NEW."modelId",NEW."policyVersion",NEW."price",NEW."maxUnits",NEW."authorizedPoints",NEW."createdAt",NEW."startedAt")
  IS DISTINCT FROM ROW(OLD."userId",OLD."provider",OLD."idempotencyKey",OLD."requestHash",OLD."modelId",OLD."policyVersion",OLD."price",OLD."maxUnits",OLD."authorizedPoints",OLD."createdAt",OLD."startedAt") THEN
  RAISE EXCEPTION 'API_COMPUTE_QUOTE_IMMUTABLE';
 END IF;
 IF OLD."state" IN ('SETTLED','RELEASED') OR
  (OLD."state" = 'UNCERTAIN' AND NEW."state" NOT IN ('SETTLED','RELEASED')) OR
  (OLD."state" = 'RUNNING' AND NEW."state" NOT IN ('RUNNING','UNCERTAIN','SETTLED','RELEASED')) THEN
  RAISE EXCEPTION 'API_COMPUTE_STATE_CONFLICT';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER api_compute_request_update_guard BEFORE UPDATE ON "api_compute_requests" FOR EACH ROW EXECUTE FUNCTION ans_protect_api_compute_request();
