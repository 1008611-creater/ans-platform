import { z } from "zod";

/** 统一收藏目标类型：Prompt / 模板 / 工作流共用一套契约。 */
export const favoriteTargetTypeSchema = z.enum(["PROMPT", "TEMPLATE", "WORKFLOW"]);

export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;

export const FAVORITE_TARGET_TYPES = favoriteTargetTypeSchema.options;

export const favoriteTargetLabels: Record<FavoriteTargetType, string> = {
  PROMPT: "提示词",
  TEMPLATE: "模板",
  WORKFLOW: "工作流",
};
