# 飞书云文档一键发布与 MCP 插件 (`feishu-doc-publisher`)

本插件提供两种将本地图文汇报直接变成飞书云文档（含全部内嵌高清图片）的方式：

## 方式 A：3 秒极速导入（推荐，无需配置 AppID）
直接打开飞书云盘（如 `https://narcb9vct6.feishu.cn/drive/home/`），点击右上角 **「新建 -> 导入为云文档」**，选择：
`/Users/eeo/Downloads/eeo/NB实验室_科学实验统一封面Skill矩阵与21张物化生实测汇报.docx`
飞书会自动将文档内的 **15 个 Skill 表格、21 条完整生图提示词、以及 21 张高清物化生实验封面图** 全部解析并创建为原生飞书云文档！

## 方式 B：浏览器扫码自动上传（Playwright 自动化）
运行内置脚本，自动弹出飞书窗口，扫码登录后自动为您上传并转换为飞书云文档：
```bash
/Users/eeo/Downloads/eeo/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python \
  ~/.gemini/config/plugins/feishu-doc-publisher/skills/feishu-doc-publisher/scripts/feishu_browser_import.py
```

## 方式 C：飞书官方 `@larksuiteoapi/lark-mcp` MCP 服务
在 `~/.gemini/config/plugins/feishu-doc-publisher/mcp_config.json` 的 `env` 中填入飞书自建应用的 `APP_ID` 与 `APP_SECRET`（或运行 `npx -y @larksuiteoapi/lark-mcp login` 进行个人账号 OAuth 登录），重启 Antigravity 即可直接通过 MCP 工具读写飞书文档与多维表格。
