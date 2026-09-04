# Animate 动作迁移 V9 API 契约

- 应用页：`https://www.runninghub.cn/ai-detail/1975951975441412098`
- 参数示例：`GET /api/webapp/apiCallDemo?apiKey=<key>&webappId=1975951975441412098`，Header 为 `Authorization: Bearer <key>`。
- 上传：`POST /openapi/v2/media/upload/binary`，使用返回的 `data.fileName`。
- 提交：`POST /task/openapi/ai-app/run`，Body 包含 `webappId`、`apiKey`、`instanceType` 和完整 `nodeInfoList`。
- 查询：`POST /openapi/v2/query`，Header 为 Bearer Key，Body 为 `{"taskId":"..."}`。

V9 默认参数由参数示例接口返回。可变素材字段固定为 `275.video` 和 `299.image`；提交时保持其他节点默认值，除非用户明确调整。结果 URL 约 24 小时失效；上传素材资源约 1 天失效。

“仅扣 RH 币”验收：`usage.consumeCoins > 0` 且 `usage.consumeMoney` 为空或 `0`。`instanceType=ultra` 是 84G 显存实例，不是独立模型质量开关。

2026-08-11 实测：V9 在 Ultra 下的 `PoseAndFaceDetection` 节点 `235` 与 `249` 均可返回 `805`、ONNX/CUDNN 运行时错误，三次提交均为 `taskCostTime=0`、`consumeCoins=null`。这是 Provider 故障，不是素材或 `nodeInfoList` 错误；停止重复提交。

同日以同一素材、默认节点参数和 `instanceType=plus` 提交，任务成功：`taskCostTime=1186`、`consumeCoins=475`、输出节点 `285` 为 720×1280、8.83 秒的 MP4（含音频）。
