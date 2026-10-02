CREATE TABLE "admin_ai_config_versions" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "apiKeyLast4" TEXT NOT NULL,
    "selectedModel" TEXT NOT NULL,
    "availableModels" JSONB NOT NULL,
    "reasoningEffort" TEXT NOT NULL,
    "timeoutMs" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_ai_config_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_ai_config_versions_configId_version_key"
  ON "admin_ai_config_versions"("configId", "version");
CREATE INDEX "admin_ai_config_versions_configId_createdAt_idx"
  ON "admin_ai_config_versions"("configId", "createdAt");

ALTER TABLE "admin_ai_config_versions" ADD CONSTRAINT "admin_ai_config_versions_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "admin_ai_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
