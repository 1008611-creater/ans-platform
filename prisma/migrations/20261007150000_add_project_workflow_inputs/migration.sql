ALTER TYPE "ArtifactKind" ADD VALUE 'RESUME_WEBSITE';

CREATE TABLE "project_workflow_inputs" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_workflow_inputs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_workflow_inputs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "project_workflow_inputs_projectId_workflowId_key" ON "project_workflow_inputs"("projectId", "workflowId");

-- One accepted website run per private project at a time, even across app instances.
CREATE UNIQUE INDEX "workflow_runs_one_active_resume_website"
ON "workflow_runs" ("projectId")
WHERE "status" IN ('QUEUED', 'RUNNING') AND "input"->>'recipeId' = 'resume-website';
