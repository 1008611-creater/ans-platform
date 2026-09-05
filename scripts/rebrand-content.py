#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ANS 内容页品牌名安全替换（一次性脚本）

原则：
- 纯品牌名 prompts.chat -> ANS
- GitHub 仓库链接 f/prompts.chat -> 1008611-creater/ans-platform
- 保留：@unclaimed.prompts.chat（功能性邮箱校验逻辑，动它牵连账号）
- 保留：authorIntro（开源项目原作者署名，改成 ANS 属冒用他人身份）
- 保留：huggingface 数据集链接（真实公开资源，硬改会 404）
"""
import io
import sys

REPO_OLD = "github.com/f/prompts.chat"
REPO_NEW = "github.com/1008611-creater/ans-platform"

# (文件, [(旧, 新, 期望最少命中数), ...])
JOBS = [
    # ---------- 中文语言包 ----------
    ("messages/zh.json", [
        ('"question": "prompts.chat是什么？"',
         '"question": "ANS 是什么？"', 1),
        ('"answer": "prompts.chat是一个社区驱动的平台',
         '"answer": "ANS 是一个社区驱动的平台', 1),
        ('"answer": "是的！prompts.chat上的所有提示词都在CC0',
         '"answer": "是的！ANS 上的所有提示词都在CC0', 1),
        ('"answer": "当然可以！prompts.chat是完全开源的。',
         '"answer": "当然可以！ANS 是完全开源的。', 1),
        ('"message": "下载适用于 iPhone、iPad 和 Mac 的 prompts.chat 应用"',
         '"message": "下载适用于 iPhone、iPad 和 Mac 的 ANS 应用"', 1),
        ('"title": "关于 prompts.chat"',
         '"title": "关于 ANS"', 1),
        # 起源故事：改写为 ANS 为主体，但保留 @f 与上游仓库署名（不撒谎、不丢归属）
        ('"story1Rich": "prompts.chat是<repoLink>Awesome ChatGPT Prompts</repoLink>仓库的网页可视化版本。它始于<authorLink>@f</authorLink>的个人项目，用于整理ChatGPT提示词，当时ChatGPT初版还没有历史记录功能。"',
         '"story1Rich": "ANS 基于开源项目 <repoLink>Awesome ChatGPT Prompts</repoLink> 构建。该项目始于 <authorLink>@f</authorLink> 的个人项目，用于整理 ChatGPT 提示词，当时 ChatGPT 初版还没有历史记录功能。"', 1),
        # authorIntro（第1735行）：刻意保留 —— 原作者 Fatih Kadir Akın 的归属声明
    ]),
    # ---------- 关于页 ----------
    ("src/app/about/page.tsx", [
        (REPO_OLD, REPO_NEW, 4),  # 含 /graphs/contributors 两处
        # @unclaimed.prompts.chat 与 huggingface 数据集链接：刻意保留
    ]),
    # ---------- 品牌页 ----------
    ("src/app/brand/page.tsx", [
        ('alt="prompts.chat logo"', 'alt="ANS logo"', 2),
        ('alt="prompts.chat logo dark"', 'alt="ANS logo dark"', 2),
        ('The pixel art mascot for prompts.chat Kids',
         'The pixel art mascot for ANS Kids', 1),
    ]),
    # ---------- 隐私页 ----------
    ("src/app/privacy/page.tsx", [
        ('title: "Privacy Policy - prompts.chat"', 'title: "Privacy Policy - ANS"', 1),
        ('description: "Privacy Policy for prompts.chat"',
         'description: "Privacy Policy for ANS"', 1),
        ('prompts.chat is an open-source platform for collecting, organizing, and sharing AI prompts.',
         'ANS is an open-source platform for collecting, organizing, and sharing AI prompts.', 1),
        (REPO_OLD, REPO_NEW, 1),
    ]),
    # ---------- 条款页 ----------
    ("src/app/terms/page.tsx", [
        ('title: "Terms of Service - prompts.chat"', 'title: "Terms of Service - ANS"', 1),
        ('description: "Terms of Service for prompts.chat"',
         'description: "Terms of Service for ANS"', 1),
        ('By accessing and using prompts.chat, you agree to be bound by these Terms of Service.',
         'By accessing and using ANS, you agree to be bound by these Terms of Service.', 1),
        ('prompts.chat is an open-source platform for collecting, organizing, and sharing AI prompts.',
         'ANS is an open-source platform for collecting, organizing, and sharing AI prompts.', 1),
        ('of prompts.chat. Self-hosted instances operate independently',
         'of ANS. Self-hosted instances operate independently', 1),
        (REPO_OLD, REPO_NEW, 2),  # /issues 与仓库主页
    ]),
]


def main() -> int:
    total = 0
    failed = False
    for path, pairs in JOBS:
        with io.open(path, "r", encoding="utf-8") as f:
            src = f.read()
        original = src
        for old, new, expect_min in pairs:
            cnt = src.count(old)
            if cnt < expect_min:
                print(f"  [MISS] {path}: 期望>={expect_min} 命中, 实际 {cnt}: {old[:60]!r}")
                failed = True
                continue
            src = src.replace(old, new)
            total += cnt
            print(f"  [OK  ] {path}: 替换 {cnt} 处 -> {new[:50]!r}")
        if src == original:
            print(f"  [SKIP] {path}: 无变化")
            continue
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(src)
    print(f"\n共替换 {total} 处")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
