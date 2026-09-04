#!/usr/bin/env python3
import argparse
import json
import mimetypes
import os
import sys
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


LTX_WORKFLOW_ID = "2057025848015937537"
WAN_WORKFLOW_ID = "2056752570487623681"
DEFAULT_BASE_URL = "https://www.runninghub.cn"
UPLOAD_ENDPOINT = "/task/openapi/upload"
CREATE_ENDPOINT = "/task/openapi/create"
OUTPUTS_ENDPOINT = "/task/openapi/outputs"


def configure_stdio():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def load_dotenv():
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


def default_json_path(kind):
    downloads = Path.home() / "Downloads"
    if kind == "ltx":
        names = [
            "LTX2.3高清超自然电商数字人_api (1).json",
            "LTX2.3高清超自然电商数字人_api.json",
        ]
    else:
        names = [
            "Wan2.2 Animate动作迁移V8（自动尺寸）_api (1).json",
            "Wan2.2 Animate动作迁移V8（自动尺寸）_api.json",
        ]
    for name in names:
        path = downloads / name
        if path.exists():
            return path
    return None


def load_text(value, file_path):
    if file_path:
        return Path(file_path).read_text(encoding="utf-8", errors="replace").strip()
    return value


def host_from_base(base_url):
    return urlparse(base_url).netloc


def json_request(base_url, endpoint, payload, api_key, timeout):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        f"{base_url.rstrip('/')}{endpoint}",
        data=body,
        headers={
            "Host": host_from_base(base_url),
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "codex-runninghub-fruit-video/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        text = response.read().decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


def encode_multipart(fields, file_field, file_path):
    boundary = "----codex-runninghub-" + uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        parts.append(str(value).encode("utf-8"))
        parts.append(b"\r\n")
    path = Path(file_path)
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{path.name}"\r\n'.encode()
    )
    parts.append(f"Content-Type: {mime}\r\n\r\n".encode())
    parts.append(path.read_bytes())
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    return boundary, b"".join(parts)


def upload_file(base_url, api_key, file_path, timeout):
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(str(path))
    boundary, body = encode_multipart({"apiKey": api_key, "fileType": "input"}, "file", path)
    request = Request(
        f"{base_url.rstrip('/')}{UPLOAD_ENDPOINT}",
        data=body,
        headers={
            "Host": host_from_base(base_url),
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "codex-runninghub-fruit-video/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        text = response.read().decode("utf-8", errors="replace")
    result = json.loads(text)
    if result.get("code") != 0:
        raise RuntimeError(f"Upload failed: {json.dumps(result, ensure_ascii=False)}")
    file_name = result.get("data", {}).get("fileName")
    if not file_name:
        raise RuntimeError(f"Upload response missing fileName: {json.dumps(result, ensure_ascii=False)}")
    return file_name


def file_value(base_url, api_key, value, timeout, dry_run=False):
    if not value:
        return None
    if value.startswith(("api/", "http://", "https://")):
        return value
    if dry_run:
        return f"DRY_RUN_UPLOAD:{value}"
    return upload_file(base_url, api_key, value, timeout)


def add_override(items, node_id, field, value):
    if value is None:
        return
    items.append({"nodeId": str(node_id), "fieldName": str(field), "fieldValue": str(value)})


def parse_extra_overrides(values):
    items = []
    for raw in values or []:
        if "=" not in raw or "." not in raw.split("=", 1)[0]:
            raise ValueError("--override must look like nodeId.fieldName=value")
        lhs, value = raw.split("=", 1)
        node_id, field = lhs.split(".", 1)
        add_override(items, node_id, field, value)
    return items


def extract_task_id(response):
    data = response.get("data")
    if isinstance(data, dict):
        for key in ("taskId", "task_id", "id"):
            if key in data:
                return str(data[key])
    for key in ("taskId", "task_id", "id"):
        if key in response:
            return str(response[key])
    return None


def find_urls(value):
    urls = []
    if isinstance(value, str):
        if value.startswith(("http://", "https://")):
            urls.append(value)
    elif isinstance(value, list):
        for item in value:
            urls.extend(find_urls(item))
    elif isinstance(value, dict):
        for item in value.values():
            urls.extend(find_urls(item))
    return list(dict.fromkeys(urls))


def query_outputs(base_url, api_key, task_id, timeout):
    return json_request(base_url, OUTPUTS_ENDPOINT, {"apiKey": api_key, "taskId": task_id}, api_key, timeout)


def poll_outputs(base_url, api_key, task_id, total_timeout, interval, request_timeout):
    deadline = time.time() + total_timeout
    last = {}
    while time.time() < deadline:
        last = query_outputs(base_url, api_key, task_id, request_timeout)
        code = last.get("code")
        data = last.get("data")
        if code == 0 and data:
            return last
        if code == 805:
            return last
        time.sleep(interval)
    return {"timeout": True, "taskId": task_id, "lastResponse": last}


def safe_name(url, index):
    name = Path(urlparse(url).path).name or f"runninghub-result-{index}.bin"
    if "." not in name:
        name += ".bin"
    return name


def download_urls(urls, download_dir, timeout):
    out = Path(download_dir)
    out.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, url in enumerate(urls, start=1):
        request = Request(url, headers={"User-Agent": "codex-runninghub-fruit-video/1.0"})
        with urlopen(request, timeout=timeout) as response:
            data = response.read()
        path = out / safe_name(url, index)
        if path.exists():
            path = out / f"{path.stem}-{index}{path.suffix}"
        path.write_bytes(data)
        saved.append(str(path))
    return saved


def submit_task(args, node_info_list, workflow_id):
    payload = {
        "apiKey": args.api_key,
        "workflowId": workflow_id,
        "nodeInfoList": node_info_list,
    }
    if getattr(args, "workflow_json", None):
        payload["workflow"] = Path(args.workflow_json).read_text(encoding="utf-8", errors="replace")
    if args.add_metadata:
        payload["addMetadata"] = True
    if args.instance_type:
        payload["instanceType"] = args.instance_type
    if args.dry_run:
        safe_payload = dict(payload)
        safe_payload["apiKey"] = "DRY_RUN_API_KEY"
        return {"dryRun": True, "url": f"{args.base_url.rstrip('/')}{CREATE_ENDPOINT}", "payload": safe_payload}
    return json_request(args.base_url, CREATE_ENDPOINT, payload, args.api_key, args.request_timeout)


def finish_result(args, submit_response):
    result = {"submit": sanitize_response(submit_response)}
    task_id = extract_task_id(submit_response)
    if args.wait and task_id:
        outputs = poll_outputs(args.base_url, args.api_key, task_id, args.timeout, args.poll_interval, args.request_timeout)
        result["outputs"] = outputs
        urls = find_urls(outputs)
        if args.download_dir and urls:
            result["downloaded"] = download_urls(urls, args.download_dir, args.request_timeout)
    return result


def sanitize_response(value):
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            if key in {"netWssUrl"}:
                redacted[key] = "[redacted]"
            else:
                redacted[key] = sanitize_response(item)
        return redacted
    if isinstance(value, list):
        return [sanitize_response(item) for item in value]
    return value


def cmd_inspect(args):
    path = Path(args.json_path) if args.json_path else default_json_path(args.workflow)
    if not path or not path.exists():
        raise FileNotFoundError("Workflow API JSON not found.")
    data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    rows = []
    for node_id, node in data.items():
        inputs = node.get("inputs", {})
        rows.append(
            {
                "nodeId": str(node_id),
                "classType": node.get("class_type"),
                "title": node.get("_meta", {}).get("title"),
                "fields": list(inputs.keys()),
            }
        )
    print(json.dumps({"json": str(path), "nodes": rows}, ensure_ascii=False, indent=2))


def cmd_run_ltx(args):
    image = file_value(args.base_url, args.api_key, args.image, args.request_timeout, args.dry_run)
    audio = file_value(args.base_url, args.api_key, args.audio, args.request_timeout, args.dry_run)
    identity_prompt = load_text(args.identity_prompt, args.identity_prompt_file)
    motion_prompts = load_text(args.motion_prompts, args.motion_prompts_file)
    negative_prompt = load_text(args.negative_prompt, args.negative_prompt_file)
    node_info = []
    add_override(node_info, 14, "image", image)
    add_override(node_info, 39, "audio", audio)
    add_override(node_info, 169, "text", identity_prompt)
    add_override(node_info, 170, "text", motion_prompts)
    add_override(node_info, 186, "text", args.segment_lengths)
    add_override(node_info, 60, "text", negative_prompt)
    add_override(node_info, 91, "noise_seed", args.seed)
    add_override(node_info, 167, "value", args.width)
    add_override(node_info, 168, "value", args.height)
    add_override(node_info, 185, "value", args.epsilon)
    node_info.extend(parse_extra_overrides(args.override))
    submit_response = submit_task(args, node_info, args.workflow_id)
    print(json.dumps(finish_result(args, submit_response), ensure_ascii=False, indent=2))


def cmd_run_wan(args):
    image = file_value(args.base_url, args.api_key, args.image, args.request_timeout, args.dry_run)
    video = file_value(args.base_url, args.api_key, args.video, args.request_timeout, args.dry_run)
    positive = load_text(args.positive_prompt, args.positive_prompt_file)
    negative = load_text(args.negative_prompt, args.negative_prompt_file)
    node_info = []
    add_override(node_info, 299, "image", image)
    add_override(node_info, 275, "video", video)
    add_override(node_info, 278, "positive_prompt", positive)
    add_override(node_info, 278, "negative_prompt", negative)
    add_override(node_info, 262, "text", args.aspect_ratio)
    add_override(node_info, 269, "text", args.alt_aspect_ratio)
    add_override(node_info, 264, "value", args.fps)
    add_override(node_info, 300, "value", args.frame_load_cap)
    add_override(node_info, 316, "value", args.width)
    add_override(node_info, 317, "value", args.height)
    add_override(node_info, 367, "seed", args.seed)
    add_override(node_info, 367, "steps", args.steps)
    node_info.extend(parse_extra_overrides(args.override))
    submit_response = submit_task(args, node_info, args.workflow_id)
    print(json.dumps(finish_result(args, submit_response), ensure_ascii=False, indent=2))


def cmd_query(args):
    outputs = poll_outputs(args.base_url, args.api_key, args.task_id, args.timeout, args.poll_interval, args.request_timeout) if args.wait else query_outputs(args.base_url, args.api_key, args.task_id, args.request_timeout)
    result = {"outputs": outputs}
    urls = find_urls(outputs)
    if args.download_dir and urls:
        result["downloaded"] = download_urls(urls, args.download_dir, args.request_timeout)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def add_common(parser):
    parser.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    parser.add_argument("--api-key")
    parser.add_argument("--request-timeout", type=int, default=120)
    parser.add_argument("--timeout", type=int, default=1200)
    parser.add_argument("--poll-interval", type=int, default=8)
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--download-dir")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--add-metadata", action="store_true")
    parser.add_argument("--instance-type")
    parser.add_argument("--workflow-json")
    parser.add_argument("--override", action="append", help="Extra override like 367.seed=123")


def parse_args():
    parser = argparse.ArgumentParser(description="Run fruit commerce RunningHub workflows.")
    sub = parser.add_subparsers(dest="command", required=True)

    inspect = sub.add_parser("inspect")
    inspect.add_argument("--workflow", choices=["ltx", "wan"], required=True)
    inspect.add_argument("--json-path")
    inspect.set_defaults(func=cmd_inspect)

    ltx = sub.add_parser("run-ltx")
    add_common(ltx)
    ltx.add_argument("--workflow-id", default=LTX_WORKFLOW_ID)
    ltx.add_argument("--image", required=True)
    ltx.add_argument("--audio", required=True)
    ltx.add_argument("--identity-prompt")
    ltx.add_argument("--identity-prompt-file")
    ltx.add_argument("--motion-prompts")
    ltx.add_argument("--motion-prompts-file")
    ltx.add_argument("--segment-lengths")
    ltx.add_argument("--negative-prompt")
    ltx.add_argument("--negative-prompt-file")
    ltx.add_argument("--seed")
    ltx.add_argument("--width", default="1280")
    ltx.add_argument("--height", default="720")
    ltx.add_argument("--epsilon", default="0.5")
    ltx.set_defaults(func=cmd_run_ltx)

    wan = sub.add_parser("run-wan")
    add_common(wan)
    wan.add_argument("--workflow-id", default=WAN_WORKFLOW_ID)
    wan.add_argument("--image", required=True)
    wan.add_argument("--video", required=True)
    wan.add_argument("--positive-prompt", default="best quality, natural fruit livestream host, fresh fruit visible, vertical mobile short video")
    wan.add_argument("--positive-prompt-file")
    wan.add_argument("--negative-prompt", default="overexposed, blurry, deformed hands, extra fingers, wrong face, fruit disappearing, watermark, text, logo, messy background")
    wan.add_argument("--negative-prompt-file")
    wan.add_argument("--aspect-ratio", default="9:16")
    wan.add_argument("--alt-aspect-ratio", default="16:9")
    wan.add_argument("--fps", default="25")
    wan.add_argument("--frame-load-cap", default="960")
    wan.add_argument("--width", default="720")
    wan.add_argument("--height", default="1280")
    wan.add_argument("--seed")
    wan.add_argument("--steps")
    wan.set_defaults(func=cmd_run_wan)

    query = sub.add_parser("query")
    query.add_argument("--task-id", required=True)
    query.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", DEFAULT_BASE_URL))
    query.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    query.add_argument("--api-key")
    query.add_argument("--request-timeout", type=int, default=120)
    query.add_argument("--timeout", type=int, default=1200)
    query.add_argument("--poll-interval", type=int, default=8)
    query.add_argument("--wait", action="store_true")
    query.add_argument("--download-dir")
    query.set_defaults(func=cmd_query)

    return parser.parse_args()


def main():
    configure_stdio()
    load_dotenv()
    args = parse_args()
    if getattr(args, "command", "") != "inspect":
        args.api_key = (args.api_key or os.getenv(args.api_key_env, "")).strip()
        if not args.api_key and not getattr(args, "dry_run", False):
            print(f"Missing {args.api_key_env}. Set it in .env or environment.", file=sys.stderr)
            return 2
        if not args.api_key:
            args.api_key = "DRY_RUN_API_KEY"
    try:
        args.func(args)
        return 0
    except (HTTPError, URLError, OSError, RuntimeError, ValueError, FileNotFoundError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
