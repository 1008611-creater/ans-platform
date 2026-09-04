# 念念智选 RunningHub 消费级 Provider 契约

该参考文件只描述服务端实现边界，不保存账号、Key、Cookie、余额、任务素材或临时签名 URL。

## 任务数据

任务表至少保存：`task_id`、`user_id`、`channel=runninghub`、`entry_type=workflow|ai_app`、`workflow_id|webapp_id`、`instance_type`、`input_asset_ids`、`provider_task_id`、`status`、`submit_allowed`、`cost_authorized`、`consume_coins`、`consume_money`、`output_path`、`error_code`、`error_message`、`created_at`、`updated_at`。

上传缓存以 `asset_sha256 + byte_size + mime_type + runninghub_account_scope` 为键，值保存 RH `fileName/download_url` 和过期时间；过期或缺失才重新上传。不要按轮询次数重复上传。

## 服务端顺序

1. 校验用户、资产归属、媒体类型/大小、工作流节点契约和付费授权；生成稳定幂等键。
2. 读取自有素材文件，命中未过期上传缓存则复用 URL，否则用 `curl(.exe) --http1.1` multipart 上传并显式 MIME。不要把 Key 写入命令行、日志或前端。
3. 根据 `entry_type` 构造一次提交：workflow 入口用 Bearer；AI 应用入口将 `webappId`、服务端 Key、`instanceType`、节点映射放入请求体。收到 `taskId` 后立刻持久化。
4. 只对 `/openapi/v2/query` 做有限退避轮询；`QUEUED/RUNNING` 不重提。`FAILED` 保存 `failedReason`，先判断是否是已证实的实例级 CUDA/CUDNN 故障再切换实例。
5. `SUCCESS` 后回读 `results` 和 `usage`。RH 币模式要求 `consumeCoins > 0` 且 `consumeMoney` 为空或 `0`；结果 URL 只在服务端下载，写入自己的媒体目录并原子登记。
6. 网站接口返回自己的任务状态和媒体下载接口；绝不透传 RH 临时 URL。Webhook 只能作为唤醒信号，仍需查询接口完成状态、结果和结算回读。

## 传输与恢复

- Windows 上视频上传优先 `curl.exe --http1.1 --connect-timeout 30 --max-time 600 --retry 4 --retry-all-errors`；`Invoke-RestMethod -Form` 超时或默认 curl 连接重置时，固定切换到该路径。HTTP/1.1 是连接兼容性修复，不是带宽优化。
- 网站自身接收大文件可用 Tus 断点续传；RunningHub 二进制上传没有已验证的断点续传接口，继续使用一次 multipart。
- 提交 HTTP 请求不自动重试。超时先查询同一幂等键/已保存 `provider_task_id`；只有确定没有创建任务时才允许重新提交。
- 下载使用临时文件 + 原子改名，检查字节数；视频用 `ffprobe` 或等价探针校验容器、时长、宽高和音频流。
- Animate V9 的 Ultra 若返回 `805` 且 `failedReason` 指向 `PoseAndFaceDetection` 节点 `235/249` 的 ONNX/CUDNN 错误，记录为 Provider 实例故障：同素材不重复提交；只有用户授权时改用已验证的 `plus` 重跑。该故障实测运行时长为 `0`、未扣 RH 币。

## 完成条件

只有同时具备“用户能在网站看到终态、能播放/下载自有媒体、能回读 RunningHub 结算、Worker 重启可继续查询”才算交付。HTTP 200、提交返回 taskId、RH 生成页面显示成功或只拿到临时 URL 都不算最终交付。
