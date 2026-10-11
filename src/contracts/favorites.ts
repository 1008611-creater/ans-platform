import { z } from "zod";

/** Unified favorite targets used by the ANS content library. */
export const favoriteTargetTypeSchema = z.enum(["PROMPT", "TEMPLATE", "WORKFLOW", "VIBEHUB_TERM"]);

export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;

export const FAVORITE_TARGET_TYPES = favoriteTargetTypeSchema.options;

export const favoriteTargetLabels: Record<FavoriteTargetType, string> = {
  PROMPT: "提示词",
  TEMPLATE: "模板",
  WORKFLOW: "工作流",
  VIBEHUB_TERM: "VibeHub 术语",
};
