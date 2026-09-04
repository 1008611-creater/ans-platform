#!/usr/bin/env python3
"""Read-only MXAI page reconnaissance.

Opens a persistent headed Chromium profile, saves a screenshot and visible page text,
and never clicks the generation/submit button.
"""
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

DEFAULT_URL = "https://www.mxai.cn/home/?mp=mjdrawai&from=invite&invite_id=100595351#/mj"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--profile-dir", type=Path, default=Path(".automation/mxai-profile"))
    parser.add_argument("--out-dir", type=Path, default=Path(".automation/inspections"))
    parser.add_argument("--wait-ms", type=int, default=5000)
    args = parser.parse_args()

    args.profile_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = args.out_dir / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(args.profile_dir),
            headless=False,
            viewport={"width": 1440, "height": 1000},
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(args.url, wait_until="domcontentloaded")
        page.wait_for_timeout(args.wait_ms)
        page.screenshot(path=str(out_dir / "page.png"), full_page=True)
        (out_dir / "visible_text.txt").write_text(page.locator("body").inner_text(), encoding="utf-8")
        (out_dir / "page.html").write_text(page.content(), encoding="utf-8")
        print(f"只读侦察已完成：{out_dir}")
        print("未点击生成、提交、购买或删除按钮。")
        context.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
