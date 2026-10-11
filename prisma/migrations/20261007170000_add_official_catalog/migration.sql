CREATE TABLE "catalog_projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" VARCHAR(80) NOT NULL UNIQUE,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "publishedRevision" INTEGER,
  "withdrawn" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK ("publishedRevision" IS NULL OR ("publishedRevision" > 0 AND "publishedRevision" <= "revision"))
);
CREATE TABLE "catalog_project_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "catalog_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "payload" JSONB NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("projectId", "revision")
);
ALTER TABLE "catalog_projects" ADD CONSTRAINT "catalog_published_version_fkey"
  FOREIGN KEY ("id", "publishedRevision") REFERENCES "catalog_project_versions"("projectId", "revision") DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION protect_catalog_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Catalog versions are immutable'; END; $$;
CREATE TRIGGER "catalog_version_immutable" BEFORE UPDATE OR DELETE ON "catalog_project_versions" FOR EACH ROW EXECUTE FUNCTION protect_catalog_version();