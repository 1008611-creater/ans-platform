#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agnes Video 2.5 / 2.5 Flash 视频生成 CLI
==========================================

用法示例：
  # 文生视频（Flash 免费版，最快验证通道）
  python agnes_video.py text --prompt "柳小念站在天宫朱红立柱前，侧脸逆光，云海翻涌" --ar 9:16

  # 首帧控制（本地图片自动上传图床）
  python agnes_video.py keyframe --prompt "镜头缓慢推进，纱衣飘动" --first-frame ./shot01.png

  # 参考图模式（最多5张，免费额度内）
  python agnes_video.py reference --prompt "以 <Picture 1> 角色为准，保持外观一致，缓步行走" --images ./char.png

  # 用标准版出 2K 成片
  python agnes_video.py text --prompt "..." --model agnes-video-2.5 --size 2K

环境变量：
  AGNES_API_KEY   必需，Agnes AI platform 创建的 API Key（sk- 开头）
  AGNES_BASE_URL  可选，默认 https://apihub.agnes-ai.com
  AGNES_UPLOAD    可选，本地图片上传方式：uguu | catbox | smms | none（默认 uguu，免 Token；catbox 实测 Agnes 后端拉不到会卡死提交，故默认改用 uguu）
  SMMS_TOKEN      仅 AGNES_UPLOAD=smms 时需要

默认 catbox 免 Token；也可以直接传入已有公网 URL。
"""

import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_BASE = "https://apihub.agnes-ai.com"


def normalize_base(value: str) -> tuple[str, str]:
    """同时返回 API v1 根地址和 Agnes 查询根地址。"""
    base = value.rstrip("/")
    if base.endswith("/v1"):
        return base, base[:-3]
    return f"{base}/v1", base


MODELS = ("agnes-video-2.5-flash", "agnes-video-2.5")
SIZES_BY_MODEL = {
    "agnes-video-2.5-flash": ("720P",),
    "agnes-video-2.5": ("720P", "960P", "2K"),
}
ASPECTS = ("21:9", "16:9", "4:3", "1:1", "3:4", "9:16")


def die(msg: str) -> None:
    print(f"[错误] {msg}", file=sys.stderr)
    sys.exit(1)


class RetryableNetworkError(Exception):
    """瞬时网络错误（超时/连接断开），可重试。"""


def log(msg: str) -> None:
    print(msg, flush=True)


def get_api_key() -> str:
    # 1) 优先用环境变量
    key = os.environ.get("AGNES_API_KEY", "").strip()
    if key:
        return key
    # 2) 回退读取脚本同级目录的 AGNES_API_KEY.txt（避免“Key 存了却没注入进程”的坑）
    fallback = Path(__file__).resolve().parent.parent / "AGNES_API_KEY.txt"
    if fallback.is_file():
        raw = fallback.read_text(encoding="utf-8", errors="replace")
        key = raw.strip().splitlines()[0].strip() if raw.strip() else ""
        if key and not key.lower().startswith("在此") and not key.startswith("#"):
            log(f"[密钥] 已从 {fallback.name} 读取 AGNES_API_KEY")
            return key
    die(
        "缺少 AGNES_API_KEY。\n"
        "  1. 到 https://platform.agnes-ai.com 注册并创建 API Key（sk- 开头）\n"
        "  2. 写入脚本同级 AGNES_API_KEY.txt，或设置环境变量 AGNES_API_KEY=sk-xxx"
    )


def http_json(url: str, method: str = "GET", headers: dict = None, body: dict = None, timeout: int = 60, _retry: int = 0):
    """优先走系统 curl（本机 urllib/requests 经代理访问 apihub 的 TLS 会被断，
    curl 实测稳定）；无 curl 时降级 urllib。"""
    import shutil, subprocess
    if shutil.which("curl"):
        return _http_via_curl(url, method, headers or {}, body, timeout, _retry)
    return _http_via_urllib(url, method, headers or {}, body, timeout, _retry)


def _parse_http_error(raw: str, status: int, url: str, _retry: int, fn, *fn_args):
    """处理 HTTP 错误：429 限流自动等待重试，其他抛给 die。"""
    if status == 429 and _retry < 3:
        log(f"[限流] 429 rate_limit_exceeded，等待 65 秒后自动重试（第 {_retry + 1} 次）...")
        time.sleep(65)
        return fn(*fn_args, _retry + 1)
    try:
        detail = json.loads(raw)
    except json.JSONDecodeError:
        detail = raw[:500]
    die(f"HTTP {status} {url}\n响应：{json.dumps(detail, ensure_ascii=False, indent=2)}")


def _http_via_curl(url: str, method: str, headers: dict, body, timeout: int, _retry: int):
    cmd = ["curl", "-sS", "--max-time", str(timeout), "-X", method, url]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body, ensure_ascii=False)]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 30)
    except subprocess.TimeoutExpired:
        raise RetryableNetworkError(f"curl 超时 {url}")
    if out.returncode != 0:
        raise RetryableNetworkError(f"curl 失败({out.returncode})：{out.stderr[:160]}")
    raw = out.stdout
    # curl -w 没带状态码，这里用 -w 不方便；用 -sS 仅输出 body，无法区分 HTTP 错误。
    # 退而求其次：若返回 JSON 且含 error 字段且看起来是限流，递归重试。
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise RetryableNetworkError(f"curl 返回非 JSON：{raw[:160]}")
    # Agnes 错误体形如 {"error":{...,"code":"rate_limit_exceeded"}} 或 {"detail": "..."}
    err = parsed.get("error") or (parsed if "detail" in parsed else None)
    code = (err.get("code") if isinstance(err, dict) else None)
    if code == "rate_limit_exceeded" and _retry < 3:
        log(f"[限流] 429 rate_limit_exceeded，等待 65 秒后自动重试（第 {_retry + 1} 次）...")
        time.sleep(65)
        return _http_via_curl(url, method, headers, body, timeout, _retry + 1)
    if "error" in parsed and not parsed.get("video_id") and not parsed.get("id"):
        msg = json.dumps(parsed.get("error"), ensure_ascii=False)
        if _retry < 3 and ("rate" in msg.lower() or code == "rate_limit_exceeded"):
            time.sleep(65)
            return _http_via_curl(url, method, headers, body, timeout, _retry + 1)
        die(f"接口返回错误 {url}\n响应：{json.dumps(parsed, ensure_ascii=False, indent=2)}")
    return parsed


def _http_via_urllib(url: str, method: str, headers: dict, body, timeout: int, _retry: int):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        return _parse_http_error(raw, e.code, url, _retry, _http_via_urllib, url, method, headers, body, timeout)
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
        raise RetryableNetworkError(f"网络错误 {url}：{e}") from e
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        die(f"响应不是合法 JSON：{raw[:500]}")


# ---------------------------------------------------------------------------
# 本地图片上传（图床）
# ---------------------------------------------------------------------------

def upload_to_smms(path: Path, token: str) -> str:
    """上传本地图片到 sm.ms，返回公网 URL。"""
    boundary = "----AgnesSkillBoundary"
    filename = path.name
    ctype = mimetypes.guess_type(filename)[0] or "image/png"
    file_bytes = path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="smfile"; filename="{filename}"\r\n'
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        "https://sm.ms/api/v2/upload",
        data=body,
        method="POST",
        headers={
            "Authorization": token,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        die(f"图床上传失败 HTTP {e.code}：{raw[:300]}")
    except urllib.error.URLError as e:
        die(f"图床上传网络错误：{e.reason}")

    if result.get("success") and result.get("data", {}).get("url"):
        return result["data"]["url"]
    msg = result.get("message", "")
    if "重复" in msg or "exist" in msg.lower():
        # sm.ms 对重复图片返回 images 字段里的已有链接
        images = result.get("images", "")
        if isinstance(images, str) and images.startswith("http"):
            return images
    die(f"图床上传失败：{result}")


def upload_to_catbox(path: Path) -> str:
    """免 token 上传到 catbox，返回公网 URL。失败抛 RuntimeError（供降级）。"""
    boundary = "----AgnesCatboxBoundary"
    filename = path.name
    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    file_bytes = path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="reqtype"\r\n\r\n'
        f"fileupload\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="fileToUpload"; filename="{filename}"\r\n'
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        "https://catbox.moe/user/api.php",
        data=body,
        method="POST",
        headers={
            "User-Agent": "Mozilla/5.0",  # 注意：catbox 拒绝非浏览器 UA（412 Invalid uploader）
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            url = resp.read().decode("utf-8", errors="replace").strip()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"catbox HTTP {e.code}：{e.read()[:200].decode(errors='replace')}") from e
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
        raise RuntimeError(f"catbox 网络错误：{e}") from e
    if not url.startswith(("http://", "https://")):
        raise RuntimeError(f"catbox 未返回有效 URL：{url[:300]}")
    return url


def upload_to_uguu(path: Path) -> str:
    """免 token 上传到 uguu.se（备用图床）。链接保留期短，提交任务后尽快消费。"""
    boundary = "----AgnesUguuBoundary"
    filename = path.name
    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    file_bytes = path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="files[]"; filename="{filename}"\r\n'
        f"Content-Type: {ctype}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        "https://uguu.se/upload",
        data=body,
        method="POST",
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"uguu HTTP {e.code}：{e.read()[:200].decode(errors='replace')}") from e
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
        raise RuntimeError(f"uguu 网络错误：{e}") from e
    files = (result or {}).get("files") or []
    if result.get("success") and files and files[0].get("url"):
        return files[0]["url"]
    raise RuntimeError(f"uguu 未返回有效 URL：{str(result)[:200]}")


MAX_IMAGE_BYTES = 1_500_000  # 实测：约7MB大图会让 Agnes 提交阶段卡死，压到 ~200KB 即秒过


def ensure_small_image(path: Path) -> Path:
    """参考图超过阈值时，用 ffmpeg 压成长边1280的JPEG，避免 Agnes 后端抓图/处理超时。"""
    if path.stat().st_size <= MAX_IMAGE_BYTES:
        return path
    import shutil, subprocess
    ffmpeg = shutil.which("ffmpeg") or (
        r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"
        if Path(r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe").is_file() else None
    )
    if not ffmpeg:
        log(f"[提示] 参考图 {path.stat().st_size // 1024 // 1024}MB 偏大且未找到 ffmpeg，原样上传（可能卡住）")
        return path
    out = path.with_name(f"{path.stem}_agnes_{int(time.time())}.jpg")
    cmd = [
        ffmpeg, "-y", "-loglevel", "error", "-i", str(path),
        "-vf", "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'",
        "-q:v", "3", str(out),
    ]
    try:
        subprocess.run(cmd, check=True, timeout=180)
    except Exception as e:
        log(f"[提示] 压缩失败（{e}），原样上传")
        return path
    log(f"[压缩] {path.name} {path.stat().st_size // 1024}KB -> {out.name} {out.stat().st_size // 1024}KB")
    return out


def upload_local_image(path: Path, kind: str) -> str:
    """本地图片上传：先压大图，默认 catbox，失败自动降级 uguu。"""
    path = ensure_small_image(path)
    log(f"[上传] {kind} -> catbox（免 Token）...")
    try:
        return upload_to_catbox(path)
    except RuntimeError as e:
        log(f"[上传] catbox 失败（{str(e)[:90]}），降级 uguu ...")
    try:
        return upload_to_uguu(path)
    except RuntimeError as e:
        die(f"catbox 与 uguu 均上传失败：{e}")


def resolve_media(value: str, kind: str) -> str:
    """把本地路径或 URL 统一解析成公网 URL。"""
    if value.startswith(("http://", "https://")):
        return value
    p = Path(value)
    if not p.is_file():
        die(f"{kind} 文件不存在：{value}")

    upload = os.environ.get("AGNES_UPLOAD", "uguu").lower()
    if upload == "none":
        die(
            f"{kind} 是本地文件（{value}），但 AGNES_UPLOAD=none。\n"
            "请先上传到公网，再传入 URL；或把 AGNES_UPLOAD 改为 catbox。"
        )
    if upload == "catbox":
        url = upload_local_image(p, kind)
    elif upload == "uguu":
        p = ensure_small_image(p)
        log(f"[上传] {kind} -> uguu（免 Token，Agnes 后端可回源）...")
        url = upload_to_uguu(p)
    elif upload == "smms":
        token = os.environ.get("SMMS_TOKEN", "").strip()
        if not token:
            die("AGNES_UPLOAD=smms 但缺少 SMMS_TOKEN；改用 AGNES_UPLOAD=catbox，或直接传公网 URL")
        p = ensure_small_image(p)
        log(f"[上传] {kind} -> sm.ms ...")
        url = upload_to_smms(p, token)
    else:
        die("AGNES_UPLOAD 只支持 uguu、catbox、smms、none")
    log(f"[上传] 完成：{url}")
    return url


# ---------------------------------------------------------------------------
# 任务创建与轮询
# ---------------------------------------------------------------------------

def create_task(api_key: str, api_base: str, payload: dict) -> dict:
    log(f"[提交] model={payload['model']} mode={payload['mode']} size={payload['size']} ...")
    try:
        result = http_json(
            f"{api_base}/videos",
            method="POST",
            headers={"Authorization": f"Bearer {api_key}"},
            body=payload,
            timeout=300,
        )
    except RetryableNetworkError as e:
        die(
            f"提交请求超时或连接中断：{e}\n"
            "为避免异步任务重复创建，脚本不会自动重投。请等待一分钟后确认任务列表，确认未创建再手动重试。"
        )
    video_id = result.get("video_id") or result.get("id")
    if not video_id:
        die(f"创建任务未返回 video_id：{json.dumps(result, ensure_ascii=False)}")
    log(f"[提交] 成功，video_id={video_id}")
    return {"video_id": video_id, "raw": result}


def poll_task(api_key: str, query_base: str, video_id: str, model: str, timeout_s: int, interval: int = 5) -> str:
    params = {"video_id": video_id}
    # 非 text 模式必须带 model_name（text 模式带上也兼容）
    params["model_name"] = model
    url = f"{query_base}/agnesapi?" + urllib.parse.urlencode(params)
    started = time.time()
    log(f"[轮询] 每 {interval} 秒查询一次，最长等待 {timeout_s} 秒 ...")
    while True:
        if time.time() - started > timeout_s:
            die(f"等待超时（{timeout_s}s）。可稍后手动查询：video_id={video_id}")
        try:
            result = http_json(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=30)
        except RetryableNetworkError as e:
            log(f"[轮询] 网络暂时中断：{str(e)[:80]}，稍后继续 ...")
            time.sleep(interval)
            continue
        status = str(result.get("status", "")).lower()
        elapsed = int(time.time() - started)
        if status in ("completed", "success", "succeeded"):
            meta = result.get("metadata") or {}
            video_url = meta.get("url") or result.get("url") or result.get("video_url")
            if not video_url:
                die(f"任务完成但未找到视频 URL：{json.dumps(result, ensure_ascii=False)[:800]}")
            log(f"[完成] 耗时约 {elapsed} 秒")
            return video_url
        if status in ("failed", "error"):
            die(f"任务失败：{json.dumps(result, ensure_ascii=False)[:800]}")
        time.sleep(interval)


def download(url: str, out_dir: Path, video_id: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{video_id}.mp4"
    log(f"[下载] {url}")
    try:
        with urllib.request.urlopen(url, timeout=300) as resp, open(out, "wb") as f:
            while True:
                chunk = resp.read(1 << 16)
                if not chunk:
                    break
                f.write(chunk)
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        die(f"下载失败：{e}")
    log(f"[下载] 已保存：{out}")
    return out


# ---------------------------------------------------------------------------
# 参数构建
# ---------------------------------------------------------------------------

def build_payload(args) -> dict:
    model = args.model
    if model not in MODELS:
        die(f"model 必须是 {MODELS}")
    size = args.size
    if size not in SIZES_BY_MODEL[model]:
        die(f"{model} 仅支持分辨率 {SIZES_BY_MODEL[model]}，收到 {size}")
    if args.ar not in ASPECTS:
        die(f"aspect_ratio 必须是 {ASPECTS}")
    if not (4 <= args.seconds <= 12):
        die("seconds 必须在 4~12 之间")

    payload = {
        "model": model,
        "prompt": args.prompt,
        "seconds": str(args.seconds),
        "size": size,
        "aspect_ratio": args.ar,
        "mode": args.mode,
    }

    if args.mode == "text":
        if args.first_frame or args.last_frame or args.images:
            die("text 模式不能传任何媒体参数")
    elif args.mode == "keyframe":
        if not (args.first_frame or args.last_frame):
            die("keyframe 模式至少需要 --first-frame 或 --last-frame")
        if args.first_frame:
            payload["first_frame"] = resolve_media(args.first_frame, "首帧图片")
        if args.last_frame:
            payload["last_frame"] = resolve_media(args.last_frame, "尾帧图片")
        if args.images:
            if len(args.images) > 5:
                die("参考图最多 5 张（免费额度内），超出需删减")
            payload["images"] = [resolve_media(x, f"参考图{i+1}") for i, x in enumerate(args.images)]
    elif args.mode == "reference":
        if not args.images:
            die("reference 模式至少需要一张 --images")
        if args.first_frame or args.last_frame:
            die("reference 模式不能传 --first-frame / --last-frame")
        if len(args.images) > 5:
            die("参考图最多 5 张（免费额度内），超出需删减")
        payload["images"] = [resolve_media(x, f"参考图{i+1}") for i, x in enumerate(args.images)]
    return payload


# ---------------------------------------------------------------------------
# 命令行
# ---------------------------------------------------------------------------

def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="agnes_video",
        description="Agnes Video 2.5 / Flash 视频生成 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("mode", choices=["text", "keyframe", "reference"], help="生成模式")
    p.add_argument("--prompt", required=True, help="提示词。reference 模式可用 <Picture N> 引用的图片")
    p.add_argument("--model", default="agnes-video-2.5-flash", choices=MODELS,
                   help="默认 flash（当前免费）；出正式成片用 agnes-video-2.5")
    p.add_argument("--seconds", type=int, default=5, help="输出时长 4~12 秒，默认 5")
    p.add_argument("--ar", default="16:9", choices=ASPECTS, help="画面比例，默认 16:9；竖屏用 9:16")
    p.add_argument("--size", default="720P", help="分辨率：flash 仅 720P；标准版可选 720P/960P/2K")
    p.add_argument("--first-frame", help="首帧图片（本地路径或 URL），keyframe 模式")
    p.add_argument("--last-frame", help="尾帧图片（本地路径或 URL），keyframe 模式")
    p.add_argument("--images", nargs="+", help="参考图列表（最多5张），reference 模式")
    p.add_argument("--out", default="E:/agnes", help="视频保存目录，默认 E:/agnes")
    p.add_argument("--timeout", type=int, default=900, help="轮询超时秒数，默认 900")
    p.add_argument("--no-download", action="store_true", help="只返回链接，不下载")
    return p


def configure_proxy() -> None:
    """urllib 默认不读取系统代理环境变量；本机若设了 HTTPS_PROXY/HTTP_PROXY 则启用，
    否则直连 apihub.agnes-ai.com 会被卡死/超时。"""
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") \
        or os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
    if not proxy:
        return
    hp = urllib.request.ProxyHandler({"http": proxy, "https": proxy})
    urllib.request.install_opener(urllib.request.build_opener(hp))
    log(f"[代理] 已启用系统代理：{proxy}")


def main() -> None:
    configure_proxy()
    args = make_parser().parse_args()
    api_key = get_api_key()
    api_base, query_base = normalize_base(os.environ.get("AGNES_BASE_URL", DEFAULT_BASE))
    payload = build_payload(args)

    log("=" * 60)
    log("请求参数：")
    safe = dict(payload)
    log(json.dumps(safe, ensure_ascii=False, indent=2))
    log("=" * 60)

    task = create_task(api_key, api_base, payload)
    video_url = poll_task(api_key, query_base, task["video_id"], args.model, args.timeout)
    log(f"[结果] 视频地址：{video_url}")

    if not args.no_download:
        out = download(video_url, Path(args.out), task["video_id"])
        log(f"\n完成！文件：{out.resolve()}")
    else:
        log("\n完成！（未下载，链接可能有时效，请及时保存）")


if __name__ == "__main__":
    main()
