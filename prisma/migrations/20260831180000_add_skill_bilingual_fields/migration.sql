-- Add bilingual metadata/content fields for SKILL prompts.
-- Existing prompts remain compatible: nullable fields fall back to title/description/content.
ALTER TABLE "prompts" ADD COLUMN "titleZh" TEXT;
ALTER TABLE "prompts" ADD COLUMN "titleEn" TEXT;
ALTER TABLE "prompts" ADD COLUMN "descriptionZh" TEXT;
ALTER TABLE "prompts" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "prompts" ADD COLUMN "contentZh" TEXT;
ALTER TABLE "prompts" ADD COLUMN "contentEn" TEXT;
