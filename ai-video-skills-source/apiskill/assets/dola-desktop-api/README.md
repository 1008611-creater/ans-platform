# Dola Desktop API

把用户已登录的国际豆包桌面客户端封装为带鉴权的异步视频任务接口。服务只运行在持有客户端的本机上；它不会保存账号、密码、Cookie 或上游链接。

## 已实现

- `POST /v1/jobs` 接收提示词及图片、音频、视频素材。
- `account_slot` 从 1 开始选择本机国际豆包账号；接口不接收、保存或返回账号名称与登录资料。
- `aspect_ratio` 仅接受 `16:9`、`9:16`、`1:1`、`4:3`、`3:4`，并作为强制约束写入供应商提示词。
- 每次提交前强制关闭 Seedance 2.0 的 15 秒模式，并启用 Seedance 2.5 的 30 秒模式。
- 图片、视频、音频通过 Dola 的联合素材输入框一次上传，分别限制为 30、10、10 个文件。
- `X-API-Key` 保护所有任务接口，`Idempotency-Key` 防止重复建单。
- 默认 `submit=false`，只完成素材落盘和任务准备。
- 真实提交必须同时发送 `submit=true` 和 `X-Generation-Authorization: submit`。
- FastAPI 提供接口；Celery/Redis 执行长任务；PostgreSQL 记录状态；完成视频下载到任务私有目录并经鉴权路由下载。
- Node + Playwright 仅通过本地 Chromium 调试端口连接桌面客户端的已登录页面。

## 启动

```powershell
Copy-Item .env.example .env
# 编辑 .env：设置强随机 DOLA_API_KEYS，并保持本机数据库与 Redis 地址。
.\scripts\run-local.ps1
```

服务地址为 `http://127.0.0.1:8090`，接口文档为 `http://127.0.0.1:8090/docs`。

## 桌面客户端连接

国际豆包必须开启 Chromium 调试端口；未开启时桥接器会安全返回 `DOLA_CDP_UNAVAILABLE`，不会点击、上传或生成。

要启用真实提交，请先退出普通客户端实例，再由你手动以 `--remote-debugging-port=9222` 启动同一客户端，并将 `.env` 中的 `DOLA_CDP_ENDPOINT` 保持为 `http://127.0.0.1:9222`。首次连接后，用一笔已获授权的测试任务校准 `worker/dola-cdp-worker.mjs` 的页面选择器；不同客户端版本的按钮和素材控件可能变化。

## 调用示例

仅准备任务，不会提交上游：

```powershell
curl.exe -X POST http://127.0.0.1:8090/v1/jobs `
  -H "X-API-Key: <your-key>" `
  -H "Idempotency-Key: demo-001" `
  -F "prompt=雨夜街头，一位女子撑伞回头" `
  -F "account_slot=1" `
  -F "aspect_ratio=9:16" `
  -F "image=@C:\\assets\\reference.png" `
  -F "submit=false"
```

获得一次上游生成授权后，再发送：

```powershell
curl.exe -X POST http://127.0.0.1:8090/v1/jobs `
  -H "X-API-Key: <your-key>" `
  -H "X-Generation-Authorization: submit" `
  -H "Idempotency-Key: production-001" `
  -F "prompt=..." `
  -F "account_slot=2" `
  -F "aspect_ratio=16:9" `
  -F "video=@C:\\assets\\source.mp4" `
  -F "submit=true"
```

轮询返回的 `status_url`；成功后 `output_url` 是本服务的受鉴权下载地址，而不是上游临时链接。
