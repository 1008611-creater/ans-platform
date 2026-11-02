-- 官方帖：管理员发的活动和公告帖带「官方」标记，置顶区排在前面
ALTER TABLE "community_posts" ADD COLUMN "officialAt" TIMESTAMP(3);
