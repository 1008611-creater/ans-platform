# RunningHub `nodeInfoList` 官方依据

权威来源：<https://www.runninghub.cn/runninghub-api-doc-cn/doc-8287336>，页面标题“关于 nodeInfoList”，读取日期 2026-08-17。

## 可执行规则

1. 从 RunningHub 的“导出工作流 API”取得 `api_format` JSON。
2. 顶层节点键是 `nodeId`；节点 `inputs` 对象中的键是 `fieldName`；标量输入值可作为 `fieldValue` 覆写。
3. `fieldValue` 为数组通常表示节点连线，不能作为参数覆写。
4. 上传文件后，将响应中的 `fileName` 传给 `LoadImage.image` 等加载节点；不要把临时下载地址作为网站资产。
5. API 调用会重置随机种子。需要复现时，必须把对应 `seed` 放进 `nodeInfoList`。
6. 导出图中不存在的字段可能是纯前端逻辑，不能作为 API 参数；发布状态、workflow ID、endpoint、限制和运行结果仍分别以 API 页面与真实回执验证。
