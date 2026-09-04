import argparse
import hashlib
import http.client
import json
import os
import struct
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


LOW_ENDPOINT = "/openapi/v2/rhart-image-g-2/text-to-image"
QUERY_ENDPOINT = "/openapi/v2/query"


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def load_dotenv() -> None:
    cwd = Path.cwd().resolve()
    for base in [cwd, *cwd.parents, Path(__file__).resolve().parents[1]]:
        env_file = base / ".env"
        if not env_file.exists():
            continue
        for raw_line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        return Path(args.prompt_file).read_text(encoding="utf-8", errors="replace").strip()
    if args.prompt:
        return args.prompt.strip()
    raise ValueError("Provide --prompt or --prompt-file.")


def post_json_detailed(url: str, payload: dict, api_key: str, timeout: int) -> tuple[dict, dict]:
    """Post with a receipt trace so a timeout is never mistaken for no submission."""
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("RunningHub endpoint must be an HTTPS URL.")
    path = parsed.path + (("?" + parsed.query) if parsed.query else "")
    started = time.monotonic()
    connection = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=timeout)
    connection.putrequest("POST", path)
    connection.putheader("Authorization", f"Bearer {api_key}")
    connection.putheader("Content-Type", "application/json")
    connection.putheader("Accept", "application/json")
    connection.putheader("User-Agent", "codex-runninghub-image2-text/1.1")
    connection.putheader("Content-Length", str(len(body)))
    connection.endheaders(body)
    response = connection.getresponse()
    headers_elapsed_ms = round((time.monotonic() - started) * 1000)
    raw = response.read()
    trace = {
        "http_status": response.status,
        "content_length_sent": len(body),
        "headers_elapsed_ms": headers_elapsed_ms,
        "response_bytes": len(raw),
        "response_content_type": response.getheader("Content-Type"),
        "response_request_id": response.getheader("X-Request-Id"),
    }
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text), trace
    except json.JSONDecodeError:
        return {"raw": text}, trace


def post_json(url: str, payload: dict, api_key: str, timeout: int) -> dict:
    response, _ = post_json_detailed(url, payload, api_key, timeout)
    return response


def extract_task_id(response: dict) -> str | None:
    candidates = [response]
    data = response.get("data")
    if isinstance(data, dict):
        candidates.append(data)
    for item in candidates:
        for key in ("taskId", "task_id", "id"):
            value = item.get(key)
            if isinstance(value, (str, int)):
                return str(value)
    return None


def find_image_urls(value) -> list[str]:
    urls: list[str] = []
    if isinstance(value, str):
        lower = value.lower()
        if value.startswith(("http://", "https://")) and any(ext in lower for ext in (".png", ".jpg", ".jpeg", ".webp")):
            urls.append(value)
    elif isinstance(value, list):
        for item in value:
            urls.extend(find_image_urls(item))
    elif isinstance(value, dict):
        for item in value.values():
            urls.extend(find_image_urls(item))
    return list(dict.fromkeys(urls))


def looks_finished(response: dict) -> bool:
    status_text = json.dumps(response, ensure_ascii=False).lower()
    if find_image_urls(response):
        return True
    return any(word in status_text for word in ("success", "succeeded", "completed", "finish"))


def poll_result(base_url: str, task_id: str, api_key: str, timeout: int, poll_interval: int, request_timeout: int) -> dict:
    deadline = time.time() + timeout
    last_response: dict = {}
    while time.time() < deadline:
        try:
            last_response = post_json(f"{base_url.rstrip('/')}{QUERY_ENDPOINT}", {"taskId": task_id}, api_key, request_timeout)
        except (URLError, TimeoutError, OSError) as exc:
            last_response = {"taskId": task_id, "transientQueryError": str(exc)}
            time.sleep(poll_interval)
            continue
        if looks_finished(last_response):
            return last_response
        time.sleep(poll_interval)
    return {"timeout": True, "taskId": task_id, "lastResponse": last_response}


def safe_filename(url: str, index: int) -> str:
    name = Path(urlparse(url).path).name or f"runninghub-image2-text-{index}.png"
    if "." not in name:
        name = f"{name}.png"
    return name


def download_urls(urls: list[str], output_dir: Path, request_timeout: int) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []
    for index, url in enumerate(urls, start=1):
        request = Request(url, headers={"User-Agent": "codex-runninghub-image2-text/1.0"})
        with urlopen(request, timeout=request_timeout) as response:
            data = response.read()
        path = output_dir / safe_filename(url, index)
        if path.exists():
            path = output_dir / f"{path.stem}-{index}{path.suffix}"
        path.write_bytes(data)
        saved.append(str(path))
    return saved


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_dimensions(path: Path) -> tuple[int | None, int | None]:
    """Read dimensions from common provider output headers without a GUI runtime."""
    data = path.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP" and len(data) >= 30 and data[12:16] == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    if data[:2] == b"\xff\xd8":
        index = 2
        while index + 9 < len(data):
            if data[index] != 0xFF:
                index += 1
                continue
            marker = data[index + 1]
            index += 2
            if marker in (0xD8, 0xD9):
                continue
            if index + 2 > len(data):
                break
            segment_length = int.from_bytes(data[index:index + 2], "big")
            if marker in range(0xC0, 0xC4) or marker in range(0xC5, 0xC8) or marker in range(0xC9, 0xCC) or marker in range(0xCD, 0xD0):
                if index + 7 <= len(data):
                    return int.from_bytes(data[index + 5:index + 7], "big"), int.from_bytes(data[index + 3:index + 5], "big")
            index += max(segment_length, 2)
    return None, None


def write_submit_log(log_dir: str | None, payload: dict, submit_response: dict, provider_task_id: str | None, asset_stage: str, job_id: str, asset_id: str) -> str | None:
    """Persist the immutable submitted prompt before any polling/download."""
    if not log_dir:
        return None
    output_dir = Path(log_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"runninghub_text_submit_{time.strftime('%Y%m%d_%H%M%S')}_{provider_task_id or 'no_task_id'}.json"
    actual_prompt = str(payload.get("prompt") or "")
    record = {
        "schema_version": "runninghub_text_submit_receipt_v2",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "job_id": job_id,
        "asset_id": asset_id,
        "asset_stage": asset_stage,
        "task_id": provider_task_id,
        "actual_prompt": actual_prompt,
        "actual_prompt_sha256": hashlib.sha256(actual_prompt.encode("utf-8")).hexdigest(),
        "payload": payload,
        "submit": submit_response,
    }
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return str(path.resolve())


def write_download_receipt(output_dir: Path, downloaded: list[str], task_id: str | None, prompt: str, asset_stage: str, job_id: str = "", asset_id: str = "") -> str:
    files = []
    for raw_path in downloaded:
        path = Path(raw_path).resolve()
        width, height = image_dimensions(path)
        files.append({
            "exact_path": str(path),
            "sha256": file_sha256(path),
            "bytes": path.stat().st_size,
            "width": width,
            "height": height,
            "qa": {
                "exists": path.is_file(),
                "non_empty": path.stat().st_size > 0,
                "dimensions_present": width is not None and height is not None,
                "status": "passed" if path.is_file() and path.stat().st_size > 0 and width and height else "failed",
            },
        })
    receipt = {
        "schema_version": "runninghub_image_download_receipt_v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "asset_stage": asset_stage,
        "job_id": job_id,
        "asset_id": asset_id,
        "task_id": task_id,
        "actual_prompt": prompt,
        "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "prompt": prompt,
        "files": files,
        "qa_status": "passed" if files and all(item["qa"]["status"] == "passed" for item in files) else "failed",
    }
    receipt_path = output_dir / "asset_download_receipt.json"
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return str(receipt_path.resolve())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Submit RunningHub Image G 2.0 text-to-image jobs.")
    parser.add_argument("--prompt")
    parser.add_argument("--prompt-file")
    parser.add_argument("--aspect-ratio", default="9:16")
    parser.add_argument("--channel", choices=["low"], default="low")
    parser.add_argument("--resolution", choices=["1k", "2k", "4k"], default="2k")
    parser.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", "https://www.runninghub.cn"))
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--poll-interval", type=int, default=5)
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--request-timeout", type=int, default=60)
    parser.add_argument("--download-dir")
    parser.add_argument("--submit-log-dir", help="Write an immutable non-secret submit receipt before polling.")
    parser.add_argument("--resume-task-id", help="Resume an already submitted task: query, optionally wait, and download without resubmitting.")
    parser.add_argument("--result-json", help="Write the final non-secret result JSON to this path for machine recovery.")
    parser.add_argument("--job-id", required=True, help="Harness job ID; prevents an unscoped provider submission.")
    parser.add_argument("--asset-id", required=True, help="Step04 B-layer asset ID or lifecycle asset ID.")
    parser.add_argument("--asset-stage", choices=["identity_master", "scene", "prop"], required=True)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def write_result(result: dict, result_json: str | None) -> None:
    if result_json:
        target = Path(result_json)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def main() -> int:
    configure_stdio()
    load_dotenv()
    args = parse_args()

    prompt = ""
    if not args.resume_task_id:
        try:
            prompt = read_prompt(args)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 2
    elif args.download_dir:
        try:
            prompt = read_prompt(args)
        except ValueError as exc:
            print("Resuming a task with --download-dir requires --prompt or --prompt-file for the download receipt.", file=sys.stderr)
            return 2

    endpoint = LOW_ENDPOINT
    payload = {"prompt": prompt, "aspectRatio": args.aspect_ratio, "resolution": args.resolution}

    url = f"{args.base_url.rstrip('/')}{endpoint}"
    if args.dry_run:
        if args.resume_task_id:
            print("--dry-run cannot be combined with --resume-task-id.", file=sys.stderr)
            return 2
        print(json.dumps({"url": url, "payload": payload, "assetStage": args.asset_stage, "job_id": args.job_id, "asset_id": args.asset_id, "actual_prompt": prompt, "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(), "authEnv": args.api_key_env}, ensure_ascii=False, indent=2))
        return 0

    api_key = os.getenv(args.api_key_env, "").strip()
    if not api_key:
        print(f"Missing {args.api_key_env}. Set it in .env or the environment.", file=sys.stderr)
        return 2

    if args.resume_task_id:
        try:
            task_id = str(args.resume_task_id)
            query_response = (poll_result(args.base_url, task_id, api_key, args.timeout, args.poll_interval, args.request_timeout)
                              if args.wait else post_json(f"{args.base_url.rstrip('/')}{QUERY_ENDPOINT}", {"taskId": task_id}, api_key, args.request_timeout))
            result = {"resumed_task_id": task_id, "query": query_response, "assetStage": args.asset_stage, "job_id": args.job_id, "asset_id": args.asset_id, "actual_prompt": prompt, "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}
            urls = find_image_urls(query_response)
            if args.download_dir and urls:
                downloaded = download_urls(urls, Path(args.download_dir), args.request_timeout)
                result["downloaded"] = downloaded
                result["downloadReceipt"] = write_download_receipt(
                    Path(args.download_dir), downloaded, task_id, prompt, args.asset_stage, args.job_id, args.asset_id
                )
            write_result(result, args.result_json)
            return 0
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            print(f"Resume/query failed: {exc}", file=sys.stderr)
            return 1

    try:
        submit_response, submit_trace = post_json_detailed(url, payload, api_key, args.request_timeout)
        print(json.dumps({"event": "submitted", "submit": submit_response, "transport": submit_trace}, ensure_ascii=False), flush=True)
        result = {"submit": submit_response, "assetStage": args.asset_stage, "job_id": args.job_id, "asset_id": args.asset_id, "actual_prompt": prompt, "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}
        task_id = extract_task_id(submit_response)
        submit_log = write_submit_log(args.submit_log_dir, payload, submit_response, task_id, args.asset_stage, args.job_id, args.asset_id)
        if submit_log:
            result["submitLog"] = submit_log
        if args.wait and task_id:
            query_response = poll_result(args.base_url, task_id, api_key, args.timeout, args.poll_interval, args.request_timeout)
            result["query"] = query_response
            urls = find_image_urls(query_response)
            if args.download_dir and urls:
                downloaded = download_urls(urls, Path(args.download_dir), args.request_timeout)
                result["downloaded"] = downloaded
                result["downloadReceipt"] = write_download_receipt(
                    Path(args.download_dir), downloaded, task_id, prompt, args.asset_stage, args.job_id, args.asset_id
                )
        write_result(result, args.result_json)
        return 0
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP error {exc.code}", file=sys.stderr)
        print(body, file=sys.stderr)
        return 1
    except (URLError, TimeoutError, OSError) as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
