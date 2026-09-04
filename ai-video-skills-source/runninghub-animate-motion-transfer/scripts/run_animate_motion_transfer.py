#!/usr/bin/env python3
"""Upload, submit, query, and download RunningHub Animate V9 motion-transfer tasks."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests


BASE_URL = "https://www.runninghub.cn"
APP_ID = "1975951975441412098"
UPLOAD_PATH = "/openapi/v2/media/upload/binary"
SUBMIT_PATH = "/task/openapi/ai-app/run"
QUERY_PATH = "/openapi/v2/query"

DEFAULT_NODES = [
    ("535", "select", "1"), ("293", "select", "1"), ("497", "value", "false"),
    ("297", "value", "1.0000000000000002"), ("370", "value", "false"),
    ("361", "value", "1.0000000000000002"), ("271", "value", "false"),
    ("265", "value", "0.8000000000000002"), ("266", "value", "0.20000000000000004"),
    ("499", "value", "0"), ("422", "value", "840"), ("264", "value", "30"),
    ("470", "select", "2"), ("452", "value", "false"), ("451", "value", "9"),
    ("450", "value", "16"),
]


def fail(message: str) -> None:
    raise RuntimeError(message)


def json_print(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def require_file(value: str, kind: str) -> Path:
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        fail(f"{kind} 文件不存在：{path}")
    return path


def key_from_args(args: argparse.Namespace) -> str:
    key = args.api_key or os.environ.get("RUNNINGHUB_API_KEY")
    if not key:
        fail("缺少 RUNNINGHUB_API_KEY；通过环境变量或 --api-key 提供。")
    return key


def request_json(method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    response = requests.request(method, url, timeout=kwargs.pop("timeout", 180), **kwargs)
    try:
        payload = response.json()
    except ValueError:
        fail(f"HTTP {response.status_code} 返回非 JSON：{response.text[:500]}")
    if response.status_code >= 400:
        fail(f"HTTP {response.status_code}：{payload}")
    return payload


def upload(path: Path, api_key: str, base_url: str) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    with path.open("rb") as handle:
        payload = request_json(
            "POST", base_url + UPLOAD_PATH,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (path.name, handle, mime)},
        )
    if payload.get("code") != 0 or not payload.get("data", {}).get("fileName"):
        fail(f"上传失败：{payload}")
    return str(payload["data"]["fileName"])


def parse_overrides(values: list[str]) -> dict[tuple[str, str], str]:
    parsed: dict[tuple[str, str], str] = {}
    for value in values:
        if "=" not in value or "." not in value.split("=", 1)[0]:
            fail(f"参数覆盖格式应为 nodeId.fieldName=value：{value}")
        target, replacement = value.split("=", 1)
        node_id, field_name = target.split(".", 1)
        if (node_id, field_name) in {("275", "video"), ("299", "image")}:
            fail("视频和图片由 --video 与 --image 管理，不能通过 --set 覆盖。")
        parsed[(node_id, field_name)] = replacement
    return parsed


def node_list(video_name: str, image_name: str, overrides: list[str]) -> list[dict[str, str]]:
    values = {(node_id, field): value for node_id, field, value in DEFAULT_NODES}
    values.update(parse_overrides(overrides))
    nodes = [{"nodeId": node_id, "fieldName": field, "fieldValue": value}
             for (node_id, field), value in values.items()]
    nodes.extend([
        {"nodeId": "275", "fieldName": "video", "fieldValue": video_name},
        {"nodeId": "299", "fieldName": "image", "fieldValue": image_name},
    ])
    return nodes


def submit(api_key: str, args: argparse.Namespace, video_name: str, image_name: str) -> dict[str, Any]:
    body = {
        "webappId": args.app_id,
        "apiKey": api_key,
        "instanceType": args.instance_type,
        "nodeInfoList": node_list(video_name, image_name, args.overrides),
    }
    payload = request_json("POST", args.base_url + SUBMIT_PATH, json=body, headers={"Content-Type": "application/json"})
    if payload.get("code") != 0 or not payload.get("data", {}).get("taskId"):
        fail(f"提交失败：{payload}")
    return payload["data"]


def query(api_key: str, task_id: str, base_url: str) -> dict[str, Any]:
    return request_json(
        "POST", base_url + QUERY_PATH,
        json={"taskId": task_id},
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=60,
    )


def result_status(payload: dict[str, Any]) -> str:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    return str(data.get("status") or data.get("taskStatus") or "")


def download_results(payload: dict[str, Any], directory: Path) -> list[dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    results = data.get("results") or []
    directory.mkdir(parents=True, exist_ok=True)
    receipts: list[dict[str, Any]] = []
    for index, item in enumerate(results):
        url = item.get("url")
        if not url:
            continue
        extension = str(item.get("outputType") or "bin").lstrip(".")
        node_id = str(item.get("nodeId") or index)
        path = directory / f"runninghub_{node_id}_{index}.{extension}"
        response = requests.get(url, timeout=180)
        response.raise_for_status()
        path.write_bytes(response.content)
        receipts.append({
            "nodeId": node_id,
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    return receipts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", help="本地动作参考视频")
    parser.add_argument("--image", help="本地人物/商品参考图片")
    parser.add_argument("--task-id", help="恢复已提交任务；与 --video/--image 二选一")
    parser.add_argument("--api-key", help="仅本次使用；优先使用 RUNNINGHUB_API_KEY")
    parser.add_argument("--app-id", default=APP_ID)
    parser.add_argument("--base-url", default=BASE_URL)
    parser.add_argument("--instance-type", choices=("default", "plus", "ultra"), default="ultra")
    parser.add_argument("--set", dest="overrides", action="append", default=[], metavar="NODE.FIELD=VALUE",
                        help="覆盖 API 页面已暴露的节点参数；可重复使用")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--poll-seconds", type=int, default=20)
    parser.add_argument("--max-wait-seconds", type=int, default=2400)
    parser.add_argument("--download-dir")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.task_id and (args.video or args.image):
        fail("--task-id 不可与 --video/--image 同时使用。")
    if not args.task_id and not (args.video and args.image):
        fail("提交任务必须同时传入 --video 和 --image。")
    if args.poll_seconds <= 0 or args.max_wait_seconds <= 0:
        fail("轮询时间必须大于 0。")

    if args.dry_run:
        if args.task_id:
            json_print({"mode": "query", "taskId": args.task_id, "network": False})
        else:
            video = require_file(args.video, "视频")
            image = require_file(args.image, "图片")
            json_print({
                "mode": "submit", "network": False, "appId": args.app_id,
                "instanceType": args.instance_type, "video": str(video), "image": str(image),
                "nodeInfoList": node_list("dry-run://video", "dry-run://image", args.overrides),
            })
        return 0

    api_key = key_from_args(args)
    if args.task_id:
        task_id = args.task_id
        submission = None
    else:
        video = require_file(args.video, "视频")
        image = require_file(args.image, "图片")
        video_name = upload(video, api_key, args.base_url)
        image_name = upload(image, api_key, args.base_url)
        submission = submit(api_key, args, video_name, image_name)
        task_id = str(submission["taskId"])
        json_print({"event": "submitted", "taskId": task_id, "status": submission.get("taskStatus"), "instanceType": args.instance_type})

    if not args.wait:
        return 0

    deadline = time.monotonic() + args.max_wait_seconds
    while True:
        current = query(api_key, task_id, args.base_url)
        status = result_status(current)
        if status in {"SUCCESS", "FAILED", "CANCELLED", "CANCELED"}:
            data = current.get("data") if isinstance(current.get("data"), dict) else current
            output: dict[str, Any] = {"event": "finished", "taskId": task_id, "status": status, "usage": data.get("usage"), "errorCode": data.get("errorCode"), "errorMessage": data.get("errorMessage")}
            if status == "SUCCESS" and args.download_dir:
                output["downloads"] = download_results(current, Path(args.download_dir).expanduser().resolve())
            json_print(output)
            return 0 if status == "SUCCESS" else 2
        if time.monotonic() >= deadline:
            json_print({"event": "timeout", "taskId": task_id, "status": status})
            return 3
        time.sleep(args.poll_seconds)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
