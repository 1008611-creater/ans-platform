---
name: models-vision-routing
summary: 给 WorkBuddy/CodeBuddy 自定义模型配置补视觉能力——为纯文本模型配置 relatedModels.vision，让图片任务自动路由到视觉底座，避免 image_url 报错。
description: |
  当用户提到"自定义模型遇到图片报错""纯文本模型不支持 image_url""给模型补视觉能力"
  "relatedModels.vision" "models.json 视觉路由" 时使用。
  解决的问题：WorkBuddy/CodeBuddy 的自定义模型若 lacks supportsImages:true，遇到图片输入会直接报错；
  通过 relatedModels.vision 字段把图片任务路由到已支持视觉的模型。
---

# 自定义模型补视觉能力（relatedModels.vision）

## 问题
WorkBuddy / CodeBuddy 的自定义模型（`models.json` 中的条目），若没有 `"supportsImages": true`，
遇到图片输入会报错——因为该模型本身不支持 `image_url` 消息。

## 官方解决方案
`models.json` 的 `relatedModels.vision` 字段：给纯文本模型指定一个**视觉模型**，
WorkBuddy 遇到图片时自动把视觉任务路由过去，纯文本对话不受影响。

## 配置文件位置
- `%USERPROFILE%\.workbuddy\models.json`
- `%USERPROFILE%\.codebuddy\models.json`

两份可能不一致，务必**两份都检查、都改**，最后核对一致性。

## 操作步骤

### 1. 找纯文本模型
找出所有**没有** `"supportsImages": true` 的模型。

### 2. 确认视觉底座存在
配置里必须有一个 `"supportsImages": true` 的模型作为视觉底座，例如 `qwen3.8-max`、`glm-5.2` 等。
选一个**长期在线、确认支持视觉**的，作为路由目标（推荐 tokenrhythm 的 `qwen3.8-max`）。

### 3. 加 `relatedModels.vision`
对每个纯文本模型追加：
```json
"relatedModels": { "vision": "qwen3.8-max" }
```
`vision` 的值 = 视觉模型的 `id`（必须真实存在于同文件，否则路由悬空）。

### 4. 验证
- JSON 合法性 + 无重复 id（id 必须全局唯一）。
- 所有纯文本模型都已配 vision；所有 vision 指向的 id 确实存在。
- 两份文件（.workbuddy / .codebuddy）同 id 的 supportsImages 与 relatedModels 一致。
- 向视觉底座发图片请求确认真能看图：
```bash
IMG=$(base64 -w0 your.png)
curl https://<视觉模型url>/v1/chat/completions \
  -H "Authorization: Bearer <视觉模型apiKey>" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"<视觉模型id>\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"描述这张图\"},{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64,$IMG\"}}]}],\"max_tokens\":512}"
```
返回 200 且含 `image_tokens` 即成功。

## 注意事项
- `models.json` 热重载（约 1 秒），无需重启客户端。
- `relatedModels.vision` 仅路由图片任务，不影响纯文本模型正常对话。
- 部分模型有思考模式，测试时 `max_tokens` 至少 512，否则输出可能被思考 token 占满。
- **改前备份**：`cp models.json models.json.bak-YYYYMMDD`。
- 测试图不要用 1×1 透明 PNG——上游常报「image format illegal」。用 ≥16×16 的实色 PNG（node 现造即可）。
- 跨文件一致性最易漏：同一模型在两份里 supportsImages 必须一致，否则一边能看图一边报错。

## 关键坑：前端 supportsImages 拦截会绕过 relatedModels 路由
- **现象**：模型已配 `relatedModels.vision`，但软件仍弹"该模型不支持图片 / 不支持 image_url"。
- **根因**：WorkBuddy/CodeBuddy 前端在发请求**前**就按 `supportsImages:false` 拦掉图片输入，
  `relatedModels.vision` 的路由逻辑根本没机会执行。也就是说，纯靠 relatedModels 无法突破前端拦截。
- **判别方法（关键，别只看状态码）**：直接向该模型的渠道 URL 发一张正常 PNG（≥16×16 实色），
  必须确认响应**含 `image_tokens` 或 `content` 真正作答**才算支持图。
  ⚠️ 陷阱：有的上游对带图的请求返回 HTTP 200 但 `content` 为空、只有 `reasoning_content`，
  那是"把图当纯文本 prompt 在推理"的**假成功**，并非真正读图；真不支持图时会返回
  `400001 / "Model do not support image input"`。务必按 400 或真读图结果判定。
- **最稳修法（两种情况）**：
  1. 实测渠道**确实支持图**（响应真读图）→ 直接把该模型 `"supportsImages": false` 改成 `true`，前端不拦截、图直发渠道。
  2. 实测渠道**不支持图**（返回 400001）→ **绝对不能**把 supportsImages 置 true（否则请求出 400 被上游拒）。
     应保留 `supportsImages: false` + `relatedModels.vision` 指向一个真正支持图的底座（底座自身 supportsImages 必须 true）。
     但前端在 supportsImages=false 时会先拦、路由是否触发取决于客户端版本——**此处存在不确定**，需实测：
     若客户端版本不触发路由，则只能让用户发图时直接选视觉底座模型，或给该渠道另加一个支持图的模型 id。
- 结论：先判渠道是否真支持图（看 400 / image_tokens，别只看 200）；支持才置 true，不支持就靠路由或改用底座。

## 已落地的路由（tr4 激活期）
- 视觉底座：`qwen3.8-max`（tokenrhythm）
- 已配 vision 路由的纯文本模型：`codex-auto-review`、`deepseek-v4-flash`、`glm-5.2`(tokenrhythm)、`grok-4.5`、`grok-4.6`、`gpt-5.6-luna`
