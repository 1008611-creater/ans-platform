-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "recipePrompt" TEXT,
ADD COLUMN     "recipeTool" VARCHAR(40),
ADD COLUMN     "recipeUrl" VARCHAR(500);
