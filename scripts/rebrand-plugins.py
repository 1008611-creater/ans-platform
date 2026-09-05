#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ANS 插件目录（plugins/**）品牌替换 —— 最小风险方案

原则：
1. 命令命名空间 `/prompts.chat:` / `prompts.chat:prompts|skills` 原样保留
   （它与 plugin.json 的 name 绑定，改一处会破坏命令注册）
2. 文案描述里的 prompts.chat -> ANS（消除首页可见残留）
3. MCP 端点指向 ANS 自己的站（ans.cauai.fun/api/mcp），而非上游
4. plugin.json: 改 homepage/repository；保留 name（与命令前缀绑定）与 author（开源归属）
"""
import io
import os
import re

ROOT = "plugins"
MCP_FILE = os.path.join(ROOT, "claude/prompts.chat/.mcp.json")
PLUGIN_FILE = os.path.join(ROOT, "claude/prompts.chat/.claude-plugin/plugin.json")

NS_PLACEHOLDERS = [
    ("/prompts.chat:", "\x00NS_SLASH\x00"),
    ("prompts.chat:prompts", "\x00NS_P\x00"),
    ("prompts.chat:skills", "\x00NS_S\x00"),
]

# 顺序敏感：先具体 URL，再兜底
URL_RULES = [
    ("https://github.com/f/prompts.chat",
     "https://github.com/1008611-creater/ans-platform"),
    ("https://prompts.chat/api/mcp", "https://ans.cauai.fun/api/mcp"),
    ("https://prompts.chat", "https://ans.cauai.fun"),
]


def rebrand_text(text: str) -> str:
    # 1) 保护命令命名空间
    for real, ph in NS_PLACEHOLDERS:
        text = text.replace(real, ph)
    # 2) URL 替换（必须在通用替换之前）
    for old, new in URL_RULES:
        text = text.replace(old, new)
    # 3) 剩余文案 prompts.chat -> ANS
    text = text.replace("prompts.chat", "ANS")
    # 4) 恢复命令命名空间
    for real, ph in NS_PLACEHOLDERS:
        text = text.replace(ph, real)
    return text


def find_marked_files() -> list:
    out = []
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            try:
                with io.open(p, "r", encoding="utf-8") as f:
                    if "prompts.chat" in f.read():
                        out.append(p)
            except (UnicodeDecodeError, OSError):
                continue  # 二进制/非文本，跳过
    return sorted(out)


def main() -> int:
    files = find_marked_files()
    print(f"扫描到含 prompts.chat 的文件: {len(files)} 个\n")

    total = 0
    for path in files:
        # plugin.json 与 .mcp.json 单独精确处理，不走通用流程
        if path in (PLUGIN_FILE, MCP_FILE):
            continue
        with io.open(path, "r", encoding="utf-8") as f:
            src = f.read()
        new = rebrand_text(src)
        if new == src:
            continue
        n = src.count("prompts.chat") - new.count("prompts.chat")
        total += n
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new)
        print(f"  [文案] {path}: 替换 {n} 处")

    # ---- plugin.json: 只改 homepage / repository，保留 name 与 author ----
    if os.path.exists(PLUGIN_FILE):
        with io.open(PLUGIN_FILE, "r", encoding="utf-8") as f:
            s = f.read()
        orig = s
        s = s.replace('"homepage": "https://prompts.chat"',
                      '"homepage": "https://ans.cauai.fun"')
        s = s.replace('"repository": "https://github.com/f/prompts.chat"',
                      '"repository": "https://github.com/1008611-creater/ans-platform"')
        if s != orig:
            with io.open(PLUGIN_FILE, "w", encoding="utf-8", newline="") as f:
                f.write(s)
            print(f"  [配置] {PLUGIN_FILE}: homepage/repository -> ANS（保留 name 与 author）")
            total += 2

    # ---- .mcp.json: 端点指向 ANS 站点，key 改名（无引用，安全）----
    if os.path.exists(MCP_FILE):
        with io.open(MCP_FILE, "r", encoding="utf-8") as f:
            s = f.read()
        orig = s
        s = s.replace('"prompts.chat": {', '"ans": {')
        s = s.replace('"url": "https://prompts.chat/api/mcp"',
                      '"url": "https://ans.cauai.fun/api/mcp"')
        if s != orig:
            with io.open(MCP_FILE, "w", encoding="utf-8", newline="") as f:
                f.write(s)
            print(f"  [配置] {MCP_FILE}: 端点 -> ans.cauai.fun/api/mcp，key -> ans")
            total += 2

    print(f"\n共替换 {total} 处")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
