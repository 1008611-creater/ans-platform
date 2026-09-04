# 状态管理

每次 COMMIT 按以下顺序处理：

1. 更新 `canon.json.project_progress.current_chapter`。
2. 更新受影响的角色、关系、知识、物件、证据、时间线、资金和情绪字段。
3. 向 `events.jsonl` 追加一行 JSON：`event_id`、`chapter`、`at`、`kind`、`before`、`after`、`evidence`、`impact`。
4. 重新运行校验；P0/P1 不得写入 COMMIT。

不要从章节正文反推并覆盖已提交状态。状态不全时先修状态，再续写。

