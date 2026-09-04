#!/usr/bin/env python3
# OpenLux gpt-image-2-c image gen / image-to-image wrapper (highest priority channel).
# Usage:
#   python generate_image.py --prompt "a red apple" --size 1024x1024 --out apple.png
#   python generate_image.py --prompt "make the cat blue" --ref cat.png --out cat_blue.png
# Args:
#   --prompt         (required) prompt text
#   --ref            (optional) local path or http(s) URL for image-to-image
#   --size           (optional, default 1024x1024) see references/capabilities.md
#   --quality        (optional, e.g. high)
#   --output_format  (optional; png default, jpeg allowed)
#   --out            (optional, default output.png)
#   --model          (optional, default gpt-image-2-c)

import argparse
import base64
import json
import os
import sys
import time
import urllib.request

DEFAULT_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

def load_config():
    base = os.environ.get("OPENLUX_BASE_URL")
    key = os.environ.get("OPENLUX_API_KEY")
    if os.path.exists(DEFAULT_CONFIG):
        try:
            with open(DEFAULT_CONFIG, encoding="utf-8") as f:
                c = json.load(f)
            if not base:
                base = c.get("base_url")
            if not key:
                key = c.get("api_key")
        except Exception:
            pass
    return base, key


def to_data_uri(path_or_url):
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        return path_or_url
    with open(path_or_url, "rb") as f:
        data = f.read()
    ext = os.path.splitext(path_or_url)[1].lower().lstrip(".") or "png"
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}.get(ext, "png")
    return "data:image/%s;base64,%s" % (mime, base64.b64encode(data).decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--ref")
    ap.add_argument("--size", default="1024x1024")
    ap.add_argument("--quality")
    ap.add_argument("--output_format")
    ap.add_argument("--out", default="output.png")
    ap.add_argument("--model", default="gpt-image-2-c")
    args = ap.parse_args()

    base, key = load_config()
    if not base or not key:
        print("ERROR: missing base_url/api_key (config.json or env OPENLUX_BASE_URL/OPENLUX_API_KEY)", file=sys.stderr)
        sys.exit(2)

    payload = {"model": args.model, "prompt": args.prompt, "n": 1, "size": args.size}
    if args.quality:
        payload["quality"] = args.quality
    if args.output_format:
        payload["output_format"] = args.output_format
    if args.ref:
        payload["image"] = to_data_uri(args.ref)

    url = base.rstrip("/") + "/v1/images/generations"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    t0 = time.time()
    try:
        raw = urllib.request.urlopen(req, timeout=360).read()
        data = json.loads(raw.decode("utf-8", "replace"))
        item = data["data"][0]
        if "b64_json" in item:
            buf = base64.b64decode(item["b64_json"])
            with open(args.out, "wb") as f:
                f.write(buf)
            print("OK saved=%s bytes=%d time=%.1fs" % (args.out, len(buf), time.time() - t0))
        elif "url" in item:
            print("OK url=%s" % item["url"])
        else:
            print("WARN keys=%s" % list(item.keys()))
    except urllib.error.HTTPError as e:
        print("HTTP %s: %s" % (e.code, e.read().decode("utf-8", "replace")[:400]), file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print("ERR %r" % (e,), file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
