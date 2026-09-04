#!/usr/bin/env python3
"""Run registered RunningHub MiniMax H3 video channels."""

from __future__ import annotations

import argparse
import importlib.util
import json
import mimetypes
import os
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


BASE_URL = "https://www.runninghub.cn"
UPLOAD_ENDPOINT = "/openapi/v2/media/upload/binary"
QUERY_ENDPOINT = "/openapi/v2/query"
REGISTRY_PATH = Path(__file__).resolve().parents[1] / "references" / "channel-registry.json"


def load_registry() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


REGISTRY = load_registry()
CHANNELS = REGISTRY["channels"]


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def load_dotenv() -> None:
    """Load the nearest project value without overwriting an explicit environment value."""
    cwd = Path.cwd().resolve()
    skill_dir = Path(__file__).resolve().parents[1]
    for base in [cwd, *cwd.parents, skill_dir]:
        env_file = base / ".env"
        if not env_file.exists():
            continue
        for raw in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def json_request(base_url: str, endpoint: str, payload: dict, api_key: str, timeout: int) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        f"{base_url.rstrip('/')}{endpoint}",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "codex-minimaxh3skill/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw}
    return value if isinstance(value, dict) else {"data": value}


def encode_multipart(fields: dict, file_path: str) -> tuple[str, bytes]:
    boundary = "----codex-runninghub-" + uuid.uuid4().hex
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    path = Path(file_path)
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    parts.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'.encode(),
            f"Content-Type: {mime}\r\n\r\n".encode(),
            path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return boundary, b"".join(parts)


def upload_file(base_url: str, api_key: str, file_path: str, timeout: int) -> str:
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(str(path))
    boundary, body = encode_multipart({}, str(path))
    request = Request(
        f"{base_url.rstrip('/')}{UPLOAD_ENDPOINT}",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "codex-minimaxh3skill/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        result = json.loads(response.read().decode("utf-8", errors="replace"))
    if result.get("code") not in (0, "0"):
        raise RuntimeError(f"RunningHub upload failed: {json.dumps(result, ensure_ascii=False)}")
    data = result.get("data") or {}
    file_name = data.get("fileName") or data.get("fileUrl") or data.get("url")
    if not file_name:
        raise RuntimeError("RunningHub upload response did not contain data.fileName")
    return str(file_name)


def resolve_file_value(value: object, args: argparse.Namespace) -> object:
    if not isinstance(value, str) or not value:
        return value
    if re.match(r"^(https?://|api/|data:)", value):
        return value
    path = Path(value)
    if not path.exists():
        return value
    if args.dry_run:
        return f"DRY_RUN_UPLOAD:{path}"
    return upload_file(args.base_url, args.api_key, str(path), args.request_timeout)


def parse_input_expression(raw: str) -> dict:
    if "=" not in raw or "." not in raw.split("=", 1)[0]:
        raise ValueError(f"Invalid --input {raw!r}; use nodeId.fieldName=value")
    lhs, value = raw.split("=", 1)
    node_id, field_name = lhs.split(".", 1)
    if not node_id or not field_name:
        raise ValueError(f"Invalid --input {raw!r}; nodeId and fieldName are required")
    return {"nodeId": node_id, "fieldName": field_name, "fieldValue": value}


def normalize_input_file(path: str) -> list[dict]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        items = []
        for key, value in raw.items():
            if "." not in key:
                raise ValueError(f"Input mapping key must be nodeId.fieldName: {key}")
            node_id, field_name = key.split(".", 1)
            items.append({"nodeId": node_id, "fieldName": field_name, "fieldValue": value})
    else:
        raise ValueError("--input-file must contain a JSON list or mapping")
    normalized = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Every input item must be an object")
        if not {"nodeId", "fieldName", "fieldValue"}.issubset(item):
            raise ValueError("Every input item needs nodeId, fieldName, and fieldValue")
        normalized.append(
            {
                "nodeId": str(item["nodeId"]),
                "fieldName": str(item["fieldName"]),
                "fieldValue": item["fieldValue"],
            }
        )
    return normalized


def add_or_replace(items: list[dict], node_id: str, field_name: str, value: object) -> None:
    for item in items:
        if item["nodeId"] == str(node_id) and item["fieldName"] == field_name:
            item["fieldValue"] = value
            return
    items.append({"nodeId": str(node_id), "fieldName": field_name, "fieldValue": value})


def add_advanced_inputs(args: argparse.Namespace, items: list[dict], nodes: dict[str, str]) -> None:
    """Add exported-workflow controls shared by the advanced H3 reference channels."""
    controls = (
        ("ref_image_size", "reference", "ref_image_size"),
        ("seed", "sampler", "seed"),
        ("sigma_points", "sampler", "sigma_points"),
        ("video_shift", "sampler", "video_shift"),
        ("audio_shift", "sampler", "audio_shift"),
        ("accel", "sampler", "accel"),
        ("denoise_video", "sampler", "denoise_video"),
        ("cache_dit_rdt", "sampler", "cache_dit_rdt"),
        ("cache_dit_mc", "sampler", "cache_dit_mc"),
        ("cache_dit_warmup", "sampler", "cache_dit_warmup"),
        ("velocity_stride", "sampler", "velocity_stride"),
        ("fps", "create_video", "fps"),
        ("bit_depth", "create_video", "bit_depth"),
        ("filename_prefix", "save_video", "filename_prefix"),
        ("output_format", "save_video", "format"),
        ("codec", "save_video", "codec"),
    )
    for argument, node_role, field_name in controls:
        value = getattr(args, argument, None)
        if value is not None:
            add_or_replace(items, nodes[node_role], field_name, value)


def build_inputs(args: argparse.Namespace) -> list[dict]:
    items: list[dict] = []
    if args.input_file:
        items.extend(normalize_input_file(args.input_file))
    for raw in args.input or []:
        parsed = parse_input_expression(raw)
        add_or_replace(items, parsed["nodeId"], parsed["fieldName"], parsed["fieldValue"])

    if CHANNELS[args.channel].get("reference_image_nodes"):
        reference_images = args.reference_image or []
        expected_nodes = tuple(CHANNELS[args.channel].get("reference_image_nodes") or ("4", "19", "20"))
        if reference_images and len(reference_images) != len(expected_nodes):
            raise ValueError(f"{args.channel} needs exactly {len(expected_nodes)} --reference-image files")
        if reference_images:
            for node_id, image in zip(expected_nodes, reference_images, strict=True):
                add_or_replace(items, node_id, "image", image)
        elif not all(any(item["nodeId"] == node_id and item["fieldName"] == "image" for item in items) for node_id in expected_nodes):
            needed = ", ".join(f"{node_id}.image" for node_id in expected_nodes)
            raise ValueError(f"{args.channel} needs {len(expected_nodes)} --reference-image files or explicit {needed} inputs")
        if args.aspect_ratio:
            add_or_replace(items, "6", "aspect_ratio", args.aspect_ratio)
        if args.duration is not None:
            add_or_replace(items, "6", "duration_seconds", args.duration)
        if args.width is not None:
            add_or_replace(items, "6", "width", args.width)
        if args.height is not None:
            add_or_replace(items, "6", "height", args.height)
        if args.prompt:
            add_or_replace(items, CHANNELS[args.channel].get("prompt_node", "7"), "prompt", args.prompt)
        audio_node = CHANNELS[args.channel].get("audio_node")
        if args.audio and audio_node:
            add_or_replace(items, audio_node, "audio", args.audio)
        elif args.audio:
            raise ValueError(f"{args.channel} does not accept --audio")
        add_advanced_inputs(
            args,
            items,
            {
                "reference": CHANNELS[args.channel].get("prompt_node", "7"),
                "sampler": CHANNELS[args.channel].get("sampler_node", "9"),
                "create_video": CHANNELS[args.channel].get("create_video_node", "11"),
                "save_video": CHANNELS[args.channel].get("save_video_node", "12"),
            },
        )
    elif args.channel == "image-audio":
        if args.image:
            add_or_replace(items, "4", "image", args.image)
        if args.audio:
            add_or_replace(items, "6", "audio", args.audio)
        if args.aspect_ratio:
            add_or_replace(items, "8", "aspect_ratio", args.aspect_ratio)
        if args.duration is not None:
            add_or_replace(items, "8", "duration_seconds", args.duration)
        if args.width is not None:
            add_or_replace(items, "8", "width", args.width)
        if args.height is not None:
            add_or_replace(items, "8", "height", args.height)
        if args.prompt:
            add_or_replace(items, "9", "prompt", args.prompt)
        add_advanced_inputs(
            args,
            items,
            {"reference": "9", "sampler": "11", "create_video": "13", "save_video": "14"},
        )
    elif args.channel == "text":
        if args.aspect_ratio:
            add_or_replace(items, "4", "aspect_ratio", args.aspect_ratio)
        if args.duration is not None:
            add_or_replace(items, "4", "duration_seconds", args.duration)
        if args.width is not None:
            add_or_replace(items, "4", "width", args.width)
        if args.height is not None:
            add_or_replace(items, "4", "height", args.height)
        if args.prompt:
            add_or_replace(items, "5", "prompt", args.prompt)
    elif args.channel == "first-last":
        if args.first_image:
            add_or_replace(items, "6", "image", args.first_image)
        if args.last_image:
            add_or_replace(items, "4", "image", args.last_image)
        if args.duration is not None:
            add_or_replace(items, "7", "duration_seconds", args.duration)
        if args.aspect_ratio:
            add_or_replace(items, "7", "aspect_ratio", args.aspect_ratio)
        if args.width is not None:
            add_or_replace(items, "7", "width", args.width)
        if args.height is not None:
            add_or_replace(items, "7", "height", args.height)
        if args.prompt:
            add_or_replace(items, "8", "prompt", args.prompt)
    elif args.channel == "last-frame":
        if args.image:
            add_or_replace(items, "4", "image", args.image)
        if args.duration is not None:
            add_or_replace(items, "6", "duration_seconds", args.duration)
        if args.aspect_ratio:
            add_or_replace(items, "6", "aspect_ratio", args.aspect_ratio)
        if args.width is not None:
            add_or_replace(items, "6", "width", args.width)
        if args.height is not None:
            add_or_replace(items, "6", "height", args.height)
        if args.prompt:
            add_or_replace(items, "7", "prompt", args.prompt)
    elif args.prompt:
        if not args.prompt_node:
            raise ValueError("This channel needs --prompt-node nodeId.fieldName when --prompt is used")
        node_id, field_name = args.prompt_node.split(".", 1) if "." in args.prompt_node else (None, None)
        if not node_id or not field_name:
            raise ValueError("--prompt-node must look like nodeId.fieldName")
        add_or_replace(items, node_id, field_name, args.prompt)

    if not items:
        raise ValueError("No inputs. Use --input, --input-file, or the image-audio shortcuts.")
    return items


def extract_task_id(value: object) -> str | None:
    if isinstance(value, dict):
        for key in ("taskId", "task_id", "id"):
            if value.get(key) is not None:
                return str(value[key])
        for nested in value.values():
            found = extract_task_id(nested)
            if found:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = extract_task_id(nested)
            if found:
                return found
    return None


def find_urls(value: object) -> list[str]:
    found: list[str] = []
    if isinstance(value, str) and value.startswith(("http://", "https://")):
        found.append(value)
    elif isinstance(value, dict):
        for nested in value.values():
            found.extend(find_urls(nested))
    elif isinstance(value, list):
        for nested in value:
            found.extend(find_urls(nested))
    return list(dict.fromkeys(found))


def find_usage(value: object) -> dict | None:
    """Return the first task usage object from a query response."""
    if isinstance(value, dict):
        usage = value.get("usage")
        if isinstance(usage, dict):
            return usage
        for nested in value.values():
            found = find_usage(nested)
            if found is not None:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = find_usage(nested)
            if found is not None:
                return found
    return None


def is_positive_number(value: object) -> bool:
    try:
        return float(str(value).strip()) > 0
    except (TypeError, ValueError):
        return False


def is_empty_or_zero(value: object) -> bool:
    if value in (None, ""):
        return True
    try:
        return float(str(value).strip()) == 0
    except (TypeError, ValueError):
        return False


def validate_billing(channel: dict, outputs: dict) -> None:
    contract = channel.get("billing_contract") or {}
    if contract.get("mode") != "rh_coins_only":
        return
    usage = find_usage(outputs)
    if not usage:
        raise RuntimeError("RH 币结算校验失败：任务回执未返回 usage")
    if not is_positive_number(usage.get("consumeCoins")) or not is_empty_or_zero(usage.get("consumeMoney")):
        raise RuntimeError("RH 币结算校验失败：需要 consumeCoins 为正数且 consumeMoney 为空或 0；任务未被报告为合格交付")


def query_task(args: argparse.Namespace, task_id: str) -> dict:
    return json_request(
        args.base_url,
        QUERY_ENDPOINT,
        {"taskId": task_id},
        args.api_key,
        args.request_timeout,
    )


def poll_task(args: argparse.Namespace, task_id: str) -> dict:
    deadline = time.time() + args.timeout
    last: dict = {}
    while time.time() < deadline:
        last = query_task(args, task_id)
        status = str((last.get("data") or last).get("status", "")).upper() if isinstance((last.get("data") or last), dict) else ""
        if status in {"SUCCESS", "FAILED", "REJECTED", "CANCELLED", "ERROR"}:
            return last
        if find_urls(last):
            return last
        time.sleep(args.poll_interval)
    return {"timeout": True, "taskId": task_id, "lastResponse": last}


def safe_name(url: str, index: int) -> str:
    name = Path(urlparse(url).path).name or f"minimaxh3-result-{index}.bin"
    if "." not in name:
        name += ".bin"
    return name


def download_urls(urls: list[str], download_dir: str, timeout: int) -> list[str]:
    out = Path(download_dir)
    out.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, url in enumerate(urls, start=1):
        request = Request(url, headers={"User-Agent": "codex-minimaxh3skill/1.0"})
        with urlopen(request, timeout=timeout) as response:
            data = response.read()
        path = out / safe_name(url, index)
        if path.exists():
            path = out / f"{path.stem}-{index}{path.suffix}"
        path.write_bytes(data)
        if len(data) < 1024 or data[:200].lstrip().lower().startswith(b"<html"):
            raise RuntimeError(f"Downloaded output does not look like a video file: {path}")
        saved.append(str(path))
    return saved


def save_task_record(args: argparse.Namespace, task_id: str, response: dict) -> str | None:
    """Persist the recovery key before a potentially long poll/download phase."""
    if not args.download_dir:
        return None
    out = Path(args.download_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"minimaxh3-task-{task_id}.json"
    path.write_text(
        json.dumps(
            {"taskId": task_id, "channel": args.channel, "endpoint": CHANNELS[args.channel]["endpoint"], "submit": redact(response)},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return str(path)


def redact(value: object) -> object:
    if isinstance(value, dict):
        return {k: ("[redacted]" if k.lower() in {"apikey", "authorization"} else redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def cmd_list(_: argparse.Namespace) -> None:
    print(json.dumps({"priority": REGISTRY["priority"], "channels": CHANNELS}, ensure_ascii=False, indent=2))


def load_step04_prompt_validator():
    """Load the shared provider-free validator without making the H3 Skill own it."""
    candidates = [
        Path.home() / ".codex" / "skills" / "mx-shortdrama-production-harness" / "scripts" / "validate_step04_prompt_contract.py",
    ]
    for path in candidates:
        if path.is_file():
            spec = importlib.util.spec_from_file_location("mx_shortdrama_step04_prompt_validator", path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                return module
    raise RuntimeError("缺少 Step04 语义合同校验器，禁止提交 MiniMax H3")


def run_step04_prompt_precheck(args: argparse.Namespace) -> None:
    """Block a paid task before upload when its Step04 evidence contract is absent or invalid."""
    supplied = any((args.step02_manifest, args.step04_ir, args.group_id, args.source_start_ms is not None, args.source_end_ms is not None))
    if not supplied:
        if args.dry_run:
            return
        raise RuntimeError("H3_SEMANTIC_CONTRACT_REQUIRED: 正式提交必须提供 --step02-manifest、--step04-ir、--group-id")
    if not args.step02_manifest or not args.step04_ir or not args.group_id:
        raise RuntimeError("H3_SEMANTIC_CONTRACT_INCOMPLETE: --step02-manifest、--step04-ir、--group-id 必须同时提供")
    validator = load_step04_prompt_validator()
    prompt = args.prompt
    failures = validator.validate_paths(
        args.step02_manifest,
        args.step04_ir,
        args.group_id,
        prompt=prompt,
        source_start_ms=args.source_start_ms,
        source_end_ms=args.source_end_ms,
    )
    if failures:
        first_codes = ", ".join(sorted({str(row.get("code")) for row in failures}))
        raise RuntimeError(f"H3_SEMANTIC_CONTRACT_BLOCKED: {first_codes}")


def cmd_submit(args: argparse.Namespace) -> None:
    channel = CHANNELS[args.channel]
    requested_instance = (args.instance_type or "ultra").strip().lower()
    if requested_instance != "ultra":
        raise ValueError("MiniMax H3 正式提交固定使用 instanceType=ultra；不会自动降级实例类型")
    args.instance_type = "ultra"
    args.api_key = (args.api_key or os.getenv(args.api_key_env, "")).strip()
    if not args.api_key and not args.dry_run:
        raise RuntimeError(f"Missing {args.api_key_env}; set it in .env or the environment")
    args.api_key = args.api_key or "DRY_RUN_API_KEY"
    run_step04_prompt_precheck(args)
    inputs = build_inputs(args)
    prompt_fields = [item for item in inputs if item.get("fieldName") == "prompt"]
    if not prompt_fields or not any(str(item.get("fieldValue", "")).strip() for item in prompt_fields):
        raise ValueError("MiniMax H3 正式提交必须显式提供对应 VG 生视频提示词；禁止使用工作流里的样例提示词")
    resolved = [
        {**item, "fieldValue": resolve_file_value(item["fieldValue"], args)}
        for item in inputs
    ]
    payload = {"nodeInfoList": resolved}
    if args.instance_type:
        payload["instanceType"] = args.instance_type
    if args.webhook_url:
        payload["webhookUrl"] = args.webhook_url
    if args.dry_run:
        print(json.dumps(redact({"channel": args.channel, "endpoint": channel["endpoint"], "payload": payload}), ensure_ascii=False, indent=2))
        return
    response = json_request(args.base_url, channel["endpoint"], payload, args.api_key, args.request_timeout)
    error_code = response.get("errorCode") or response.get("code")
    error_message = response.get("errorMessage") or response.get("msg")
    if error_code not in (None, "", 0, "0") or (error_message and str(error_message).lower() not in {"success", "ok"}):
        raise RuntimeError(f"RunningHub submission failed ({error_code or 'unknown'}): {error_message or 'no message'}")
    result = {"channel": args.channel, "endpoint": channel["endpoint"], "submit": redact(response)}
    task_id = extract_task_id(response)
    if task_id:
        result["taskId"] = task_id
        task_record = save_task_record(args, task_id, response)
        if task_record:
            result["taskRecord"] = task_record
    if args.wait and task_id:
        outputs = poll_task(args, task_id)
        result["outputs"] = redact(outputs)
        validate_billing(channel, outputs)
        urls = find_urls(outputs)
        if args.download_dir and urls:
            result["downloaded"] = download_urls(urls, args.download_dir, args.request_timeout)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_query(args: argparse.Namespace) -> None:
    args.api_key = (args.api_key or os.getenv(args.api_key_env, "")).strip()
    if not args.api_key:
        raise RuntimeError(f"Missing {args.api_key_env}; set it in .env or the environment")
    outputs = poll_task(args, args.task_id) if args.wait else query_task(args, args.task_id)
    if args.channel:
        validate_billing(CHANNELS[args.channel], outputs)
    result = {"taskId": args.task_id, "outputs": redact(outputs)}
    urls = find_urls(outputs)
    if args.download_dir and urls:
        result["downloaded"] = download_urls(urls, args.download_dir, args.request_timeout)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def add_network_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", BASE_URL))
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    parser.add_argument("--api-key")
    parser.add_argument("--request-timeout", type=int, default=120)
    parser.add_argument("--timeout", type=int, default=1200)
    parser.add_argument("--poll-interval", type=int, default=8)
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--download-dir")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run RunningHub MiniMax H3 FL2VA channels.")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list").set_defaults(func=cmd_list)

    submit = sub.add_parser("submit")
    submit.add_argument("--channel", choices=sorted(CHANNELS), required=True)
    submit.add_argument("--input", action="append", help="nodeId.fieldName=value; repeatable")
    submit.add_argument("--input-file")
    submit.add_argument("--prompt")
    submit.add_argument("--prompt-node", help="nodeId.fieldName for --prompt on non image-audio channels")
    submit.add_argument("--image")
    submit.add_argument("--audio")
    submit.add_argument("--first-image")
    submit.add_argument("--last-image")
    submit.add_argument("--reference-image", action="append", help="Reference image for multi-image; provide exactly three")
    submit.add_argument("--aspect-ratio")
    submit.add_argument("--duration", type=float)
    submit.add_argument("--width", type=int)
    submit.add_argument("--height", type=int)
    submit.add_argument("--ref-image-size", help="Exported workflow reference-image size strategy")
    submit.add_argument("--seed", type=int, help="Exported workflow sampler seed")
    submit.add_argument("--sigma-points", type=int, help="Exported workflow sampler sigma points")
    submit.add_argument("--video-shift", type=float, help="Exported workflow sampler video shift")
    submit.add_argument("--audio-shift", type=float, help="Exported workflow sampler audio shift")
    submit.add_argument("--accel", help="Exported workflow sampler acceleration strategy")
    submit.add_argument("--denoise-video", action="store_true", default=None, help="Enable exported workflow video denoise")
    submit.add_argument("--no-denoise-video", action="store_false", dest="denoise_video", help="Disable exported workflow video denoise")
    submit.add_argument("--cache-dit-rdt", type=float, help="Exported workflow DiT cache RDT setting")
    submit.add_argument("--cache-dit-mc", type=int, help="Exported workflow DiT cache MC setting")
    submit.add_argument("--cache-dit-warmup", type=int, help="Exported workflow DiT cache warmup setting")
    submit.add_argument("--velocity-stride", type=int, help="Exported workflow velocity stride setting")
    submit.add_argument("--fps", type=float, help="Output video frames per second")
    submit.add_argument("--bit-depth", type=int, help="Output video bit depth")
    submit.add_argument("--filename-prefix", help="Output filename prefix")
    submit.add_argument("--output-format", help="Output container format")
    submit.add_argument("--codec", help="Output video codec")
    submit.add_argument("--instance-type")
    submit.add_argument("--webhook-url")
    submit.add_argument("--step02-manifest", help="已验收 Step02 语义 manifest；正式提交必填")
    submit.add_argument("--step04-ir", help="Step04 C 层 prompt IR；正式提交必填")
    submit.add_argument("--group-id", help="当前 VG 生产组，例如 VG02；正式提交必填")
    submit.add_argument("--source-start-ms", type=int, help="权威生产组源区间起点")
    submit.add_argument("--source-end-ms", type=int, help="权威生产组源区间终点")
    submit.add_argument("--dry-run", action="store_true")
    add_network_args(submit)
    submit.set_defaults(func=cmd_submit)

    query = sub.add_parser("query")
    query.add_argument("--task-id", required=True)
    query.add_argument("--channel", choices=sorted(CHANNELS), help="Apply the channel billing contract when reading a completed task")
    add_network_args(query)
    query.set_defaults(func=cmd_query)
    return parser.parse_args()


def main() -> int:
    configure_stdio()
    load_dotenv()
    args = parse_args()
    try:
        args.func(args)
        return 0
    except (HTTPError, URLError, OSError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
