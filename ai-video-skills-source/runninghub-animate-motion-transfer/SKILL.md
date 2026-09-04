---
name: runninghub-animate-motion-transfer
description: name: runninghub-animate-motion-transfer
---

---
name: runninghub-animate-motion-transfer
description: 用 RunningHub 的 Animate 动作迁移 V9 AI 应用上传本地动作视频和参考图片，以 default、plus 或 ultra 实例生成动作迁移视频，并回读下载结果与 RH 币消耗。用户要求 RunningHub 动作迁移、儿童服装动态展示、参考视频驱动、网页上传或将此应用自动化时使用。
---

# RunningHub Animate 动作迁移

## 冠军入口

先应用 [`runninghub-workflow-api`](../runninghub-workflow-api/SKILL.md) 的上传、消费级 Key、幂等、RH 币结算和网站回传规则；本 Skill 只补充 Animate V9 的应用契约和实例故障处理。

使用本 Skill 完成“参考视频驱动参考图片”的动作迁移。默认保留 V9 的自动尺寸和 720P 参数；只有用户指定时才改姿势、运镜、分辨率或帧率。

## 执行路径

1. 图片出现时，先执行 `deepseek-vision`；在内置浏览器打开 `https://www.runninghub.cn/ai-detail/1975951975441412098`，用文件选择器上传动作视频和参考图片，确认两个预览均已更新。
2. 不要点击普通页面的 `plus` 标签来切换实例：它是运行按钮的一部分，会直接创建 `plus` 任务。需要 `ultra` 时用本 Skill 脚本的 `--instance-type ultra` 显式提交。
3. 先调用 `GET /api/webapp/apiCallDemo` 读取当前应用的真实默认参数，再把上传接口返回的 `fileName` 写入 `275.video` 和 `299.image`，提交 `POST /task/openapi/ai-app/run`。
4. 用 `POST /openapi/v2/query` 查询至 `SUCCESS` 或 `FAILED`，读取 `usage.consumeCoins`、`usage.consumeMoney`，并在结果 URL 的 24 小时有效期内下载。

## 直接调用

先设置凭据；不得把真实 Key 写入脚本、Skill、日志提交或用户回复。

```powershell
$env:RUNNINGHUB_API_KEY = '<运行时注入>'
C:\Users\lsb\anaconda3\python.exe C:\Users\lsb\.codex\skills\runninghub-animate-motion-transfer\scripts\run_animate_motion_transfer.py `
  --video 'C:\path\motion.mp4' `
  --image 'C:\path\reference.png' `
  --instance-type ultra --set '293.select=2' --wait --download-dir 'C:\path\outputs'
```

先用 `--dry-run` 验证文件和参数；它不会上传或扣费。已提交的任务可用 `--task-id <id> --wait` 恢复查询和下载。

使用 `--set '<nodeId>.<fieldName>=<value>'` 覆盖 API 页面已暴露参数，例如 `--set '264.value=24'` 调低帧率。视频和图片节点始终由 `--video` 与 `--image` 写入，不能用 `--set` 覆盖。

## 已验证的 V9 契约

- `webappId`: `1975951975441412098`
- AI 应用提交：`/task/openapi/ai-app/run`
- 动作视频：`275.video`
- 参考图片：`299.image`
- 实例字段：`instanceType`，可选 `default`、`plus`、`ultra`

这与旧的 `/openapi/v2/run/workflow/2001253005766914050` 不同；该旧端点会对 V9 返回 `NODE_INFO_MISMATCH`，不得重试。详见 [references/api-contract.md](references/api-contract.md)。

## 已验证的服务端故障

如果查询返回 `805`，且 `failedReason.node_name` 是 `PoseAndFaceDetection`、节点为 `235` 或 `249`，并含 CUDNN/ONNX 运行时异常，则是 RunningHub 当前 Ultra 工作节点故障：任务在运行时长 `0` 时失败且没有 RH 币消耗。不要对同一素材重复提交；切换姿势路径只会把故障在 `235` 和 `249` 之间移动。保留任务 ID 和失败回执，等待平台修复或由用户改选其他应用/实例。

用户明确授权改用 `plus` 时，按同一素材和默认参数重新提交一次。已验证的 V9 Plus 任务在 2026-08-11 成功生成 720×1280、8.83 秒的含音频 MP4，运行 1186 秒、消耗 475 RH；实际费用仍以当次 `usage.consumeCoins` 为准。

## 交付

报告任务 ID、最终状态、实际实例类型、`consumeCoins` 与 `consumeMoney`，并交付已下载的本地视频路径。未完成或失败时，只报告返回的错误和可恢复的任务 ID；不要盲目重新提交。
