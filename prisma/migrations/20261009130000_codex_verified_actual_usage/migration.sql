-- Permit authoritative usage above an estimate; application atomically debits the difference.
-- Preserve all balances, records and immutable quote guards.
SET lock_timeout = '10s';
ALTER TABLE "api_compute_requests" DROP CONSTRAINT "api_compute_request_state_valid";
ALTER TABLE "api_compute_requests" ADD CONSTRAINT "api_compute_request_state_valid" CHECK (
 ("state" IN ('RUNNING','UNCERTAIN') AND "settledPoints" IS NULL AND "finishedAt" IS NULL AND "startedAt" IS NOT NULL) OR
 ("state" IN ('SETTLED','RELEASED') AND "settledPoints" IS NOT NULL AND "settledPoints" BETWEEN 0 AND 10 AND "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND ("state" != 'RELEASED' OR "settledPoints" = 0))
);
