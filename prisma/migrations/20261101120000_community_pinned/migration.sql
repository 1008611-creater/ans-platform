-- 置顶：管理员把官方挑战帖放到推荐频道最上面
ALTER TABLE "community_posts" ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "community_posts_pinnedAt_idx" ON "community_posts"("pinnedAt");
