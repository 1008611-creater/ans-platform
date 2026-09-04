#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Send local delivery files to Weixin through the Hermes Agent running in WSL."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


DEFAULT_DISTRO = "Ubuntu"
DEFAULT_HERMES_ROOT = "/home/lsb/.hermes/hermes-agent"
DEFAULT_HERMES_PYTHON = "/home/lsb/.hermes/hermes-agent/venv/bin/python"
DEFAULT_INTERVAL_SECONDS = 120
DEFAULT_RETRY_DELAY_SECONDS = 120
DEFAULT_SEND_RETRIES = 1


class HermesSendError(RuntimeError):
    pass


def run_wsl(distro: str, script: str, *, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["wsl", "-d", distro, "--", "bash", "-lc", script],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def windows_to_wsl_path(path: Path) -> str:
    raw = str(path.resolve())
    if raw.startswith("/"):
        return raw
    if len(raw) >= 3 and raw[1:3] == ":\\":
        drive = raw[0].lower()
        rest = raw[3:].replace("\\", "/")
        return f"/mnt/{drive}/{rest}"
    raise HermesSendError(f"Cannot convert path to WSL path: {raw}")


def parse_json_output(stdout: str, stderr: str) -> dict[str, Any]:
    text = stdout.strip() or stderr.strip()
    if not text:
        raise HermesSendError("Hermes returned no output")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise HermesSendError(f"Hermes returned non-JSON output:\n{text}") from exc


def hermes_base_cmd(hermes_root: str, hermes_python: str) -> str:
    return f"cd {shlex.quote(hermes_root)} && {shlex.quote(hermes_python)} -m hermes_cli.main"


def list_weixin_targets(args: argparse.Namespace) -> list[dict[str, Any]]:
    cmd = f"{hermes_base_cmd(args.hermes_root, args.hermes_python)} send --list weixin --json"
    proc = run_wsl(args.distro, cmd, timeout=30)
    if proc.returncode != 0:
        raise HermesSendError((proc.stdout or proc.stderr).strip())
    payload = parse_json_output(proc.stdout, proc.stderr)
    return list(payload.get("platforms", {}).get("weixin", []))


def resolve_target(args: argparse.Namespace) -> str:
    if args.target:
        return args.target if args.target.startswith("weixin:") else f"weixin:{args.target}"
    targets = list_weixin_targets(args)
    if not targets:
        raise HermesSendError("No Hermes Weixin targets found. Run with --list-targets to inspect setup.")
    return f"weixin:{targets[0]['id']}"


def send_one(args: argparse.Namespace, target: str, file_path: Path, index: int, total: int) -> dict[str, Any]:
    if not file_path.exists():
        raise HermesSendError(f"File not found: {file_path}")
    wsl_path = windows_to_wsl_path(file_path)
    message = f"MEDIA:{wsl_path}"
    env = (
        f"export WEIXIN_SEND_CHUNK_RETRY_DELAY_SECONDS={int(args.retry_delay_seconds)} "
        f"WEIXIN_SEND_CHUNK_RETRIES={int(args.send_retries)}; "
    )
    cmd = (
        env
        + f"{hermes_base_cmd(args.hermes_root, args.hermes_python)} "
        + f"send --to {shlex.quote(target)} --json {shlex.quote(message)}"
    )
    print(f"[{index}/{total}] Sending {file_path.name} -> {target}", flush=True)
    proc = run_wsl(args.distro, cmd, timeout=max(60, int(args.retry_delay_seconds) * (int(args.send_retries) + 2)))
    payload = parse_json_output(proc.stdout, proc.stderr)
    if proc.returncode != 0 or not payload.get("success"):
        error = str(payload.get("error") or payload)
        raise HermesSendError(f"Failed to send {file_path.name}: {error}")
    print(f"[OK] {file_path.name} message_id={payload.get('message_id', '')}", flush=True)
    return payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Send files to Weixin through Hermes Agent in WSL.")
    parser.add_argument("files", nargs="*", help="Local files to send")
    parser.add_argument("--target", help="Hermes target, e.g. weixin:o9...@im.wechat or filehelper")
    parser.add_argument("--distro", default=DEFAULT_DISTRO)
    parser.add_argument("--hermes-root", default=DEFAULT_HERMES_ROOT)
    parser.add_argument("--hermes-python", default=DEFAULT_HERMES_PYTHON)
    parser.add_argument("--interval-seconds", type=int, default=DEFAULT_INTERVAL_SECONDS)
    parser.add_argument("--retry-delay-seconds", type=int, default=DEFAULT_RETRY_DELAY_SECONDS)
    parser.add_argument("--send-retries", type=int, default=DEFAULT_SEND_RETRIES)
    parser.add_argument("--list-targets", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.list_targets:
        print(json.dumps(list_weixin_targets(args), ensure_ascii=False, indent=2), flush=True)
        return 0
    if not args.files:
        parser.error("files are required unless --list-targets is used")

    files = [Path(item).resolve() for item in args.files]
    target = resolve_target(args)
    print(f"[TARGET] {target}", flush=True)
    for item in files:
        print(f"[PLAN] {item}", flush=True)
    if args.dry_run:
        return 0

    results: list[dict[str, Any]] = []
    for idx, file_path in enumerate(files, start=1):
        if idx > 1 and args.interval_seconds > 0:
            print(f"[WAIT] sleeping {args.interval_seconds}s before next send", flush=True)
            time.sleep(args.interval_seconds)
        results.append(send_one(args, target, file_path, idx, len(files)))

    print(json.dumps({"success": True, "target": target, "sent": len(results)}, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except HermesSendError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1)
