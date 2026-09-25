-- 把旧的「提示词收藏夹」(collections) 合并进统一收藏表 (content_favorites)。
--
-- 背景：ANS 重构后 Prompt / 模板 / 工作流共用一张收藏表，旧的 collections
-- 只支持提示词，而且会让详情页同时出现两个收藏按钮。这里先把历史数据搬过来，
-- 保证老用户的收藏不丢；collections 表暂不删除，留作回滚与历史核对。
--
-- 幂等：重复执行不会产生重复行（依赖 userId+targetType+targetId 唯一约束）。

INSERT INTO "content_favorites" ("id", "userId", "targetType", "targetId", "createdAt")
SELECT
  'fav_migrated_' || md5(c."userId" || ':' || c."promptId"),
  c."userId",
  'PROMPT'::"FavoriteTargetType",
  c."promptId",
  c."createdAt"
FROM "collections" c
ON CONFLICT ("userId", "targetType", "targetId") DO NOTHING;
