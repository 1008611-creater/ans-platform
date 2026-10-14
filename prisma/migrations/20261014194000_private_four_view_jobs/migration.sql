-- Separate private, user-confirmed 5-point preparation; existing 3D tasks stay unchanged.
CREATE TABLE visual_four_view_jobs (
 id uuid PRIMARY KEY,
 "ownerId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "idempotencyKey" text NOT NULL,
 "requestHash" text NOT NULL,
 "inputKey" text NOT NULL,
 "inputMime" text NOT NULL,
 "aspectRatio" text NOT NULL,
 model text NOT NULL,
 status text NOT NULL DEFAULT 'UPLOADING',
 "costPoints" numeric(24,6) NOT NULL DEFAULT 5,
 charged boolean NOT NULL DEFAULT false,
 "resultHash" text,
 refunded boolean NOT NULL DEFAULT false,
 "leaseToken" uuid,
 "leaseUntil" timestamp(3),
 "errorCode" text,
 "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("ownerId","idempotencyKey"),
 CONSTRAINT four_view_valid CHECK (
 "idempotencyKey" ~ '^[A-Za-z0-9_-]{16,80}$' AND "requestHash" ~ '^[a-f0-9]{64}$' AND
 "inputKey" IN ('visual/'||id::text||'/input.png','visual/'||id::text||'/input.jpg','visual/'||id::text||'/input.webp') AND
 "inputMime" IN ('image/png','image/jpeg','image/webp') AND
 "aspectRatio" IN ('1:1','4:3','3:4','16:9','9:16','3:2','2:3') AND "costPoints"=5 AND
 status IN ('UPLOADING','QUEUED','RUNNING','SUCCEEDED','FAILED','NEEDS_REVIEW','CANCELLED','ARCHIVED') AND (NOT refunded OR charged) AND (status<>'SUCCEEDED' OR (charged AND NOT refunded AND "resultHash" IS NOT NULL)) AND (status NOT IN ('QUEUED','RUNNING') OR (charged AND NOT refunded)) AND ("resultHash" IS NULL OR "resultHash" ~ '^[a-f0-9]{64}$'))
);
CREATE INDEX four_view_owner_created ON visual_four_view_jobs("ownerId","createdAt" DESC);
CREATE INDEX four_view_queue ON visual_four_view_jobs(status,"createdAt");
