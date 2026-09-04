# 上传三件套完整实操（netdrive MCP 通道）

WorkBuddy 项目资料库（Project Drive）的写入通道 = `mcp__netdrive__tdrive.*` 工具。上传一个文件严格三步，少一步都不算入库。

## 前置：工具装载

先用 `ToolSearch` 装载 MCP 工具 schema（本环境 netdrive 已连接，工具名）：

```
tool_names: ["mcp__netdrive__tdrive.dir_list",
             "mcp__netdrive__tdrive.dir_create",
             "mcp__netdrive__tdrive.file_upload",
             "mcp__netdrive__tdrive.file_upload_complete"]
```

## 第一步 · 申请上传权

```
mcp__netdrive__tdrive.file_upload
  dir_id:     目标目录 id（先 dir_list 拿到）
  file_name:  展示文件名
  file_size:  本地文件字节数（用 stat 拿到，必须准确）
```

返回：预签名 PUT URL（含 object key）+ 确认凭据 confirm_key + task_id。**这是临时凭据，有时效，拿到后尽快 PUT。**

## 第二步 · curl PUT（关键坑：中文路径）

```bash
# 错误示范：-T 传中文绝对路径 → curl 打不开文件
curl -T "E:/codex/.../新剧_安娜/交接文档.md" "https://..."

# 正确做法：先 cd 进目录，-T 用相对文件名
cd "/e/codex/niannianai/zhuanhuiyuangong/新剧_安娜"
curl -sSL -X PUT \
  -H "Authorization: $AUTH" \
  -H "Cache-Control: max-age=31104000" \
  -H "Content-Type: text/markdown" \
  -H "x-cos-acl: default" \
  -H "x-cos-crc32c-flag: cosn" \
  -H "x-cos-security-token: $TOKEN" \
  -H "x-cos-storage-class: INTELLIGENT_TIERING" \
  -T "交接文档_安娜_20260827.md" \
  "https://<预签名URL>"
```

- Content-Type 按类型：`text/markdown`（.md）、`text/html`（.html）、`text/yaml`（.yaml）、`image/png`（.png）
- `$AUTH` 是 Authorization 头的 `q-ak=...&q-signature=...` 整段，`$TOKEN` 是 `x-cos-security-token` 值，都来自 file_upload 返回值
- PUT 成功无回显内容，脚本里显式 `echo "OK: $name"` 确认
- 批量多文件：写 bash 函数 `put()` 封装，declare 数组存每个文件的 auth/token，循环执行

## 第三步 · 落库确认

```
mcp__netdrive__tdrive.file_upload_complete
  confirm_key:  第一步返回的确认凭据
  dir_id:       同上
  file_name:    同上
  file_size:    同上
  task_id:      第一步返回的 task_id
```

返回成功才真正入库。**PUT 成功 ≠ 入库**，必须走第三步。

## 限流与重试

- 现象：`file_upload_complete` 报错（如限流）
- 处理：**等 5-6 秒**再重试同一参数，不要立刻重试、不要改参数
- 多个失败：逐个串行重试，先成功的先过

## 目录管理

- 建目录：`mcp__netdrive__tdrive.dir_create`（name + parent_dir_id）
- 归档目录结构推荐：
  ```
  <项目名>_团队交接_<YYYYMMDD>/
  ├── 01_核心文档/      (交接文档 + SOP + 剧本 + 分析 + manifest + state)
  ├── 02_<类型>资产_<版本>/   (已验收资产，如 人物资产V03)
  └── 03_<类型>资产_<版本>/   (候选资产，如 场景道具V02)
  ```
- 列目录核对：`dir_list` 各子目录，确认文件数与文件名，防止中途丢文件

## 踩坑记录（2026-08-27 实测）

1. 中文路径 `-T` 必失败 → 必须 cd + 相对文件名
2. `file_upload_complete` 并发多个会限流 → 分批 + 失败等 5-6 秒重试
3. 上传过程中文件字节数必须在 stat 里提前取准，file_upload 参数错误会 400
