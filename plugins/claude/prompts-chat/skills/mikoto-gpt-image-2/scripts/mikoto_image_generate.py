from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


API_URL = "https://api.mikoto.vip/v1/images/generations"
DEFAULT_MODEL = "gpt-image-2"
VALID_STAGES = {
    "identity_master",
    "character_sheet",
    "scene",
    "prop",
    "first_frame",
    "storyboard",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate images with the Mikoto gpt-image-2 endpoint.")
    parser.add_argument("--prompt")
    parser.add_argument("--prompt-file")
    parser.add_argument("--size", default="2560x1440")
    parser.add_argument("--aspect-ratio", default="16:9")
    parser.add_argument("--quality", choices=["low", "medium", "high", "auto"], default="high")
    parser.add_argument("--response-format", choices=["url", "b64_json"], default="b64_json")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--api-key-env", default="OPENAI_API_KEY")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--output-dir")
    parser.add_argument("--result-json")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--asset-stage", choices=sorted(VALID_STAGES), required=True)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_prompt(args: argparse.Namespace) -> str:
    if bool(args.prompt) == bool(args.prompt_file):
        raise ValueError("Provide exactly one of --prompt or --prompt-file.")
    prompt = args.prompt if args.prompt else Path(args.prompt_file).read_text(encoding="utf-8")
    prompt = prompt.strip()
    if not prompt:
        raise ValueError("Prompt is empty.")
    return prompt


def validate_size(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"([1-9][0-9]{2,3})x([1-9][0-9]{2,3})", value)
    if not match:
        raise ValueError("--size must be WIDTHxHEIGHT, for example 2560x1440.")
    return int(match.group(1)), int(match.group(2))


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temp_path.replace(path)


def safe_message(value: Any) -> str:
    text = str(value or "")[:500]
    text = re.sub(r"sk-[A-Za-z0-9_-]{12,}", "[REDACTED]", text)
    return text


def extension_for(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    return ".bin"


def image_dimensions(path: Path) -> tuple[int | None, int | None]:
    try:
        from PIL import Image

        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            return image.size
    except ImportError:
        data = path.read_bytes()
        if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
            return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
        return None, None


def download_url(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Codex-Mikoto-Image/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def main() -> int:
    args = parse_args()
    try:
        prompt = load_prompt(args)
        requested_width, requested_height = validate_size(args.size)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    payload = {
        "model": args.model,
        "prompt": prompt,
        "size": args.size,
        "aspect_ratio": args.aspect_ratio,
        "quality": args.quality,
        "response_format": args.response_format,
    }
    prompt_sha = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    receipt: dict[str, Any] = {
        "status": "dry_run" if args.dry_run else "submission_started",
        "provider": "mikoto",
        "endpoint": API_URL,
        "model": args.model,
        "job_id": args.job_id,
        "asset_id": args.asset_id,
        "asset_stage": args.asset_stage,
        "size": args.size,
        "aspect_ratio": args.aspect_ratio,
        "quality": args.quality,
        "response_format": args.response_format,
        "actual_prompt": prompt,
        "actual_prompt_sha256": prompt_sha,
        "submitted_at_unix": None if args.dry_run else int(time.time()),
    }

    if args.dry_run:
        print(json.dumps({"url": API_URL, "payload": payload, "contract": receipt}, ensure_ascii=False, indent=2))
        if args.result_json:
            atomic_write_json(Path(args.result_json), receipt)
        return 0

    if not args.output_dir or not args.result_json:
        print("Live generation requires --output-dir and --result-json.", file=sys.stderr)
        return 2

    result_path = Path(args.result_json)
    atomic_write_json(result_path, receipt)
    api_key = os.getenv(args.api_key_env)
    if not api_key:
        receipt.update({"status": "blocked_missing_credential", "error": f"{args.api_key_env} is not configured."})
        atomic_write_json(result_path, receipt)
        print(f"{args.api_key_env} is not configured. Set it securely; do not paste it in chat.", file=sys.stderr)
        return 3

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        message = f"HTTP {exc.code}"
        try:
            body = json.loads(exc.read().decode("utf-8"))
            message = safe_message(body.get("error", {}).get("message") or body.get("message") or message)
        except Exception:
            pass
        receipt.update({"status": "failed", "http_status": exc.code, "error": message})
        atomic_write_json(result_path, receipt)
        print(f"Image generation failed: HTTP {exc.code}: {message}", file=sys.stderr)
        return 4
    except (TimeoutError, urllib.error.URLError, OSError) as exc:
        receipt.update({"status": "uncertain_no_retry", "error": safe_message(exc)})
        atomic_write_json(result_path, receipt)
        print("Image request ended without a reliable response. Do not automatically retry.", file=sys.stderr)
        return 5

    items = response_data.get("data") if isinstance(response_data, dict) else None
    if not isinstance(items, list) or not items:
        receipt.update({"status": "failed", "error": "Response did not contain data[0]."})
        atomic_write_json(result_path, receipt)
        print("Image response did not contain data[0].", file=sys.stderr)
        return 6

    item = items[0] if isinstance(items[0], dict) else {}
    try:
        if item.get("b64_json"):
            image_bytes = base64.b64decode(item["b64_json"], validate=True)
        elif item.get("url"):
            image_bytes = download_url(str(item["url"]), args.timeout)
        else:
            raise ValueError("data[0] has neither b64_json nor url.")
    except Exception as exc:
        receipt.update({"status": "failed", "error": safe_message(exc)})
        atomic_write_json(result_path, receipt)
        print("Image payload could not be decoded or downloaded.", file=sys.stderr)
        return 7

    if len(image_bytes) < 1024:
        receipt.update({"status": "failed", "error": "Decoded image is unexpectedly small."})
        atomic_write_json(result_path, receipt)
        return 8

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{args.asset_id}{extension_for(image_bytes)}"
    output_path.write_bytes(image_bytes)
    width, height = image_dimensions(output_path)
    file_sha = hashlib.sha256(image_bytes).hexdigest()
    dimensions_match = width == requested_width and height == requested_height
    receipt.update(
        {
            "status": "downloaded_qa_pending",
            "provider_created": response_data.get("created") if isinstance(response_data, dict) else None,
            "exact_file_path": str(output_path.resolve()),
            "file_sha256": file_sha,
            "byte_size": len(image_bytes),
            "width": width,
            "height": height,
            "dimensions_match_request": dimensions_match,
        }
    )
    atomic_write_json(result_path, receipt)
    print(json.dumps({key: receipt[key] for key in ("status", "asset_id", "exact_file_path", "file_sha256", "width", "height", "dimensions_match_request")}, ensure_ascii=False, indent=2))
    return 0 if dimensions_match else 9


if __name__ == "__main__":
    raise SystemExit(main())
