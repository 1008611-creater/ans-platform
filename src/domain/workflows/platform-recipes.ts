import { RESUME_WORKFLOW_DEFINITION } from "@/domain/workflows/recipes";

/** Reviewed fixed code; this is a platform recipe, never a fabricated user submission. */
export const PLATFORM_RESUME_RECIPE = {
  id: "ans-platform-resume-website-v1",
  officialId: "ans-platform-resume-website-v1",
  slug: "ans-portfolio-website",
  catalogRecipeId: "resume-website",
  version: 1,
  definitionHash: "8d09095b6f00ab0e53b4a08c052cd51dff5bad470eee14d53cd992bed0d0d41b",
  // SHA256 of stableWorkflowInput(sourceFiles); source bytes normalize CRLF to LF.
  sourceCodeHash: "5446e9e677cb65a4f8a3983ac042da2b42edc566ea98393ea29a6a6f72db4618",
  sourceFiles: [
    { path: "src/contracts/resume-website.ts", sha256: "3c5c8e0a20a24a64509ff17166f92ef9dc77c8736e415104fc15b9c0574c73b0" },
    { path: "src/domain/projects/resume-website.ts", sha256: "eb7f0a598183f18be95b6cb0954f2c2d0929ac2c08d450a11741ec11c521099a" },
    { path: "src/domain/workflows/recipes.ts", sha256: "0a5d6a2739593e544935719d0f4734a7ffaf177d6e19617abd9cd66ce1a28798" },
  ],
  title: "简历与作品集网站",
  summary: "填写自己的经历和项目信息，由模型整理文案，再用固定代码生成可预览、下载的个人作品集 HTML。",
  description: "平台已准备简历与作品集网站的固定布局和代码。你填写真实的个人资料、技能和项目经历，确认算力费用后运行。模型只整理你提供的文案，不编写网站代码；固定模板生成 HTML，结果保存到个人运行记录，可预览、下载或打印。支持中英文与预置配色。不得输入他人的私密资料。",
  estimatedCost: 2,
  definition: RESUME_WORKFLOW_DEFINITION,
} as const;
export type PlatformRecipe = typeof PLATFORM_RESUME_RECIPE;
export const PLATFORM_RECIPE_REGISTRY: readonly PlatformRecipe[] = [PLATFORM_RESUME_RECIPE];
export function getPlatformRecipe(idOrSlug: string): PlatformRecipe | undefined {
  return PLATFORM_RECIPE_REGISTRY.find(recipe => recipe.id === idOrSlug || recipe.slug === idOrSlug);
}
export function isPlatformRecipeMetadata(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const workflow = value as Record<string, unknown>;
  return PLATFORM_RECIPE_REGISTRY.some(recipe => workflow.isOfficial === true && workflow.officialId === recipe.officialId && workflow.slug === recipe.slug && workflow.status === "PUBLISHED" && workflow.publishedVersion === recipe.version && workflow.title === recipe.title && workflow.summary === recipe.summary && workflow.description === recipe.description && workflow.estimatedCost === recipe.estimatedCost);
}
