-- Keep all existing credit amounts unchanged; only widen their precision.
-- Lock briefly and fail rather than waiting indefinitely for production writers.
SET lock_timeout = '10s';
ALTER TABLE "users" ALTER COLUMN "quotaPoints" TYPE NUMERIC(24,6) USING "quotaPoints"::numeric;
ALTER TABLE "runs" ALTER COLUMN "costPoints" TYPE NUMERIC(24,6) USING "costPoints"::numeric;
ALTER TABLE "workflow_runs" ALTER COLUMN "costPoints" TYPE NUMERIC(24,6) USING "costPoints"::numeric;
ALTER TABLE "quota_ledgers" ALTER COLUMN "amount" TYPE NUMERIC(24,6) USING "amount"::numeric, ALTER COLUMN "balanceAfter" TYPE NUMERIC(24,6) USING "balanceAfter"::numeric;
ALTER TABLE "compute_tasks" ALTER COLUMN "authorizedPoints" TYPE NUMERIC(24,6) USING "authorizedPoints"::numeric, ALTER COLUMN "settledPoints" TYPE NUMERIC(24,6) USING "settledPoints"::numeric;
