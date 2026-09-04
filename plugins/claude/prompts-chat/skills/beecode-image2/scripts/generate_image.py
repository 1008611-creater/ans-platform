#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
DEFAULT_BASE_URL = "https://beecode.cc"
DEFAULT_MODEL = "gpt-image-2"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def normalize_base_url(value: str | None) -> str:
    base_url = (value or DEFAULT_BASE_URL).strip().rstrip("/")
    if not base_url:
        base_url = DEFAULT_BASE_URL
    if base_url.endswith("/v1"):
        return base_url
    return f"{base_url}/v1"


def read_prompt(args: argparse.Namespace) -> str:
    parts: list[str] = []
    if args.prompt_file:
        parts.append(Path(args.prompt_file).read_text(encoding="utf-8").strip())
    if args.prompt:
        parts.append(args.prompt.strip())
    prompt = "\n\n".join(part for part in parts if part)
    if not prompt and not args.list_models:
        raise SystemExit("Provide --prompt or --prompt-file.")
    return prompt


def request_json(method: str, url: str, api_key: str, payload: dict[str, Any] | None, timeout: int) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} from {url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not reach {url}: {exc}") from exc
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Non-JSON response from {url}: {body[:500]}") from exc


def multipart_request_json(url: str, api_key: str, fields: dict[str, Any], files: list[tuple[str, Path]], timeout: int) -> dict[str, Any]:
    boundary = f"----CodexBeeCodeImage2{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for key, value in fields.items():
        if value is None:
            continue
        chunks.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    for field_name, path in files:
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        chunks.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{field_name}"; filename="{path.name}"\r\n'.encode("utf-8"),
                f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                path.read_bytes(),
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    data = b"".join(chunks)
    request = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} from {url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not reach {url}: {exc}") from exc
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Non-JSON response from {url}: {body[:500]}") from exc


def image_items(response: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(response.get("data"), list):
        return [item for item in response["data"] if isinstance(item, dict)]

    # A few OpenAI-compatible relays wrap images in output/content arrays.
    found: list[dict[str, Any]] = []
    stack: list[Any] = [response.get("output"), response.get("content")]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            if any(key in current for key in ("b64_json", "image_base64", "base64", "url", "image_url")):
                found.append(current)
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)
    return found


def get_base64(item: dict[str, Any]) -> str | None:
    for key in ("b64_json", "image_base64", "base64"):
        value = item.get(key)
        if isinstance(value, str) and value:
            if value.startswith("data:"):
                return value.split(",", 1)[1]
            return value
    return None


def get_url(item: dict[str, Any]) -> str | None:
    for key in ("url", "image_url"):
        value = item.get(key)
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            return value
        if isinstance(value, dict):
            nested = value.get("url")
            if isinstance(nested, str) and nested.startswith(("http://", "https://")):
                return nested
    return None


def sniff_extension(data: bytes, preferred: str | None = None) -> str:
    if preferred:
        cleaned = preferred.lower().lstrip(".")
        if cleaned in {"png", "jpg", "jpeg", "webp"}:
            return "jpg" if cleaned == "jpeg" else cleaned
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"
    return "png"


def download_url(url: str, timeout: int) -> tuple[bytes, str | None]:
    request = urllib.request.Request(url, headers={"User-Agent": "Codex BeeCode Image2 Skill"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = response.read()
        content_type = response.headers.get("Content-Type", "")
    if "jpeg" in content_type:
        return data, "jpg"
    if "png" in content_type:
        return data, "png"
    if "webp" in content_type:
        return data, "webp"
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower().lstrip(".")
    return data, suffix or None


def scrub_response(value: Any) -> Any:
    if isinstance(value, dict):
        scrubbed: dict[str, Any] = {}
        for key, item in value.items():
            if key in {"b64_json", "image_base64", "base64"} and isinstance(item, str):
                scrubbed[key] = f"[base64 omitted, {len(item)} chars]"
            else:
                scrubbed[key] = scrub_response(item)
        return scrubbed
    if isinstance(value, list):
        return [scrub_response(item) for item in value]
    return value


def save_images(response: dict[str, Any], out_dir: Path, prefix: str, output_format: str | None, timeout: int) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    for index, item in enumerate(image_items(response), start=1):
        encoded = get_base64(item)
        if encoded:
            data = base64.b64decode(encoded)
            ext = sniff_extension(data, output_format)
        else:
            url = get_url(item)
            if not url:
                continue
            data, hinted_ext = download_url(url, timeout)
            ext = sniff_extension(data, output_format or hinted_ext)
        path = out_dir / f"{prefix}-{index:02d}.{ext}"
        path.write_bytes(data)
        saved.append(path)
    if not saved:
        raise SystemExit("The response did not contain a recognizable image payload.")
    return saved


def list_models(base_url: str, api_key: str, timeout: int) -> None:
    response = request_json("GET", f"{base_url}/models", api_key, None, timeout)
    data = response.get("data", [])
    ids = sorted(item.get("id", "") for item in data if isinstance(item, dict) and item.get("id"))
    image_like = [model for model in ids if re.search(r"(image|img|gpt-image|dall|flux|mj)", model, re.I)]
    print(json.dumps({"base_url": base_url, "image_like_models": image_like, "model_count": len(ids)}, ensure_ascii=False, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate images through the BeeCode OpenAI-compatible relay.")
    parser.add_argument("--prompt", help="Text prompt for image generation.")
    parser.add_argument("--prompt-file", help="UTF-8 text file containing the prompt.")
    parser.add_argument("--image", action="append", help="Reference image path. Supplying this switches to image-to-image/edit mode.")
    parser.add_argument("--out-dir", help="Output directory. Defaults to ./outputs/beecode-image2-<timestamp>.")
    parser.add_argument("--prefix", default="beecode-image2", help="Output file prefix.")
    parser.add_argument("--model", default=os.getenv("BEECODE_IMAGE_MODEL") or DEFAULT_MODEL)
    parser.add_argument("--base-url", default=os.getenv("BEECODE_BASE_URL") or os.getenv("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    parser.add_argument("--size", default="1024x1024")
    parser.add_argument("--n", type=int, default=1)
    parser.add_argument("--quality", help="Optional relay-supported quality value, such as high/medium/low.")
    parser.add_argument("--background", help="Optional relay-supported background value, such as transparent/opaque.")
    parser.add_argument("--output-format", choices=["png", "jpeg", "jpg", "webp"], help="Preferred output format when supported.")
    parser.add_argument("--response-format", choices=["b64_json", "url"], help="Optional response_format for compatible relays.")
    parser.add_argument("--extra", help="JSON object merged into the request payload for relay-specific options.")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--dry-run", action="store_true", help="Print the request without sending it.")
    parser.add_argument("--list-models", action="store_true", help="List image-like model IDs exposed by the relay.")
    return parser.parse_args()


def main() -> int:
    load_env_file(SKILL_DIR / "config.env")
    load_env_file(SKILL_DIR / ".env")

    args = parse_args()
    api_key = os.getenv("BEECODE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("Set BEECODE_OPENAI_API_KEY or OPENAI_API_KEY, or add it to the skill config.env.")

    base_url = normalize_base_url(args.base_url)
    if args.list_models:
        list_models(base_url, api_key, args.timeout)
        return 0

    prompt = read_prompt(args)
    payload: dict[str, Any] = {
        "model": args.model,
        "prompt": prompt,
        "n": args.n,
        "size": args.size,
    }
    for key in ("quality", "background", "response_format"):
        value = getattr(args, key)
        if value:
            payload[key] = value
    if args.output_format:
        payload["output_format"] = "jpeg" if args.output_format == "jpg" else args.output_format
    if args.extra:
        extra = json.loads(args.extra)
        if not isinstance(extra, dict):
            raise SystemExit("--extra must be a JSON object.")
        payload.update(extra)

    image_paths = [Path(item) for item in (args.image or [])]
    for image_path in image_paths:
        if not image_path.exists():
            raise SystemExit(f"Image not found: {image_path}")

    endpoint = f"{base_url}/images/edits" if image_paths else f"{base_url}/images/generations"
    if args.dry_run:
        print(json.dumps({"endpoint": endpoint, "payload": payload, "images": [str(path) for path in image_paths], "api_key": "[redacted]"}, ensure_ascii=False, indent=2))
        return 0

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = Path(args.out_dir) if args.out_dir else Path.cwd() / "outputs" / f"beecode-image2-{timestamp}"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "prompt.txt").write_text(prompt, encoding="utf-8")

    start = time.time()
    if image_paths:
        response = multipart_request_json(endpoint, api_key, payload, [("image", path) for path in image_paths], args.timeout)
    else:
        response = request_json("POST", endpoint, api_key, payload, args.timeout)
    saved = save_images(response, out_dir, args.prefix, args.output_format, args.timeout)
    (out_dir / "response.json").write_text(json.dumps(scrub_response(response), ensure_ascii=False, indent=2), encoding="utf-8")

    result = {
        "out_dir": str(out_dir.resolve()),
        "files": [str(path.resolve()) for path in saved],
        "model": args.model,
        "size": args.size,
        "elapsed_seconds": round(time.time() - start, 2),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
