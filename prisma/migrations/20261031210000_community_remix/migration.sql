-- 做同款：社区帖子可以附一个项目广场项目
ALTER TABLE "community_posts" ADD COLUMN "catalogSlug" VARCHAR(80);

CREATE INDEX "community_posts_catalogSlug_createdAt_idx" ON "community_posts"("catalogSlug", "createdAt");
