import argparse
import hashlib
import json
import mimetypes
import os
import struct
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


LOW_ENDPOINT = "/openapi/v2/rhart-image-g-2/image-to-image"
QUERY_ENDPOINT = "/openapi/v2/query"
MEDIA_UPLOAD_ENDPOINT = "/openapi/v2/media/upload/binary"


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def load_dotenv(prefer_keys: set[str] | None = None) -> None:
    prefer_keys = prefer_keys or set()
    cwd = Path.cwd().resolve()
    loaded_keys: set[str] = set()
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
            if not key or key in loaded_keys:
                continue
            loaded_keys.add(key)
            if key not in os.environ or key in prefer_keys:
                os.environ[key] = value


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        return Path(args.prompt_file).read_text(encoding="utf-8", errors="replace").strip()
    if args.prompt:
        return args.prompt.strip()
    raise ValueError("Provide --prompt or --prompt-file.")


def read_image_inputs(args: argparse.Namespace) -> tuple[list[str], list[Path]]:
    urls: list[str] = list(args.image_url or [])
    if args.image_urls_file:
        lines = Path(args.image_urls_file).read_text(encoding="utf-8", errors="replace").splitlines()
        urls.extend(line.strip() for line in lines if line.strip() and not line.strip().startswith("#"))
    files = [Path(path).expanduser() for path in (args.image_file or [])]
    if args.image_files_file:
        lines = Path(args.image_files_file).read_text(encoding="utf-8", errors="replace").splitlines()
        files.extend(Path(line.strip()).expanduser() for line in lines if line.strip() and not line.strip().startswith("#"))
    urls = list(dict.fromkeys(urls))
    files = list(dict.fromkeys(files))
    if not urls and not files:
        raise ValueError("Provide at least one --image-url/--image-urls-file or --image-file/--image-files-file.")
    invalid = [url for url in urls if not url.startswith(("http://", "https://"))]
    if invalid:
        raise ValueError("RunningHub v2 imageUrls requires public http/https URLs, not local paths: " + ", ".join(invalid))
    missing = [str(path) for path in files if not path.exists()]
    if missing:
        raise ValueError("Local reference image files do not exist: " + ", ".join(missing))
    return urls, files


def upload_media_file(base_url: str, path: Path, api_key: str, timeout: int) -> dict:
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    try:
        import requests

        with path.open("rb") as file_handle:
            with requests.Session() as session:
                session.trust_env = False
                response = session.post(
                    f"{base_url.rstrip('/')}{MEDIA_UPLOAD_ENDPOINT}",
                    files={"file": (path.name, file_handle, mime)},
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Accept": "application/json",
                        "User-Agent": "codex-runninghub-image2-image/1.1",
                    },
                    timeout=timeout,
                )
        response.raise_for_status()
        data = response.json()
    except ImportError as exc:
        raise RuntimeError("Local image upload requires the requests package.") from exc
    except ValueError:
        data = {"raw": response.text}
    data_block = data.get("data") or {}
    download_url = (
        data.get("download_url")
        or data.get("downloadUrl")
        or data.get("url")
        or data_block.get("download_url")
        or data_block.get("downloadUrl")
        or data_block.get("url")
    )
    if not isinstance(download_url, str) or not download_url.startswith(("http://", "https://")):
        raise RuntimeError(f"Upload response missing download_url for {path}: {json.dumps(data, ensure_ascii=False)}")
    return {
        "local_path": str(path.resolve()),
        "sha256": sha256_file(path),
        "download_url": download_url,
        "response": data,
    }


def resolve_image_urls(args: argparse.Namespace, api_key: str | None) -> tuple[list[str], list[dict]]:
    urls, files = read_image_inputs(args)
    uploads: list[dict] = []
    if files:
        # A contract preflight must be entirely local.  The old dry-run path
        # uploaded local files before printing its simulated payload, which
        # made validation itself an external side effect.
        if args.dry_run:
            for path in files:
                uploads.append({
                    "local_path": str(path.resolve()),
                    "sha256": sha256_file(path),
                    "status": "not_uploaded_dry_run",
                })
                urls.append(f"dry-run://local-reference/{sha256_file(path)}")
            return list(dict.fromkeys(urls)), uploads
        if not api_key:
            raise ValueError(f"Missing {args.api_key_env}. Local --image-file references must be uploaded before they can be used in imageUrls.")
        for path in files:
            upload = upload_media_file(args.upload_base_url or args.base_url, path, api_key, args.request_timeout)
            uploads.append(upload)
            urls.append(upload["download_url"])
    return list(dict.fromkeys(urls)), uploads


def post_json(url: str, payload: dict, api_key: str, timeout: int) -> dict:
    try:
        import requests

        with requests.Session() as session:
            session.trust_env = False
            response = session.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Accept": "application/json",
                    "User-Agent": "codex-runninghub-image2-image/1.0",
                },
                timeout=timeout,
            )
        response.raise_for_status()
        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}
    except ImportError:
        pass

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "codex-runninghub-image2-image/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        text = response.read().decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


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


def collect_codes(value) -> set[str]:
    codes: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in {"code", "errorcode", "error_code", "statuscode", "status_code"} and isinstance(item, (str, int)):
                codes.add(str(item))
            codes.update(collect_codes(item))
    elif isinstance(value, list):
        for item in value:
            codes.update(collect_codes(item))
    return codes


def parse_fail_fast_codes(raw: str | None) -> set[str]:
    if not raw:
        return set()
    normalized = raw.replace(";", ",")
    return {item.strip() for item in normalized.split(",") if item.strip()}


def fail_reason(response: dict, fail_fast_codes: set[str]) -> str | None:
    if find_image_urls(response):
        return None
    codes = collect_codes(response)
    matched_codes = sorted(code for code in codes if code in fail_fast_codes)
    if matched_codes:
        return f"error_code:{','.join(matched_codes)}"
    status = str(response.get("status") or response.get("taskStatus") or "").strip().lower()
    if status in {"failed", "failure", "fail", "error", "rejected", "cancelled", "canceled"}:
        return f"status:{status}"
    error_code = str(response.get("errorCode") or response.get("error_code") or "").strip()
    error_message = str(response.get("errorMessage") or response.get("error_msg") or "").strip()
    if error_code or error_message:
        return "error_response"
    failed_reason = response.get("failedReason")
    if failed_reason:
        return "failed_reason"
    return None


def poll_result(
    base_url: str,
    task_id: str,
    api_key: str,
    timeout: int,
    poll_interval: int,
    request_timeout: int,
    fail_fast_codes: set[str],
) -> dict:
    deadline = time.time() + timeout
    last_response: dict = {}
    while time.time() < deadline:
        last_response = post_json(f"{base_url.rstrip('/')}{QUERY_ENDPOINT}", {"taskId": task_id}, api_key, request_timeout)
        if looks_finished(last_response):
            return last_response
        reason = fail_reason(last_response, fail_fast_codes)
        if reason:
            return {"failed": True, "taskId": task_id, "failReason": reason, "lastResponse": last_response}
        time.sleep(poll_interval)
    return {"timeout": True, "taskId": task_id, "lastResponse": last_response}


def safe_filename(url: str, index: int) -> str:
    name = Path(urlparse(url).path).name or f"runninghub-image2-image-{index}.png"
    if "." not in name:
        name = f"{name}.png"
    return name


def download_urls(urls: list[str], output_dir: Path, request_timeout: int) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []
    for index, url in enumerate(urls, start=1):
        try:
            import requests

            with requests.Session() as session:
                session.trust_env = False
                response = session.get(
                    url,
                    headers={"User-Agent": "codex-runninghub-image2-image/1.0"},
                    timeout=request_timeout,
                )
            response.raise_for_status()
            data = response.content
        except ImportError:
            request = Request(url, headers={"User-Agent": "codex-runninghub-image2-image/1.0"})
            with urlopen(request, timeout=request_timeout) as response:
                data = response.read()
        path = output_dir / safe_filename(url, index)
        if path.exists():
            path = output_dir / f"{path.stem}-{index}{path.suffix}"
        path.write_bytes(data)
        saved.append(str(path))
    return saved


def write_submit_log(log_dir: str | None, payload: dict, uploads: list[dict], submit_response: dict, task_id: str | None, asset_stage: str, job_id: str, asset_id: str) -> str | None:
    if not log_dir:
        return None
    output_dir = Path(log_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    task_part = task_id or "no_task_id"
    path = output_dir / f"runninghub_submit_{stamp}_{task_part}.json"
    record = {
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "job_id": job_id,
        "asset_id": asset_id,
        "asset_stage": asset_stage,
        "taskId": task_id,
        # This is the immutable text submitted in payload.prompt.  Do not make
        # downstream consumers infer it from a mutable prompt file or log.
        "actual_prompt": str(payload.get("prompt") or ""),
        "actual_prompt_sha256": hashlib.sha256(str(payload.get("prompt") or "").encode("utf-8")).hexdigest(),
        "payload": payload,
        "uploads": uploads,
        "submit": submit_response,
    }
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path)


def sha256_file(path: Path) -> str:
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
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
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


def write_download_receipt(output_dir: Path, downloaded: list[str], task_id: str | None, prompt: str, asset_stage: str, job_id: str = "", asset_id: str = "") -> str:
    files = []
    for raw_path in downloaded:
        path = Path(raw_path).resolve()
        width, height = image_dimensions(path)
        files.append({
            "exact_path": str(path),
            "sha256": sha256_file(path),
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


def validate_asset_stage(args: argparse.Namespace, local_files: list[Path]) -> dict:
    """Prevent a character sheet from being generated without its exact mother image."""
    if args.asset_stage != "character_sheet":
        return {"asset_stage": args.asset_stage}
    if len(local_files) != 1 or args.image_url or args.image_urls_file:
        raise ValueError("character_sheet requires exactly one --image-file identity master and no URL-only references.")
    if not args.parent_sha256 or not args.parent_upload_receipt:
        raise ValueError("character_sheet requires --parent-sha256 and --parent-upload-receipt.")
    actual_sha = sha256_file(local_files[0])
    if actual_sha.lower() != args.parent_sha256.lower():
        raise ValueError("character_sheet --parent-sha256 does not match the uploaded --image-file.")
    receipt_path = Path(args.parent_upload_receipt)
    if not receipt_path.is_file():
        raise ValueError("character_sheet parent upload receipt does not exist.")
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError("character_sheet parent upload receipt is not valid JSON.") from exc
    if not isinstance(receipt, dict):
        raise ValueError("character_sheet parent upload receipt must be a JSON object.")
    receipt_candidates = [receipt, receipt.get("identity_master")]
    receipt_candidates.extend(receipt.get("uploads") or [])
    receipt_matches_parent = any(
        isinstance(candidate, dict)
        and str(candidate.get("local_path") or "") == str(local_files[0].resolve())
        and str(candidate.get("sha256") or "").lower() == actual_sha
        for candidate in receipt_candidates
    )
    if not receipt_matches_parent:
        raise ValueError("character_sheet parent upload receipt does not bind the exact local identity master path and SHA-256.")
    return {
        "asset_stage": "character_sheet",
        "identity_master": {"local_path": str(local_files[0].resolve()), "sha256": actual_sha, "receipt_path": str(receipt_path.resolve())},
        "parent_upload_receipt_verified": isinstance(receipt, dict),
    }


def write_result(result: dict, result_json: str | None) -> None:
    if result_json:
        target = Path(result_json)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Submit RunningHub Image G 2.0 image-to-image jobs.")
    parser.add_argument("--prompt")
    parser.add_argument("--prompt-file")
    parser.add_argument("--image-url", action="append")
    parser.add_argument("--image-urls-file")
    parser.add_argument("--image-file", action="append", help="Local reference image to upload to RunningHub media first.")
    parser.add_argument("--image-files-file", help="Text file containing local reference image paths, one per line.")
    parser.add_argument("--aspect-ratio", default="9:16")
    parser.add_argument("--channel", choices=["low"], default="low")
    parser.add_argument("--resolution", choices=["1k", "2k", "4k"], default="2k")
    parser.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", "https://www.runninghub.cn"))
    parser.add_argument("--upload-base-url", default=os.getenv("RUNNINGHUB_UPLOAD_BASE_URL"))
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--poll-interval", type=int, default=5)
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--request-timeout", type=int, default=60)
    parser.add_argument("--fail-fast-error-codes", default="1007", help="Comma-separated provider/query error codes that should stop polling immediately.")
    parser.add_argument("--download-dir")
    parser.add_argument("--submit-log-dir", help="Write submit response and taskId immediately before polling.")
    parser.add_argument("--result-json", help="Write durable non-secret result JSON for recovery.")
    parser.add_argument("--job-id", required=True, help="Harness job ID; prevents an unscoped provider submission.")
    parser.add_argument("--asset-id", required=True, help="Step04 B-layer asset ID or downstream production asset ID.")
    parser.add_argument("--asset-stage", choices=["character_sheet", "scene", "prop", "first_frame", "storyboard"], required=True)
    parser.add_argument("--parent-sha256", help="Required for character_sheet; SHA-256 of the uploaded identity master.")
    parser.add_argument("--parent-upload-receipt", help="Required for character_sheet; non-secret JSON receipt for the identity-master upload.")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    configure_stdio()
    args = parse_args()
    load_dotenv(prefer_keys={args.api_key_env})

    try:
        prompt = read_prompt(args)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    api_key = os.getenv(args.api_key_env, "").strip()
    try:
        _, local_files = read_image_inputs(args)
        asset_contract = validate_asset_stage(args, local_files)
        image_urls, uploads = resolve_image_urls(args, api_key or None)
    except (ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    endpoint = LOW_ENDPOINT
    payload = {
        "prompt": prompt,
        "imageUrls": image_urls,
        "aspectRatio": args.aspect_ratio,
        "resolution": args.resolution,
        "tools": ["image_generation"],
    }

    url = f"{args.base_url.rstrip('/')}{endpoint}"
    if args.dry_run:
        print(json.dumps({"url": url, "payload": payload, "uploads": uploads, "assetContract": asset_contract, "job_id": args.job_id, "asset_id": args.asset_id, "actual_prompt": prompt, "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(), "authEnv": args.api_key_env}, ensure_ascii=False, indent=2))
        return 0

    if not api_key:
        print(f"Missing {args.api_key_env}. Set it in .env or the environment.", file=sys.stderr)
        return 2

    try:
        submit_response = post_json(url, payload, api_key, args.request_timeout)
        result = {"submit": submit_response, "uploads": uploads, "assetContract": asset_contract, "job_id": args.job_id, "asset_id": args.asset_id, "actual_prompt": prompt, "actual_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}
        task_id = extract_task_id(submit_response)
        submit_log = write_submit_log(args.submit_log_dir, payload, uploads, submit_response, task_id, args.asset_stage, args.job_id, args.asset_id)
        if submit_log:
            result["submitLog"] = submit_log
        if args.wait and task_id:
            query_response = poll_result(
                args.base_url,
                task_id,
                api_key,
                args.timeout,
                args.poll_interval,
                args.request_timeout,
                parse_fail_fast_codes(args.fail_fast_error_codes),
            )
            result["query"] = query_response
            if isinstance(query_response, dict) and query_response.get("failed"):
                result["rhDiagnosis"] = {
                    "payloadTools": payload.get("tools", []),
                    "payloadHasImageGenerationTool": "image_generation" in payload.get("tools", []),
                    "action": "stop_polling_and_switch_channel_or_local_postprocess",
                }
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
