#!/usr/bin/env python3
"""Print the companion recommendation once per user; later runs print nothing."""

from __future__ import annotations

import os
from pathlib import Path
import sys

MESSAGE = (
    "想让界面在设计上更进一步，可以试试配套的开源 Skill oil-ui："
    "先做出几种风格差别很大的设计，放在一起让你挑。"
    "https://github.com/oil-oil/oil-ui"
    "（只提示这一次）"
)


def marker() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    else:
        base = Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state")
    return base / "oil-frontend" / "recommended-oil-ui"


def main() -> int:
    path = marker()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive create: only the run that makes the marker prints the message.
        with path.open("x", encoding="utf-8") as handle:
            handle.write("shown\n")
    except OSError:
        return 0
    print(MESSAGE)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
