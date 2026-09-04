#!/usr/bin/env python
"""把本地 .workbuddy / .codex / .claude 的 skills 全部 vendoring 到 prompts-chat 技能源（仅文本文件）。

按目录名去重：依次处理 workbuddy -> codex -> claude，已存在的目录不再覆盖。
跳过以 . 或 _ 开头的目录（如 _backup），以及 KEEP_SOURCE 中保留的历史导出版本。
"""
import os
import shutil
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASES = [
    r"C:/Users/lsb/.workbuddy/skills",
    r"C:/Users/lsb/.codex/skills",
    r"C:/Users/lsb/.claude/skills",
]
DST = r"C:/Users/lsb/.workbuddy/apps/prompts-chat/ai-video-skills-source"

# 保留 source 已有版本、不覆盖的目录（AI 视频链路历史导出，含 SKILL.md）
KEEP_SOURCE = {
    "ai-video-novel-creation-v1",
    "image2-storyboard-video",
    "mikoto-gpt-image-2",
    "mx-shortdrama-00-router",
    "mx-shortdrama-04-character-assets",
    "mx-shortdrama-production-harness",
    "mx-shortdrama-production-iteration",
    "sd2.5skill",
    "seedance2-narrative-shot-workflow",
    "storyboard-director",
}

TEXT_EXT = {".md", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".json", ".py",
            ".txt", ".yaml", ".yml", ".sh", ".css", ".html", ".csv"}
SKIP_DIRS = {".git", "node_modules", "__pycache__"}


def collect_text(dirpath, base, out):
    for entry in sorted(os.listdir(dirpath)):
        if entry.startswith("."):
            continue
        full = os.path.join(dirpath, entry)
        rel = os.path.join(base, entry)
        if os.path.isdir(full):
            if entry in SKIP_DIRS:
                continue
            collect_text(full, rel, out)
        elif os.path.splitext(entry)[1].lower() in TEXT_EXT:
            out.append((full, rel))


def main():
    copied = 0
    skipped_existing = 0
    for base in BASES:
        if not os.path.isdir(base):
            print(f"  [skip] 源目录不存在: {base}")
            continue
        for skill in sorted(os.listdir(base)):
            if skill.startswith(".") or skill.startswith("_"):
                continue
            if skill in KEEP_SOURCE:
                print(f"  [keep] {skill} (保留 source 版本)")
                continue
            src_dir = os.path.join(base, skill)
            if not os.path.isdir(src_dir):
                continue
            if not os.path.isfile(os.path.join(src_dir, "SKILL.md")):
                continue
            dst_dir = os.path.join(DST, skill)
            if os.path.exists(dst_dir):
                skipped_existing += 1
                continue
            files = []
            collect_text(src_dir, "", files)
            for full, rel in files:
                to = os.path.join(dst_dir, rel)
                os.makedirs(os.path.dirname(to), exist_ok=True)
                shutil.copy2(full, to)
            copied += 1
            print(f"  [sync] {skill}: {len(files)} 个文本文件 (from {os.path.basename(base)})")
    print(f"\n完成：新增 {copied} 个技能目录，已存在跳过 {skipped_existing} 个")


if __name__ == "__main__":
    main()
