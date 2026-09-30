CREATE TABLE "admin_ai_configs" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "apiKeyLast4" TEXT NOT NULL,
    "selectedModel" TEXT NOT NULL,
    "availableModels" JSONB NOT NULL,
    "reasoningEffort" TEXT NOT NULL DEFAULT 'none',
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_ai_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_ai_configs_updatedAt_idx" ON "admin_ai_configs"("updatedAt");

ALTER TABLE "admin_ai_configs" ADD CONSTRAINT "admin_ai_configs_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
