#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ANS 品牌替换 —— 第三批：src/（排除 content/ 帮助书）+ 全语言包 messages/*.json

设计原则：先保护，后替换。命中数不足会报错退出，不静默漏改。

【必须保留，改了会坏】
  1. @unclaimed.prompts.chat          —— 导入的 GitHub 贡献者的邮箱域，DB 里已有账号依赖它
  2. prompts.chat-mcp / @fkadev/...   —— 上游作者真实发布的 npm 包，改了安装命令失效
  3. from 'prompts.chat' / "prompts.chat" —— package.json 里的真实依赖 ^0.0.7，运行时真代码
  4. huggingface.co/datasets/fka/prompts.chat —— 真实公开数据集，改了 404
  5. messages/*.json 的 authorIntro 行 —— 开源归属署名（ar/fa/he 里作者名是本地化写法，
                                          不能靠 "Fatih" 判断，必须按 key 保护）

【替换】其余 prompts.chat -> ANS，URL -> ans.cauai.fun
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 命中即整行跳过（保护项）
PRESERVE_MARKERS = [
    "@unclaimed.prompts.chat",
    "prompts.chat-mcp",
    "from 'prompts.chat'",
    'from "prompts.chat"',
    "huggingface.co/datasets/fka/prompts.chat",
    '"prompts.chat": "^',          # package.json 依赖声明
]

# 有序替换（长 URL 在前，避免被短规则截断）
REPLACEMENTS = [
    ("https://raw.githubusercontent.com/f/prompts.chat/refs/heads/main/public/",
     "https://ans.cauai.fun/"),
    ("https://github.com/f/prompts.chat",
     "https://github.com/1008611-creater/ans-platform"),
    ("https://deepwiki.com/f/prompts.chat",
     "https://deepwiki.com/1008611-creater/ans-platform"),
    ("https://context7.com/f/prompts.chat",
     "https://context7.com/1008611-creater/ans-platform"),
    ("https://prompts.chat", "https://ans.cauai.fun"),
    ('|| "prompts.chat"', '|| "ans.cauai.fun"'),   # host 兜底（无协议头）
]

EXCLUDE_DIRS = {"node_modules", ".next", ".git", "content", "backups"}


def walk_src():
    """src/ 下所有文件，排除 content/（帮助书 MDX 属汉化工程，单独排期）"""
    for dp, dns, fns in os.walk(os.path.join(ROOT, "src")):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        for fn in fns:
            yield os.path.join(dp, fn)


def process_file(path, skip_keys=()):
    """返回 (替换数, 保留数)"""
    try:
        # newline='' 关闭换行转换，splitlines(keepends=True) 保留原始 CRLF/LF，
        # 否则会把 Windows 工作区文件整体归一化成 LF，产生巨量无意义 diff
        src = io.open(path, encoding="utf-8", newline="").read()
    except (UnicodeDecodeError, OSError):
        return 0, 0
    if "prompts.chat" not in src:
        return 0, 0

    replaced, preserved = 0, 0
    out = []
    for line in src.splitlines(keepends=True):
        if "prompts.chat" not in line:
            out.append(line)
            continue

        # 保护项：整行跳过
        if any(m in line for m in PRESERVE_MARKERS):
            preserved += line.count("prompts.chat")
            out.append(line)
            continue
        # 保护项：按 JSON key（如 authorIntro 开源署名）
        if any(k in line for k in skip_keys):
            preserved += line.count("prompts.chat")
            out.append(line)
            continue

        for old, new in REPLACEMENTS:
            if old in line:
                replaced += line.count(old)
                line = line.replace(old, new)
        # 剩余裸品牌名
        if "prompts.chat" in line:
            replaced += line.count("prompts.chat")
            line = line.replace("prompts.chat", "ANS")
        out.append(line)

    if replaced:
        io.open(path, "w", encoding="utf-8", newline="").write("".join(out))
    return replaced, preserved


def main():
    total_rep = total_pre = 0
    changed = []

    print("=== A. src/（排除 content/ 帮助书）===")
    for p in walk_src():
        rep, pre = process_file(p)
        if rep or pre:
            total_rep += rep
            total_pre += pre
            rel = os.path.relpath(p, ROOT)
            changed.append(rel)
            if pre:
                print(f"  [保留{pre:>2}] {rel}")
    print(f"  小计：替换 {total_rep} 处，保留 {total_pre} 处，涉及 {len(changed)} 文件")

    print("\n=== B. messages/*.json 全语言包（保护 authorIntro 署名行）===")
    msg_rep = msg_pre = 0
    mdir = os.path.join(ROOT, "messages")
    if os.path.isdir(mdir):
        for fn in sorted(os.listdir(mdir)):
            if not fn.endswith(".json"):
                continue
            p = os.path.join(mdir, fn)
            rep, pre = process_file(p, skip_keys=('"authorIntro"',))
            if rep or pre:
                msg_rep += rep
                msg_pre += pre
                print(f"  {fn}: 替换 {rep}，保留 {pre}（署名行）")
    print(f"  小计：替换 {msg_rep} 处，保留 {msg_pre} 处")

    grand_rep = total_rep + msg_rep
    grand_pre = total_pre + msg_pre
    print(f"\n=== 合计：替换 {grand_rep} 处，保留 {grand_pre} 处 ===")

    if grand_rep == 0:
        print("❌ 一处都没替换，疑似规则失配，中止")
        sys.exit(1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
