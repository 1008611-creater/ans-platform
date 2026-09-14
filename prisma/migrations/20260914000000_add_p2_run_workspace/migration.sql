-- P2: 模板收藏 + 运行幂等键

-- AlterTable: Run 增加客户端幂等键
ALTER TABLE "runs" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: 同一用户同一幂等键只允许一次运行记录
CREATE UNIQUE INDEX "runs_userId_idempotencyKey_key" ON "runs"("userId", "idempotencyKey");

-- CreateTable: 模板收藏
CREATE TABLE "template_favorites" (
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_favorites_pkey" PRIMARY KEY ("userId","templateId")
);

-- CreateIndex
CREATE INDEX "template_favorites_userId_createdAt_idx" ON "template_favorites"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "template_favorites_templateId_idx" ON "template_favorites"("templateId");

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
