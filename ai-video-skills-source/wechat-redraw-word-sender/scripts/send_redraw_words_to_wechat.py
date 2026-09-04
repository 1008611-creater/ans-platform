#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Copy redraw Step2/Step4 DOCX files to Chinese names and send them in WeChat."""

from __future__ import annotations

import argparse
import ctypes
import os
import re
import shutil
import struct
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


DEFAULT_CHAT_NAME = "vicky 王、赵溪桥 (3)"


class SendError(RuntimeError):
    pass


pyautogui = None
pyperclip = None
win32clipboard = None
win32con = None
win32gui = None


def ensure_ui_modules() -> None:
    global pyautogui, pyperclip, win32clipboard, win32con, win32gui
    if pyautogui is not None:
        return
    try:
        import pyautogui as _pyautogui
        import pyperclip as _pyperclip
        import win32clipboard as _win32clipboard
        import win32con as _win32con
        import win32gui as _win32gui
    except Exception as exc:  # noqa: BLE001
        raise SendError(f"缺少微信自动化依赖，无法执行发送动作: {exc}") from exc
    _pyautogui.FAILSAFE = False
    pyautogui = _pyautogui
    pyperclip = _pyperclip
    win32clipboard = _win32clipboard
    win32con = _win32con
    win32gui = _win32gui


def parse_episode_range(value: str) -> list[int]:
    value = value.strip()
    if not value:
        raise ValueError("episodes is empty")
    episodes: list[int] = []
    for part in re.split(r"[,，\s]+", value):
        if not part:
            continue
        if "-" in part:
            start_s, end_s = part.split("-", 1)
            start, end = int(start_s), int(end_s)
            if end < start:
                raise ValueError(f"bad episode range: {part}")
            episodes.extend(range(start, end + 1))
        else:
            episodes.append(int(part))
    return sorted(dict.fromkeys(episodes))


def latest_docx(folder: Path, patterns: list[str]) -> Path:
    candidates: list[Path] = []
    if folder.exists():
        for pattern in patterns:
            candidates.extend(folder.glob(pattern))
    candidates = [p for p in candidates if p.is_file() and p.suffix.lower() == ".docx" and not p.name.startswith("~$")]
    if not candidates:
        raise SendError(f"没有找到 Word 文件: {folder}")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def discover_episode_files(project_dir: Path, episode: int) -> tuple[Path, Path]:
    ep = f"EP{episode:03d}"
    step2_dir = project_dir / "mx_redraw_step02" / f"{ep}_source_timeline"
    step4_dir = project_dir / "mx_redraw_step04" / f"{ep}_prompt_package"
    step2 = latest_docx(step2_dir, [f"{ep}*Step02*.docx", f"{ep}*step02*.docx", f"{ep}*.docx", "*.docx"])
    step4 = latest_docx(step4_dir, [f"{ep}*Step04*.docx", f"{ep}*step04*.docx", f"{ep}*.docx", "*.docx"])
    return step2, step4


def prepare_staging(project_dir: Path, episodes: list[int], staging_root: Path | None) -> list[Path]:
    root = staging_root or (project_dir / "wechat_send_ready")
    staging_dir = root / datetime.now().strftime("%Y%m%d_%H%M%S")
    staging_dir.mkdir(parents=True, exist_ok=False)

    staged: list[Path] = []
    for episode in episodes:
        step2, step4 = discover_episode_files(project_dir, episode)
        targets = [
            (step2, staging_dir / f"第{episode:03d}集 Step2 原片镜头时间轴.docx"),
            (step4, staging_dir / f"第{episode:03d}集 Step4 墨西哥转绘分镜头提示词包.docx"),
        ]
        for source, target in targets:
            shutil.copy2(source, target)
            staged.append(target)
            print(f"[STAGED] {source} -> {target}", flush=True)
    return staged


def episode_arg(episodes: list[int]) -> str:
    if episodes == list(range(episodes[0], episodes[-1] + 1)):
        return f"{episodes[0]:03d}-{episodes[-1]:03d}"
    return ",".join(f"{ep:03d}" for ep in episodes)


def python_executable() -> str:
    candidate = Path(sys.executable)
    if candidate.is_file():
        return str(candidate)
    for name in ("python.exe", "python"):
        found = shutil.which(name)
        if found:
            return found
    raise SendError(f"找不到可执行 Python，当前 sys.executable 不是文件: {sys.executable}")


def run_quality_gate(project_dir: Path, episodes: list[int], max_bad: int) -> None:
    validator = Path(os.environ.get("MX_REDRAW_VALIDATOR", r"D:\codex-work\aaa\tools\validate_redraw_delivery.py"))
    if not validator.exists():
        raise SendError(f"质量门脚本不存在，拒绝发送: {validator}")
    cmd = [
        python_executable(),
        str(validator),
        "--project-dir",
        str(project_dir),
        "--episodes",
        episode_arg(episodes),
        "--summary-only",
        "--max-bad",
        str(max_bad),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        detail = "\n".join(part for part in [proc.stdout.strip(), proc.stderr.strip()] if part)
        if len(detail) > 6000:
            detail = detail[:6000] + "\n...输出已截断，完整结果请单独运行质量门脚本。"
        raise SendError("Step2/Step4 质量门失败，未复制 staging，也未发送微信。\n" + detail)
    print("[QA] Step2/Step4 质量门通过。", flush=True)


def set_file_clipboard(paths: list[Path]) -> None:
    ensure_ui_modules()
    normalized = [str(p.resolve()) for p in paths]
    payload = ("\0".join(normalized) + "\0\0").encode("utf-16le")
    dropfiles = struct.pack("<IiiII", 20, 0, 0, 0, 1)
    data = dropfiles + payload
    last_exc: Exception | None = None
    for _ in range(8):
        try:
            win32clipboard.OpenClipboard()
            try:
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32con.CF_HDROP, data)
                return
            finally:
                win32clipboard.CloseClipboard()
        except Exception as exc:
            last_exc = exc
            time.sleep(0.35)
    raise SendError(f"无法写入文件剪贴板: {last_exc}")


def chat_search_text(chat_name: str) -> str:
    return re.sub(r"\s*\(\d+\)\s*$", "", chat_name).strip() or chat_name


def visible_windows() -> list[str]:
    ensure_ui_modules()
    titles: list[str] = []
    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return
        title = (win32gui.GetWindowText(hwnd) or "").strip()
        if title:
            titles.append(title)
    win32gui.EnumWindows(callback, None)
    return titles


def find_wechat_window():
    ensure_ui_modules()
    candidates = []
    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return
        title = (win32gui.GetWindowText(hwnd) or "").strip()
        try:
            class_name = win32gui.GetClassName(hwnd) or ""
        except Exception:
            class_name = ""
        marker = f"{title} {class_name}".lower()
        if "wechat" in marker or "微信" in marker or "weixin" in marker:
            candidates.append(hwnd)
    win32gui.EnumWindows(callback, None)

    if not candidates:
        titles = "\n".join(f"- {t}" for t in visible_windows()[:40])
        raise SendError("没有找到已打开的微信窗口。当前可见窗口:\n" + titles)

    def area(hwnd) -> int:
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        return max(0, right - left) * max(0, bottom - top)

    return max(candidates, key=area)


def focus_window(hwnd) -> None:
    ensure_ui_modules()
    try:
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        time.sleep(0.2)
        win32gui.BringWindowToTop(hwnd)
        win32gui.SetForegroundWindow(hwnd)
    except Exception as exc:
        # Windows can reject SetForegroundWindow for background automation even
        # when the target WeChat window is visible. A real mouse click on the
        # title area is usually enough to grant foreground focus.
        try:
            left, top, right, bottom = win32gui.GetWindowRect(hwnd)
            if right > left and bottom > top:
                pyautogui.click(left + min(120, max(20, (right - left) // 2)), top + 18)
                time.sleep(0.3)
                win32gui.BringWindowToTop(hwnd)
                return
        except Exception:
            pass
        raise SendError(f"无法激活微信窗口: {exc}") from exc


def click_relative(hwnd, x_ratio: float, y_ratio: float) -> None:
    ensure_ui_modules()
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width = right - left
    height = bottom - top
    x = int(left + width * x_ratio)
    y = int(top + height * y_ratio)
    pyautogui.click(x, y)


def activate_wechat_chat(chat_name: str, search_name: str, verify: bool) -> None:
    ensure_ui_modules()
    hwnd = find_wechat_window()
    focus_window(hwnd)
    time.sleep(0.5)

    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    if right - left < 600 or bottom - top < 500:
        raise SendError(f"微信窗口太小，无法稳定点击: {(left, top, right, bottom)}")

    # Search box in the top-left panel of the Windows WeChat layout.
    click_relative(hwnd, 0.155, 0.060)
    time.sleep(0.15)
    pyautogui.hotkey("ctrl", "a")
    pyperclip.copy(search_name)
    pyautogui.hotkey("ctrl", "v")
    time.sleep(0.8)

    # Open the first search result.
    click_relative(hwnd, 0.155, 0.150)
    time.sleep(1.0)

    if verify:
        print("[WARN] 当前脚本使用 Win32 直接定位微信，无法可靠读取聊天标题；已按搜索结果打开目标群。", flush=True)


def send_file_to_active_chat(path: Path, send_key: str, delay: float) -> None:
    ensure_ui_modules()
    hwnd = find_wechat_window()
    focus_window(hwnd)
    time.sleep(0.2)

    # Message input area in the lower right of the Windows WeChat layout.
    click_relative(hwnd, 0.645, 0.765)
    time.sleep(0.15)
    set_file_clipboard([path])
    pyautogui.hotkey("ctrl", "v")
    time.sleep(delay)
    if send_key.lower() == "enter":
        pyautogui.press("enter")
    elif send_key.lower() == "ctrl+enter":
        pyautogui.hotkey("ctrl", "enter")
    else:
        raise SendError(f"不支持的发送快捷键: {send_key}")
    time.sleep(delay)
    print(f"[SENT] {path.name}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-dir", required=True, type=Path)
    parser.add_argument("--episodes", required=True, help='Example: "008-011" or "1,2,3"')
    parser.add_argument("--chat-name", default=DEFAULT_CHAT_NAME)
    parser.add_argument("--search-name", help="WeChat search text. Defaults to chat name without trailing member count.")
    parser.add_argument("--staging-root", type=Path)
    parser.add_argument("--send", action="store_true", help="Actually send files in WeChat")
    parser.add_argument("--dry-run", action="store_true", help="Only stage and print files")
    parser.add_argument("--send-key", default="enter", choices=["enter", "ctrl+enter"])
    parser.add_argument("--delay", default=1.6, type=float)
    parser.add_argument("--skip-chat-verify", action="store_true", help="Skip UIA title verification after search")
    parser.add_argument("--skip-quality-gate", action="store_true", help="Skip Step2/Step4 document quality validation before staging/sending")
    parser.add_argument("--quality-gate-max-bad", default=20, type=int, help="Maximum bad episodes to print when the quality gate fails")
    args = parser.parse_args()

    if args.send and args.dry_run:
        raise SendError("不能同时使用 --send 和 --dry-run")
    if not args.send and not args.dry_run:
        raise SendError("必须显式指定 --send 或 --dry-run")

    project_dir = args.project_dir.resolve()
    if not project_dir.exists():
        raise SendError(f"项目目录不存在: {project_dir}")

    episodes = parse_episode_range(args.episodes)
    if not args.skip_quality_gate:
        run_quality_gate(project_dir, episodes, args.quality_gate_max_bad)
    staged = prepare_staging(project_dir, episodes, args.staging_root)

    print("[READY] 待发送文件:", flush=True)
    for path in staged:
        print(f"  {path}", flush=True)

    if args.dry_run:
        print("[DRY-RUN] 已完成中文命名复制，未发送微信。", flush=True)
        return 0

    ctypes.windll.user32.SetProcessDPIAware()
    search_name = args.search_name or chat_search_text(args.chat_name)
    activate_wechat_chat(args.chat_name, search_name=search_name, verify=False)
    for path in staged:
        send_file_to_active_chat(path, args.send_key, args.delay)
    print(f"[DONE] 已向微信群发送 {len(staged)} 个 Word 文件: {args.chat_name}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1)
