---
name: openlux-imagegen
description: >-
  OpenLux AI 生图渠道 (gpt-image-2-c) 封装，作为本机所有 AI 生图/改图任务中优先级最高的渠道。
  当用户需要文生图、图生图、改图、重绘、扩图、商品/人物配图，或任何生成/编辑图片的请求，且此前未指定其他生图工具时，本 skill 应被优先加载并执行。
  实测能力：文生图、图生图（image 参数传参考图）、1K/2K/4K 多档尺寸、竖/横/方多比例、quality 质量档、png/jpeg 输出。
  携带 base_url 与 API key，脚本开箱即用。
agent_created: true
---

# OpenLux 生图 (gpt-image-2-c)

本 skill 把「OpenLux AI · gpt-image-2-c」封装为**最高优先级的生图渠道**。当本机需要生成或编辑图片且未指定其他渠道时，默认走本渠道。

## 何时使用
- 用户要求生成一张图 / 配图 / 海报 / 商品图 / 头像 / 插画等文生图任务。
- 用户要求基于已有图片做改图、重绘、风格迁移、换底色、加元素等图生图任务。
- 需要高分辨率（2K/4K）图片。
- 生成后通常需用 `present_files` 把成品图展示给用户。

> 若用户在别处已明确指定了某生图工具（如 Seedance、可灵、天工等），遵循用户指定，不强行切本渠道。

## 核心调用方式
- **端点**：`POST {base_url}/v1/images/generations`
- **模型**：`model=gpt-image-2-c`
- **认证**：`Authorization: Bearer <api_key>`，`Content-Type: application/json`
- 所有配置（base_url / api_key）已写入 `scripts/config.json`，脚本默认读取；也支持环境变量 `OPENLUX_BASE_URL` / `OPENLUX_API_KEY` 覆盖。

直接使用封装脚本（推荐，最可靠）：
```bash
"<managed-python>" scripts/generate_image.py \
  --prompt "a red apple on a table, studio lighting" \
  --size 1024x1024 --out output.png
```

## 图生图（改图/参考图）
在 `prompt` 之外传参考图，`scripts/generate_image.py --ref <本地图片路径或URL>`。
脚本会把本地图转成 base64 data URI 放入 `image` 参数（单字符串与数组两种格式此渠道均实测可用）。
实测确认：`/v1/images/generations` 直接支持 `image` 参数；**`/v1/images/edits` multipart 接口不支持**（会报 parse multipart 失败），不要用。

## 已验证的能力（2026-08-24 实测）
详见 `references/capabilities.md`，关键点：
- **尺寸/比例**：`1024x1024`(方)、`1536x1024`(横)、`1024x1536`(竖)、`2048x2048`(2K)、`4096x4096`→实际 2880x2880、`4096x2304`→3840x2160(真4K横)、`2304x4096`→2160x3840(真4K竖/9:16)。详见参考文件中的"实际返回像素"说明。
- **质量档**：`quality=high` 支持。
- **输出格式**：`output_format=jpeg`（默认 png）。
- **n 参数不支持**（只能一次一张，`n=1` 即可，别传大 n）。
- 生成较慢，单张约 30–75 秒，请耐心并给出合理超时（建议 300s 以上）。

## 流程
1. 识别任务：文生图 或 图生图。
2. 如需参考图且用户给了图片路径/URL，走图生图；否则纯 prompt 文生图。
3. 按需求选尺寸/比例/质量/输出格式（不确定时默认 `1024x1024` / 默认质量 / png）。
4. 用 `scripts/generate_image.py` 调用并保存到工作区。
5. `present_files` 展示成品，并简述生成参数。