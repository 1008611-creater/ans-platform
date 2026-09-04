# Image2 渠道合同

## 文生图已验证请求

```text
intent: generate
channel: yunwu
endpoint: https://yunwu.ai/v1/images/generations
model: gpt-image-2-c
required JSON: model, prompt, n=1, size
prompt: 已通过上游资产冠军审计的提示词文件
```

认证只能由 Agent Vault 的 `yunwu-image` 服务在 `yunwu.ai/v1/*` 范围内注入。不得读取、打印、复制、写入或传输密钥、代理令牌、Cookie 或原始渠道响应。

## 已验证边界

- 真实提交已经返回可解码的 `2160x3840` PNG，因此该渠道可承担单张竖版4K文生图。
- 文生图只发送 `model`、`prompt`、`n` 和 `size`，当前模型为 `gpt-image-2-c`。不添加未经验证的字段。
- 云雾图改图已由受保护的单次提交验证：同一共享账户应使用 `gpt-image-2-c`，返回可解码的 `3840x2160` PNG。文档列出的模型名不能覆盖账户实际回执。
- 合同可用不代表候选图可用。必须再验证可读文件、精确尺寸、无随机文字、角色锚点和项目视觉门。

## 图改图已验证合同

```text
intent: edit
channel: yunwu
endpoint: https://yunwu.ai/v1/images/edits
model: gpt-image-2-c
required multipart: image, prompt, model, n=1, size
reference_image_count: 1..16
reference_image_max_size: 50MB each
supported_4k_horizontal: 3840x2160
```

- 图改图仅引用已确认的角色母图；每张参考图在回执中只记录数量和哈希，不记录密钥或原始渠道响应。
- 图改图请求尺寸必须满足最大边长不超过3840、宽高均为16的倍数、比例不超过3:1、总像素介于655360和8294400之间。
- 除官方文档明确列出的图改图字段外，不添加未验证字段；当文档模型与账户分组不一致时，先选择账户已验证模型、运行不计费预检，再以新候选编号提交一次。

## 失败分类

- `blocked_agent_vault_session`：受保护会话未启动；只修复会话，不改提示词、不重复提交。
- `candidate_dimension_mismatch`：图片可读但尺寸不符；不可作为正式资产。
- `rejected_quality`：尺寸达标但角色、文字、材质、主体或连续性不合格；只修最早失败变量。
- `uncertain_no_retry`：超时、断线或响应不确定；保留非敏感回执，禁止自动重试。

## 4K 验收

1. 用图像解析器回读真实宽高和可解码格式，不能以请求参数代替。
2. 人物资产检查一张脸、无文字/水印、无镜面第二脸和身份锚点可辨。
3. 失败项写入唯一 `asset_manifest` 或项目状态；候选图不得升级为已确认资产。

## 失败分类

- `blocked_auth_or_endpoint`：认证失败、端点不存在或图片能力未开放；先修复配置/权限，不换提示词重试。
- `candidate_lowres`：文件可用但实际尺寸低于请求；可供审美方向参考，不可进入正式资产。
- `rejected_quality`：尺寸达标但脸、手、服装、文字、材质、主体数量或连续性不合格；只修最早失败变量。
- `uncertain_no_retry`：超时、断线、响应不确定；保留回执，禁止自动重试，先核对供应商任务状态。

## 4K 验收

1. 使用图像解析器回读真实宽高，不能以请求参数或 HTTP 200（请求成功）代替。
2. 验证文件可解码、格式、文件哈希和精确路径。
3. 角色身份图验证一张脸、无文字/水印、无镜面第二脸、身份锚点可辨；身体三视图验证正面无脸、侧面不重复展示脸、背面保留发型。
4. 将失败项登记到唯一 `asset_manifest`（资产清单）或项目状态，不把渠道预览升级为确认资产。
