---
name: deepseek-vision
description: name: deepseek-vision
---

---
name: deepseek-vision
description: Use whenever the task contains an attached image, pasted screenshot, local image path, or network image URL and image understanding is needed. This is the mandatory global image-understanding route: call deepseek-vision before OCR, Read, file metadata, or any other local image processing.
---

# deepseek-vision 全局识图

本 Skill 是 Codex 的全局强制识图入口。任何任务出现图片时，必须先调用本 Skill，禁止先用 OCR、Read、文件信息检查或其他本地图像处理代替。

## 强制触发条件

出现以下任一情况，必须先调用 `deepseek-vision`：

- 用户消息带附件（例如 Codex 的 `Saved attachments:` 图片列表）
- 用户粘贴截图
- 用户给出本地图片路径（jpg、jpeg、png、gif、webp、bmp）
- 用户给出网络图片 URL
- 用户要求看图、描述图片、识别截图内容、分析 UI、读取图中文字、检查设计稿或解读图片中的代码/报错

## 禁止替代

- 图片出现后，不得先用 OCR、Read、文件信息检查、base64 解码或其他本地图像处理代替识图
- 只有 `deepseek-vision` 调用失败后，才允许 OCR 作为补充诊断；必须在回复中报告识图失败原因
- 不得因为当前模型"看起来没有视觉能力"而跳过本 Skill；这正是本 Skill 存在的目的

## 调用方式

脚本路径：

```text
C:\Users\lsb\.codex\skills\deepseek-vision\scripts\vision.js
```

本地图片：

```powershell
node "C:\Users\lsb\.codex\skills\deepseek-vision\scripts\vision.js" "<图片绝对路径>" "请用中文详细描述这张图片的内容"
```

网络图片 URL：

```powershell
node "C:\Users\lsb\.codex\skills\deepseek-vision\scripts\vision.js" --url "<图片URL>" "请用中文详细描述这张图片的内容"
```

多张图片时，按顺序逐张调用，全部拿到结果后再回复。可以针对图片提问，例如：

```powershell
node "C:\Users\lsb\.codex\skills\deepseek-vision\scripts\vision.js" "<图片路径>" "请读出图中的文字并说明界面结构"
```

## 粘贴图片桥接

Codex 界面允许粘贴图片，是因为模型目录声明了图片输入能力。图片不会直接发给当前模型，而是先进入本地桥接代理 `127.0.0.1:58271`：

- 代理把 `input_image` 内容替换为图片路径和强制识图指令
- 上游 DeepSeek 只收到纯文本请求，不会再返回 `does not support image input`
- Agent 看到桥接指令后，仍必须先调用本 Skill 的 `vision.js` 识图

桥接代理文件：

```text
C:\Users\lsb\.codex\skills\deepseek-vision\scripts\image-bridge-proxy.js
```

代理已加入用户登录自启动；若未监听，可手动运行：

```powershell
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\Users\lsb\.codex\skills\deepseek-vision\scripts\start-image-bridge-proxy.ps1"
```

## 模型与接口

- 视觉模型固定为 `qwen3.5-omni-plus`
- 国内默认节点固定为阿里云百炼 OpenAI 兼容接口：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 默认关闭流式输出；请求体使用 OpenAI 兼容的 `messages` 图片消息格式
- 不要在没有用户明确要求时改模型名、改接口地址或绕过本 Skill 的调用路径

## 密钥配置

脚本按以下顺序读取密钥：

1. 环境变量 `DASHSCOPE_API_KEY`
2. 密钥文件 `C:\Users\lsb\.codex\secrets\deepseek-vision.env`，格式为 `DASHSCOPE_API_KEY=sk-...`

密钥缺失时，提示用户把 `qwen3.5-omni-plus` 的密钥发进聊天框，等待用户确认后再继续配置；不得用 OCR 或本地图像处理替代识图。

## 验证

配置或改动后，至少执行一次：

```powershell
node --check "C:\Users\lsb\.codex\skills\deepseek-vision\scripts\vision.js"
```

再用一张真实图片调用并核对返回内容；HTTP 200 或文件存在不能替代真实调用结果。
