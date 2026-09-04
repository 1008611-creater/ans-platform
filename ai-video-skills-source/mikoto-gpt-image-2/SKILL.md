---
name: mikoto-gpt-image-2
description: 通过Mikoto的OpenAI兼容图片接口调用gpt-image-2生成2K或4K图片。用于原创角色母图、场景图、道具图、海报和其他纯文生图资产；当前不声明图生图或图片编辑能力。
---

# Mikoto GPT Image 2

使用 `POST https://api.mikoto.vip/v1/images/generations` 调用 `gpt-image-2`。图片调用与 Codex 对话模型配置分离：对话可使用其他模型，图片请求固定使用 `gpt-image-2`。

## 能力边界

- 只使用用户提供并确认的文生图合同：`prompt`、`size`、`aspect_ratio`、`quality`、`response_format`。
- 默认 `2K + high + b64_json`，直接落盘，避免临时 URL 失效或在日志中打印长 base64。
- 当前没有已验证的参考图、图生图或编辑接口合同。需要保持身份参考的角色设定卡、首帧或改图任务必须阻断，等待该渠道的编辑接口文档；不得把文生图伪装成图生图。
- 不把 `gpt-5.5` 当图片模型，不向图片接口发送 Responses API 参数。

## 凭据

实际调用只从 `OPENAI_API_KEY` 环境变量读取凭据。禁止把 Key 写入 Skill、脚本、Prompt、命令、回执或聊天；禁止打印请求头。用户在聊天中发送过的 Key 视为已暴露，必须由用户在供应商后台吊销并在本机安全配置中写入新 Key。

## 尺寸

| 比例 | 2K | 4K |
|---|---|---|
| 1:1 | `1440x1440` | `2160x2160` |
| 16:9 | `2560x1440` | `3840x2160` |
| 9:16 | `1152x2048` | `2160x3840` |
| 4:3 | `1920x1440` | `2880x2160` |
| 3:4 | `1440x1920` | `2160x2880` |
| 3:2 | `2160x1440` | `3240x2160` |
| 2:3 | `1440x2160` | `2160x3240` |
| 21:9 | `2560x1097` | `3840x1646` |

固定清晰度时始终传具体宽高，不传 `2K`、`4K` 或只传比例。

## 执行

先做不扣费 dry-run：

```powershell
& "C:\Users\lsb\anaconda3\python.exe" "C:\Users\lsb\.codex\skills\mikoto-gpt-image-2\scripts\mikoto_image_generate.py" `
  --prompt-file ".\prompt.txt" --size "2560x1440" --aspect-ratio "16:9" `
  --job-id "job-id" --asset-id "asset-id" --asset-stage "scene" --dry-run
```

用户已授权付费生成且凭据已安全配置后执行：

```powershell
& "C:\Users\lsb\anaconda3\python.exe" "C:\Users\lsb\.codex\skills\mikoto-gpt-image-2\scripts\mikoto_image_generate.py" `
  --prompt-file ".\prompt.txt" --size "2560x1440" --aspect-ratio "16:9" `
  --job-id "job-id" --asset-id "asset-id" --asset-stage "scene" `
  --output-dir ".\outputs" --result-json ".\receipts\scene-result.json"
```

## 生产合同

1. 先把实际提示词、尺寸、质量、模型、`job_id`、`asset_id`、`asset_stage` 和提示词 SHA 写入提交前回执。
2. 请求发出后遇到超时或连接断开时标记 `uncertain_no_retry`，不得自动再提交同步生成请求，以免重复计费。
3. `b64_json` 只在内存中解码到图片文件，不写入 JSON 或控制台；URL 结果立即下载。
4. 只有图片文件可解码、宽高与请求一致、SHA 可回读，并经资产类型视觉 QA 后，才可标为 `accepted`。
5. 回执可记录非敏感错误码和已脱敏错误信息，不保存原始供应商响应或 Authorization 头。

## 路由

- 原创身份母图、场景、道具、无需参考图的静态资产：本 Skill。
- 需要已有图片保持身份/构图的角色设定卡、首帧或改图：当前 `blocked_missing_edit_contract`。
- 有原片证据的转绘项目仍走 `mx-shortdrama-00-router`，不因渠道变化跳过证据与资产生命周期。
