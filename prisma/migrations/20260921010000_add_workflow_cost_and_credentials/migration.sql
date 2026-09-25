-- Workflow 运行成本与 BYOK 凭证。
-- 注意：列名必须加双引号，否则 Postgres 会把 camelCase 折叠成小写，
-- 与 Prisma Client 生成的查询（带引号的 "estimatedCost" / "userId"）不一致。
ALTER TABLE "workflows" ADD COLUMN "estimatedCost" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "user_model_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai-compatible',
    "label" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_model_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_model_credentials_userId_label_key" ON "user_model_credentials"("userId", "label");
CREATE INDEX "user_model_credentials_userId_active_idx" ON "user_model_credentials"("userId", "active");

ALTER TABLE "user_model_credentials" ADD CONSTRAINT "user_model_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
