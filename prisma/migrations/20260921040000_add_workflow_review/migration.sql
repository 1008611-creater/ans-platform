-- 工作流审核字段：与模板审核保持同一套「AI 初审 + 人工复核」模型。
--
-- reviewScore 保存 AI 初审的完整结果（verdict/scores/reason/model/checkedAt），
-- reviewNote 保存人工复核理由，reviewedAt 记录人工复核时间。
-- 三者都可为空：本次迁移之前的历史工作流没有审核记录。

ALTER TABLE "workflows" ADD COLUMN "reviewScore" JSONB;
ALTER TABLE "workflows" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "workflows" ADD COLUMN "reviewedAt" TIMESTAMP(3);
