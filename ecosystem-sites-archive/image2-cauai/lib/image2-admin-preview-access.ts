export type Image2AdminPreviewAccess = {
  allowed: boolean;
  mode: "local-dry-run" | "blocked";
  reason: string;
};

/**
 * The admin candidate is deliberately unavailable in production. It needs an
 * explicit local review flag and never reads authenticated administrator data.
 */
export function getImage2AdminPreviewAccess(): Image2AdminPreviewAccess {
  const previewRequested = process.env.IMAGE2_ADMIN_PREVIEW === "local-dry-run";
  const isLocalDevelopmentPreview = process.env.NODE_ENV !== "production" && previewRequested;
  const isLocalProductionBuildReview =
    process.env.IMAGE2_ADMIN_PREVIEW_BUILD_TEST === "true" && previewRequested && process.env.VERCEL !== "1";

  if (isLocalDevelopmentPreview || isLocalProductionBuildReview) {
    return {
      allowed: true,
      mode: "local-dry-run",
      reason: "本地 dry-run 已启用；页面只读取案例静态索引，不连接生产管理接口。"
    };
  }

  return {
    allowed: false,
    mode: "blocked",
    reason: "此候选后台默认关闭。仅允许在非生产环境显式设置 IMAGE2_ADMIN_PREVIEW=local-dry-run 后审查。"
  };
}
