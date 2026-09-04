import argparse
import contextlib
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


SEARCH_BASE_URL = "https://s.jina.ai/"
READER_BASE_URL = "https://r.jina.ai/"
SKILL_DIR = Path(__file__).resolve().parents[1]
SKILL_ENV_FILE = SKILL_DIR / ".env"


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def split_key_list(value: str) -> list[str]:
    keys: list[str] = []
    seen: set[str] = set()
    for part in re.split(r"[,;\s]+", value.strip()):
        key = part.strip().strip('"').strip("'")
        if key and key not in seen:
            keys.append(key)
            seen.add(key)
    return keys


def load_dotenv() -> None:
    paths: list[Path] = []
    cwd = Path.cwd().resolve()
    paths.extend([cwd, *cwd.parents])
    paths.append(SKILL_DIR)

    dotenv_keys: set[str] = set()
    for base in paths:
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
            if not key:
                continue
            # Prefer the nearest project .env for Jina, so a stale inherited
            # process environment cannot keep using an exhausted key.
            if key in {"JINA_API_KEY", "JINA_API_KEYS"} and key not in dotenv_keys:
                os.environ[key] = value
                dotenv_keys.add(key)
                continue
            if key not in os.environ:
                os.environ[key] = value


def available_api_keys(use_key: bool) -> list[str]:
    if not use_key:
        return [""]

    keys: list[str] = []
    seen: set[str] = set()
    for env_name in ("JINA_API_KEYS", "JINA_API_KEY"):
        for key in split_key_list(os.getenv(env_name, "")):
            if key not in seen:
                keys.append(key)
                seen.add(key)
    return keys or [""]


def build_headers(output_format: str, api_key: str) -> dict[str, str]:
    accept = "application/json" if output_format == "json" else "text/plain"
    headers = {
        "Accept": accept,
        "User-Agent": "codex-jina-search-skill/1.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def insufficient_balance(exc: HTTPError, body: str) -> bool:
    normalized = body.lower()
    return exc.code == 402 and (
        "insufficientbalanceerror" in normalized
        or "balance not enough" in normalized
        or "insufficient balance" in normalized
    )


def rewrite_skill_env_without_key(exhausted_key: str) -> bool:
    if not exhausted_key or not SKILL_ENV_FILE.exists():
        return False

    original_lines = SKILL_ENV_FILE.read_text(encoding="utf-8", errors="replace").splitlines()
    found_keys: list[str] = []
    seen: set[str] = set()
    for raw_line in original_lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() not in {"JINA_API_KEY", "JINA_API_KEYS"}:
            continue
        for key in split_key_list(value):
            if key not in seen:
                found_keys.append(key)
                seen.add(key)

    remaining = [key for key in found_keys if key != exhausted_key]
    if remaining == found_keys:
        return False

    new_lines: list[str] = []
    wrote_key_list = False
    wrote_primary_key = False
    for raw_line in original_lines:
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            name = line.split("=", 1)[0].strip()
            if name == "JINA_API_KEYS":
                if remaining and not wrote_key_list:
                    new_lines.append(f"JINA_API_KEYS={','.join(remaining)}")
                    wrote_key_list = True
                continue
            if name == "JINA_API_KEY":
                if remaining and not wrote_primary_key:
                    new_lines.append(f"JINA_API_KEY={remaining[0]}")
                    wrote_primary_key = True
                continue
        new_lines.append(raw_line)

    if remaining and not wrote_key_list:
        new_lines.append(f"JINA_API_KEYS={','.join(remaining)}")
    if remaining and not wrote_primary_key:
        new_lines.append(f"JINA_API_KEY={remaining[0]}")

    SKILL_ENV_FILE.write_text("\n".join(new_lines).rstrip() + "\n", encoding="utf-8")
    return True


def request_text(url: str, headers: dict[str, str], timeout: int) -> str:
    request = Request(url, headers=headers, method="GET")
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def search(query: str, headers: dict[str, str], timeout: int) -> str:
    return request_text(f"{SEARCH_BASE_URL}?q={quote(query, safe='')}", headers, timeout)


def read_url(target_url: str, headers: dict[str, str], timeout: int) -> str:
    normalized = target_url.strip()
    if not normalized.startswith(("http://", "https://")):
        raise ValueError("read requires a full http/https URL.")
    return request_text(f"{READER_BASE_URL}{normalized}", headers, timeout)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search or read pages with Jina AI.")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--no-key", action="store_true", help="Do not send JINA_API_KEY.")

    subparsers = parser.add_subparsers(dest="command", required=True)
    search_parser = subparsers.add_parser("search", help="Search the web")
    search_parser.add_argument("query")

    read_parser = subparsers.add_parser("read", help="Read and extract a URL")
    read_parser.add_argument("url")
    return parser.parse_args()


def main() -> int:
    configure_stdio()
    load_dotenv()
    args = parse_args()
    api_keys = available_api_keys(not args.no_key)

    last_http_error: tuple[HTTPError, str] | None = None
    try:
        for index, api_key in enumerate(api_keys, start=1):
            headers = build_headers(args.format, api_key)
            try:
                if args.command == "search":
                    output = search(args.query, headers, args.timeout)
                else:
                    output = read_url(args.url, headers, args.timeout)
                break
            except HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                last_http_error = (exc, body)
                if api_key and insufficient_balance(exc, body) and index < len(api_keys):
                    removed = rewrite_skill_env_without_key(api_key)
                    note = "Removed exhausted Jina key from skill .env; trying next key."
                    if not removed:
                        note = "Jina key appears exhausted; trying next key."
                    print(note, file=sys.stderr)
                    continue
                raise
        else:
            if last_http_error is not None:
                raise last_http_error[0]
            output = ""
    except HTTPError as exc:
        body = last_http_error[1] if last_http_error and last_http_error[0] is exc else exc.read().decode("utf-8", errors="replace")
        if insufficient_balance(exc, body):
            for api_key in api_keys:
                rewrite_skill_env_without_key(api_key)
        print(f"HTTP error {exc.code}", file=sys.stderr)
        print(body, file=sys.stderr)
        return 1
    except (URLError, TimeoutError, ValueError) as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        try:
            parsed = json.loads(output)
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
            return 0
        except json.JSONDecodeError:
            pass
    with contextlib.suppress(BrokenPipeError):
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
