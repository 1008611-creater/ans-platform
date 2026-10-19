#!/usr/bin/env python3
"""
Zero-AppID Feishu Cloud Doc MCP Server (Stdio JSON-RPC 2.0).
Uses the QR-authenticated Playwright session stored at `~/.gemini/feishu-storage-state.json`
(and persistent profile `~/.gemini/feishu-browser-profile`) so the user NEVER needs to manually
look up `APP_ID` or `APP_SECRET`.

Tools provided:
  1. `feishu_import_file_as_doc`: Import a local `.docx` or `.md` file (including embedded images) into Feishu Cloud Docs and return its URL.
  2. `feishu_read_doc_content`: Read text/markdown content from any `feishu.cn` wiki/docx/sheet URL using the logged-in session.
  3. `feishu_session_status`: Check whether the QR-code login session is valid.
"""

from __future__ import annotations
import json
import pathlib
import subprocess
import sys
from typing import Any

STATE_PATH = pathlib.Path.home() / ".gemini" / "feishu-storage-state.json"
NODE_BIN = "/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
HELPER_MJS = pathlib.Path(__file__).resolve().parent / "feishu_playwright_worker.mjs"


def send_response(msg: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def handle_request(req: dict[str, Any]) -> None:
    method = req.get("method", "")
    req_id = req.get("id")

    if method == "initialize":
        send_response({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "feishu-doc-publisher-mcp",
                    "version": "1.0.0",
                },
            },
        })
    elif method.startswith("notifications/"):
        return
    elif method == "tools/list":
        send_response({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "feishu_import_file_as_doc",
                        "description": "将本地 .docx（含内嵌图片）或 .md 文件一键导入并转换为飞书云文档（使用已扫码的飞书登录态，无需 AppID/Secret）。",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "file_path": {
                                    "type": "string",
                                    "description": "本地 .docx 或 .md 文件的绝对路径",
                                },
                                "drive_url": {
                                    "type": "string",
                                    "description": "可选，目标飞书云盘地址（默认 https://narcb9vct6.feishu.cn/drive/home/）",
                                },
                            },
                            "required": ["file_path"],
                        },
                    },
                    {
                        "name": "feishu_read_doc_content",
                        "description": "使用已扫码登录态读取任意飞书云文档 / 知识库（wiki/docx）页面的正文内容。",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "url": {
                                    "type": "string",
                                    "description": "飞书文档或知识库 URL",
                                }
                            },
                            "required": ["url"],
                        },
                    },
                    {
                        "name": "feishu_session_status",
                        "description": "检查当前飞书扫码登录态（~/.gemini/feishu-storage-state.json）是否已就绪。",
                        "inputSchema": {
                            "type": "object",
                            "properties": {},
                        },
                    },
                ]
            },
        })
    elif method == "tools/call":
        params = req.get("params") or {}
        t_name = params.get("name", "")
        args = params.get("arguments") or {}

        if t_name == "feishu_session_status":
            exists = STATE_PATH.exists()
            info = {
                "logged_in_state_exists": exists,
                "state_path": str(STATE_PATH),
                "size_bytes": STATE_PATH.stat().st_size if exists else 0,
            }
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps(info, ensure_ascii=False, indent=2)}]
                },
            })
        elif t_name in ("feishu_import_file_as_doc", "feishu_read_doc_content"):
            cmd = [NODE_BIN, str(HELPER_MJS), t_name, json.dumps(args, ensure_ascii=False)]
            res = subprocess.run(cmd, capture_output=True, text=True)
            out_txt = res.stdout.strip() or res.stderr.strip()
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": out_txt}],
                    "isError": res.returncode != 0,
                },
            })
        else:
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {t_name}"},
            })
    elif req_id is not None:
        send_response({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {},
        })


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            handle_request(req)
        except Exception as e:
            sys.stderr.write(f"MCP error: {e}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
