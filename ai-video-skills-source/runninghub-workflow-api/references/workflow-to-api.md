# 工作流到 API 发布契约

## 两类修改

| 修改 | 是否需要新工作流 ID |
| --- | --- |
| 覆盖已有节点的图片、音频、提示词、尺寸、采样或输出字段 | 否；在该 workflow 的 `api_format` JSON 中确认它是标量 `inputs` 字段 |
| 增加/删除节点、改变连线、增加参考图路数、合并参考类型或替换模型 | 是；复制、保存并发布新工作流 |

## 发布记录最小字段

只保存可以复用的公开技术契约：`workflow_id`、名称、`api_format` 文件路径、endpoint、字段列表、字段来源（`api_format` 或 `api_page`）、结算模式、最小 dry-run 命令、首个真实任务的验证结果。不得保存 API Key、Cookie、余额、临时文件 URL 或聊天素材。

发布后的通道登记在 `published-workflow-registry.json`，并同时进入实际消费该通道的领域 Skill 注册表。排序优先级为 `runtime_verified`、`api_page`、`api_format`；`api_format` 可构造字段映射，但只有已确认发布入口的 `api_page` 或真实运行的 `runtime_verified` 可以作为真实调用候选，只有 `runtime_verified` 能作为同能力的默认首选。

## 合格 API 契约

```json
{
  "channel": "custom-video-reference",
  "endpoint": "/openapi/v2/run/workflow/<workflow_id>",
  "inputs": [
    {"nodeId":"4","fieldName":"image","fieldType":"IMAGE","evidence":"api_page"},
    {"nodeId":"7","fieldName":"prompt","fieldType":"STRING","evidence":"api_page"}
  ],
  "billing_contract": {"mode":"rh_coins_only"}
}
```

RunningHub 的 `api_format` 导出文件中，顶层键是 `nodeId`，该节点 `inputs` 的键是 `fieldName`；非数组值可作为 `fieldValue`，数组代表连线且不覆写。它证明字段映射，但不证明已发布入口、参数限制或运行结果；后者仍需 API 页面或一次授权的真实任务验证。官方依据见 [official-node-info-list.md](official-node-info-list.md)。

## H3 多图扩容

MiniMax H3 Ref2VA 的多图工作流使用串接的 `RHMiniMaxH3Ref2VAImageReference` 节点。追加一张图需要一个新 `LoadImage` 节点、一个新参考节点，并把新参考节点输出接到原参考链的末端。运行 `scripts/append_h3_image_references.py` 会生成不覆盖原文件的导入副本；导入后把每个新 `LoadImage.image` 节点加入 API 页面契约，才可以把它接入调用器。
