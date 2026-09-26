-- 学生项目包：私密项目、事实与不可变成果版本。
CREATE TYPE "ProjectGoal" AS ENUM ('CAREER', 'CONTEST', 'PORTFOLIO');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'TEAM', 'PUBLIC');
CREATE TYPE "FactConfirmation" AS ENUM ('MISSING', 'UNCONFIRMED', 'CONFIRMED');
CREATE TYPE "ArtifactKind" AS ENUM ('PROJECT_FACTS', 'RESUME_BULLETS', 'README_DRAFT', 'PROJECT_ONE_PAGER', 'CONTEST_MVP', 'PITCH_OUTLINE', 'DEFENSE_QA', 'PROJECT_RETROSPECTIVE');

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "teamId" TEXT,
  "title" TEXT NOT NULL,
  "goal" "ProjectGoal" NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "project_facts" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "confirmation" "FactConfirmation" NOT NULL DEFAULT 'UNCONFIRMED',
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_facts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "artifacts" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "kind" "ArtifactKind" NOT NULL,
  "title" TEXT NOT NULL,
  "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
  "currentVersion" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "artifact_versions" (
  "id" TEXT NOT NULL,
  "artifactId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "contentJson" JSONB NOT NULL,
  "contentMarkdown" TEXT NOT NULL,
  "factSnapshotHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artifact_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_facts_projectId_key_key" ON "project_facts"("projectId", "key");
CREATE UNIQUE INDEX "artifacts_projectId_workflowId_key" ON "artifacts"("projectId", "workflowId");
CREATE UNIQUE INDEX "artifact_versions_artifactId_version_key" ON "artifact_versions"("artifactId", "version");
CREATE INDEX "projects_ownerId_updatedAt_idx" ON "projects"("ownerId", "updatedAt");
CREATE INDEX "projects_teamId_idx" ON "projects"("teamId");
CREATE INDEX "project_facts_updatedById_idx" ON "project_facts"("updatedById");
CREATE INDEX "artifacts_createdById_idx" ON "artifacts"("createdById");
CREATE INDEX "artifact_versions_createdById_idx" ON "artifact_versions"("createdById");
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_facts" ADD CONSTRAINT "project_facts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_facts" ADD CONSTRAINT "project_facts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
