CREATE TABLE "visual_model_jobs" (
 "id" UUID PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "projectId" TEXT REFERENCES "projects"("id") ON DELETE RESTRICT,
 "idempotencyKey" VARCHAR(80) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
 "inputKey" VARCHAR(240) NOT NULL, "inputMime" VARCHAR(40) NOT NULL, "options" JSONB NOT NULL,
 "status" VARCHAR(24) NOT NULL DEFAULT 'QUEUED', "stage" VARCHAR(16) NOT NULL DEFAULT 'queued',
 "progress" INTEGER NOT NULL DEFAULT 0, "costPoints" NUMERIC(18,6) NOT NULL DEFAULT 0,
 "refunded" BOOLEAN NOT NULL DEFAULT FALSE, "cancelRequested" BOOLEAN NOT NULL DEFAULT FALSE,
 "providerTaskId" VARCHAR(120), "workerId" VARCHAR(80), "leaseToken" UUID, "leaseUntil" TIMESTAMP(3),
 "errorCode" VARCHAR(40), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "visual_model_jobs_state" CHECK ("status" IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED','NEEDS_REVIEW')),
 CONSTRAINT "visual_model_jobs_progress" CHECK ("progress" BETWEEN 0 AND 100 AND "costPoints" >= 0)
);
CREATE UNIQUE INDEX "visual_model_jobs_ownerId_idempotencyKey_key" ON "visual_model_jobs"("ownerId","idempotencyKey");
CREATE INDEX "visual_model_jobs_status_createdAt_idx" ON "visual_model_jobs"("status","createdAt");
CREATE INDEX "visual_model_jobs_ownerId_createdAt_idx" ON "visual_model_jobs"("ownerId","createdAt");
CREATE TABLE "visual_model_assets" (
 "id" UUID PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "jobId" UUID UNIQUE REFERENCES "visual_model_jobs"("id") ON DELETE RESTRICT,
 "objectKey" VARCHAR(240) UNIQUE NOT NULL, "sha256" VARCHAR(64) NOT NULL, "size" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "visual_model_assets_ownerId_createdAt_idx" ON "visual_model_assets"("ownerId","createdAt");
CREATE TABLE "visual_website_releases" (
 "id" UUID PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT, "version" INTEGER NOT NULL,
 "slug" VARCHAR(48) NOT NULL, "htmlKey" VARCHAR(240) UNIQUE NOT NULL, "sha256" VARCHAR(64) NOT NULL,
 "modelAssetId" UUID REFERENCES "visual_model_assets"("id") ON DELETE RESTRICT, "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "withdrawnAt" TIMESTAMP(3)
);
CREATE INDEX "visual_website_releases_slug_active_idx" ON "visual_website_releases"("slug","active");
CREATE UNIQUE INDEX "visual_website_releases_active_slug" ON "visual_website_releases"("slug") WHERE "active";
CREATE UNIQUE INDEX "visual_website_releases_active_project" ON "visual_website_releases"("projectId") WHERE "active";
CREATE INDEX "visual_website_releases_projectId_createdAt_idx" ON "visual_website_releases"("projectId","createdAt");
CREATE TABLE "visual_website_domains" (
 "id" UUID PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
 "hostname" VARCHAR(253) UNIQUE NOT NULL, "token" VARCHAR(80) NOT NULL,
 "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING', "providerId" VARCHAR(120), "validation" JSONB,
 "verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "visual_website_domains_ownerId_createdAt_idx" ON "visual_website_domains"("ownerId","createdAt");

CREATE UNIQUE INDEX "visual_model_jobs_providerTaskId_key" ON "visual_model_jobs"("providerTaskId");
ALTER TABLE visual_model_jobs ADD CONSTRAINT visual_model_jobs_stage CHECK (stage IN ('queued','upload','submit','wait','download','persist'));
ALTER TABLE visual_website_domains ADD CONSTRAINT visual_website_domains_state CHECK (status IN ('PENDING','PROVISIONING','ACTIVE','PAUSED','NEEDS_REVIEW'));
