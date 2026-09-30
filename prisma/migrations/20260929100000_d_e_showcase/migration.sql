ALTER TYPE "FavoriteTargetType" ADD VALUE 'ARTIFACT_VERSION';

CREATE TYPE "CompetitionEntryStatus" AS ENUM ('REGISTERED', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "ArtifactPublicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ArtifactReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

ALTER TABLE "competitions"
  ADD COLUMN "rules" TEXT,
  ADD COLUMN "maxTeams" INTEGER,
  ADD COLUMN "rewardXp" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "team_competitions"
  ADD COLUMN "entryStatus" "CompetitionEntryStatus" NOT NULL DEFAULT 'REGISTERED',
  ADD COLUMN "submissionVersionId" TEXT,
  ADD COLUMN "submittedById" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "submissionNote" TEXT,
  ADD COLUMN "publicConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "awardedXp" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "team_competitions_competitionId_entryStatus_idx" ON "team_competitions"("competitionId", "entryStatus");
ALTER TABLE "team_competitions" ADD CONSTRAINT "team_competitions_submissionVersionId_fkey" FOREIGN KEY ("submissionVersionId") REFERENCES "artifact_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "team_competitions" ADD CONSTRAINT "team_competitions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "artifact_publications" (
  "id" TEXT NOT NULL,
  "artifactVersionId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "ArtifactPublicationStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "withdrawnAt" TIMESTAMP(3),
  CONSTRAINT "artifact_publications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "artifact_publications_artifactVersionId_key" ON "artifact_publications"("artifactVersionId");
CREATE INDEX "artifact_publications_status_requestedAt_idx" ON "artifact_publications"("status", "requestedAt");
ALTER TABLE "artifact_publications" ADD CONSTRAINT "artifact_publications_artifactVersionId_fkey" FOREIGN KEY ("artifactVersionId") REFERENCES "artifact_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_publications" ADD CONSTRAINT "artifact_publications_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_publications" ADD CONSTRAINT "artifact_publications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "artifact_reactions" (
  "userId" TEXT NOT NULL,
  "artifactVersionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artifact_reactions_pkey" PRIMARY KEY ("userId", "artifactVersionId")
);
CREATE INDEX "artifact_reactions_artifactVersionId_createdAt_idx" ON "artifact_reactions"("artifactVersionId", "createdAt");
ALTER TABLE "artifact_reactions" ADD CONSTRAINT "artifact_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_reactions" ADD CONSTRAINT "artifact_reactions_artifactVersionId_fkey" FOREIGN KEY ("artifactVersionId") REFERENCES "artifact_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "artifact_comments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "artifactVersionId" TEXT NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "artifact_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "artifact_comments_artifactVersionId_createdAt_idx" ON "artifact_comments"("artifactVersionId", "createdAt");
CREATE INDEX "artifact_comments_userId_createdAt_idx" ON "artifact_comments"("userId", "createdAt");
ALTER TABLE "artifact_comments" ADD CONSTRAINT "artifact_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_comments" ADD CONSTRAINT "artifact_comments_artifactVersionId_fkey" FOREIGN KEY ("artifactVersionId") REFERENCES "artifact_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "artifact_reports" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "artifactVersionId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" VARCHAR(1000),
  "status" "ArtifactReportStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artifact_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "artifact_reports_reporterId_artifactVersionId_status_idx" ON "artifact_reports"("reporterId", "artifactVersionId", "status");
CREATE INDEX "artifact_reports_status_createdAt_idx" ON "artifact_reports"("status", "createdAt");
ALTER TABLE "artifact_reports" ADD CONSTRAINT "artifact_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "artifact_reports" ADD CONSTRAINT "artifact_reports_artifactVersionId_fkey" FOREIGN KEY ("artifactVersionId") REFERENCES "artifact_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TYPE "XpReason" ADD VALUE 'COMPETITION_AWARD';


CREATE TABLE "team_competition_contributions" (
  "id" TEXT NOT NULL,
  "teamCompetitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 1,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_competition_contributions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_competition_contributions_teamCompetitionId_userId_key" ON "team_competition_contributions"("teamCompetitionId", "userId");
CREATE INDEX "team_competition_contributions_userId_capturedAt_idx" ON "team_competition_contributions"("userId", "capturedAt");
ALTER TABLE "team_competition_contributions" ADD CONSTRAINT "team_competition_contributions_teamCompetitionId_fkey" FOREIGN KEY ("teamCompetitionId") REFERENCES "team_competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_competition_contributions" ADD CONSTRAINT "team_competition_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "artifact_reports_reporterId_artifactVersionId_status_key" ON "artifact_reports"("reporterId", "artifactVersionId", "status");
