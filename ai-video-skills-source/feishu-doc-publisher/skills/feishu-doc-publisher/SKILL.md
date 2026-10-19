---
name: feishu-doc-publisher
description: >-
  将本地 Markdown（含本地图片）或标准 Word (.docx) 汇报文档一键自动发布为飞书在线云文档（复用已扫码持久化的飞书登录会话，免 AppID/Secret，自动内嵌全部本地图片并返回飞书在线文档 URL）。当用户要求将工作成果、方案、提示词或出图汇报同步到飞书文档时激活本技能。
---

# 飞书云文档一键同步与发布技能 (`feishu-doc-publisher`)

本机已完成飞书扫码会话持久化配置（会话存储于 `~/.gemini/feishu-browser-profile` 与 `~/.gemini/feishu-storage-state.json`），无需任何 OpenAPI `APP_ID` 或 `APP_SECRET`。

## 核心铁律（为什么必须先转标准 `python-docx` 再导入）
1. **严禁直接导入含本地图片路径的 `.md` 文件**：飞书直接导入 Markdown 时不会上传本地磁盘图片（`![...](/Users/...)` 会丢失）。
2. **严禁手写残缺 ZIP 伪造 `.docx`**：飞书文档解析器校验完整的 OpenXML 结构（含 `word/styles.xml`、`docProps/core.xml` 等），必须使用 `python-docx`（或调用下方一键脚本 `publish_to_feishu.py`）生成真实 Word `.docx` 后再导入。

---

## 方式 A：一行命令全自动将 `.md`（含本地图片）或 `.docx` 发布到飞书云文档（推荐所有线程使用）

先把本线程需要汇报的内容整理为标准 Markdown 文件（本地图片使用 `![说明](/绝对路径/xxx.png)`），然后直接运行以下命令：

```bash
/Users/eeo/Downloads/eeo/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python \
  /Users/eeo/.gemini/config/plugins/feishu-doc-publisher/skills/feishu-doc-publisher/scripts/publish_to_feishu.py \
  "/绝对路径/你的汇报文档名.md"
```

该脚本会自动完成：
1. 解析 Markdown 的多级标题、表格、代码块与本地图片（自动用 `sips` 压缩图片并内嵌进标准 `python-docx` `.docx` 文档）；
2. 复用 `~/.gemini/feishu-browser-profile` 已登录的飞书会话，自动执行「上传本地文件 -> 导入为在线文档 -> 我的文档库 -> Microsoft Word」；
3. 等待飞书云端转换完成，在终端 JSON 输出中直接返回生成的飞书云文档链接（如 `https://narcb9vct6.feishu.cn/wiki/...`）。

---

## 方式 B：通过 `feishu-doc-publisher-mcp` 工具调用

如果当前线程已加载 `feishu-doc-publisher-mcp`：
1. 先用 `/Users/eeo/Downloads/eeo/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python`（含 `python-docx`）将图文生成为 `.docx` 文件；
2. 调用 MCP 工具 `feishu_import_file_as_doc`：
   - `ServerName`: `"feishu-doc-publisher-mcp"`
   - `ToolName`: `"feishu_import_file_as_doc"`
   - `Arguments`: `{"file_path": "/绝对路径/你的汇报文档名.docx"}`
3. 如需读取飞书现有文档或表格，可调用 `feishu_read_doc_content`（传入 `{"url": "https://narcb9vct6.feishu.cn/..."}`）。
