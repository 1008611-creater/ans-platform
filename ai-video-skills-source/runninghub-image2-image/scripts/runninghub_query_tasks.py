import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse


QUERY_ENDPOINT = "/openapi/v2/query"


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


def post_json(url: str, payload: dict, api_key: str, timeout: int) -> dict:
    import requests

    with requests.Session() as session:
        session.trust_env = False
        response = session.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
                "User-Agent": "codex-runninghub-query-tasks/1.0",
            },
            timeout=timeout,
        )
    response.raise_for_status()
    try:
        return response.json()
    except ValueError:
        return {"raw": response.text}


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


def safe_filename(task_id: str, url: str, index: int) -> str:
    name = Path(urlparse(url).path).name or f"runninghub-image2-image-{index}.png"
    if "." not in name:
        name = f"{name}.png"
    return f"{task_id}-{index}-{name}"


def download_urls(task_id: str, urls: list[str], output_dir: Path, request_timeout: int) -> list[str]:
    import requests

    output_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []
    for index, url in enumerate(urls, start=1):
        with requests.Session() as session:
            session.trust_env = False
            response = session.get(
                url,
                headers={"User-Agent": "codex-runninghub-query-tasks/1.0"},
                timeout=request_timeout,
            )
        response.raise_for_status()
        path = output_dir / safe_filename(task_id, url, index)
        if path.exists():
            path = output_dir / f"{path.stem}-copy{path.suffix}"
        path.write_bytes(response.content)
        saved.append(str(path))
    return saved


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query and download existing RunningHub Image2 tasks.")
    parser.add_argument("--task-id", action="append", help="RunningHub task ID. Can be repeated.")
    parser.add_argument("--task-ids-file", help="Text file with one task ID per line.")
    parser.add_argument("--base-url", default=os.getenv("RUNNINGHUB_BASE_URL", "https://www.runninghub.cn"))
    parser.add_argument("--api-key-env", default="RUNNINGHUB_API_KEY")
    parser.add_argument("--request-timeout", type=int, default=120)
    parser.add_argument("--download-dir")
    return parser.parse_args()


def read_task_ids(args: argparse.Namespace) -> list[str]:
    task_ids = list(args.task_id or [])
    if args.task_ids_file:
        lines = Path(args.task_ids_file).read_text(encoding="utf-8", errors="replace").splitlines()
        task_ids.extend(line.strip() for line in lines if line.strip() and not line.strip().startswith("#"))
    task_ids = list(dict.fromkeys(task_ids))
    if not task_ids:
        raise ValueError("Provide --task-id or --task-ids-file.")
    return task_ids


def main() -> int:
    configure_stdio()
    args = parse_args()
    load_dotenv(prefer_keys={args.api_key_env})

    try:
        task_ids = read_task_ids(args)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    api_key = os.getenv(args.api_key_env, "").strip()
    if not api_key:
        print(f"Missing {args.api_key_env}. Set it in .env or the environment.", file=sys.stderr)
        return 2

    output = []
    for task_id in task_ids:
        item = {"taskId": task_id}
        try:
            response = post_json(
                f"{args.base_url.rstrip('/')}{QUERY_ENDPOINT}",
                {"taskId": task_id},
                api_key,
                args.request_timeout,
            )
            item["query"] = response
            urls = find_image_urls(response)
            item["resultUrls"] = urls
            if args.download_dir and urls:
                item["downloaded"] = download_urls(task_id, urls, Path(args.download_dir), args.request_timeout)
        except Exception as exc:
            item["error"] = repr(exc)
        output.append(item)

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
