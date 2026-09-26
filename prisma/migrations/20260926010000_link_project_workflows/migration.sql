-- Link the student project flow to immutable platform workflows and runs.
ALTER TABLE "workflows" ADD COLUMN "isOfficial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workflows" ADD COLUMN "officialId" TEXT;
CREATE UNIQUE INDEX "workflows_officialId_key" ON "workflows"("officialId");
ALTER TABLE "workflow_runs" ADD COLUMN "projectId" TEXT;
ALTER TABLE "workflow_runs" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "workflow_runs_userId_idempotencyKey_key" ON "workflow_runs"("userId", "idempotencyKey");
CREATE INDEX "workflow_runs_projectId_idx" ON "workflow_runs"("projectId");
ALTER TABLE "artifact_versions" ADD COLUMN "workflowRunId" TEXT;
CREATE INDEX "artifact_versions_workflowRunId_idx" ON "artifact_versions"("workflowRunId");
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
