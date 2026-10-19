#!/usr/bin/env python3
"""
Deterministic Multi-Worker HyperFrames Renderer (Chromium + GSAP __seekTo + FFmpeg)
Renders 2570 frames (85.658s @ 30fps, 1920x1080) of hyperframes_stage/index.html
and muxes with Voice 02 + warm BGM into day01_ans_oil_style_16x9.mp4.
"""

import os
import sys
import time
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

REM_FFMPEG_DIR = "/Users/eeo/Downloads/eeo/xiaoke-experiments/diagnostics/company-review-git/node_modules/@remotion/compositor-darwin-arm64"
os.environ["PATH"] = f"{REM_FFMPEG_DIR}:/opt/homebrew/bin:/usr/local/bin:" + os.environ.get("PATH", "")
os.environ["DYLD_LIBRARY_PATH"] = f"{REM_FFMPEG_DIR}:" + os.environ.get("DYLD_LIBRARY_PATH", "")

BASE_DIR = "/Users/eeo/Downloads/ans/Easel/outputs/ans_preflight_verify/video_day01_indie_site"
STAGE_HTML = f"file://{BASE_DIR}/hyperframes_stage/index.html"
CHUNK_DIR = f"{BASE_DIR}/hyperframes_stage/chunks"
VOICE_ALL_M4A = f"{BASE_DIR}/_oil_voice_all.m4a"
MIXED_AUDIO_M4A = f"{BASE_DIR}/_oil_mixed_audio.m4a"
FINAL_MP4 = f"{BASE_DIR}/day01_ans_oil_style_16x9.mp4"
PREVIEW_SHEET = "/Users/eeo/.gemini/antigravity/brain/113124e0-caeb-4f07-9341-d6ab90161560/day01_oil_style_preview_sheet.png"

import json
FPS = 30
with open(f"{BASE_DIR}/clauses_timeline.json", "r", encoding="utf-8") as _f:
    TOTAL_DURATION = float(json.load(_f)["total_duration"])
TOTAL_FRAMES = int(round(TOTAL_DURATION * FPS))
NUM_WORKERS = 6


def render_chunk(worker_id: int, start_frame: int, end_frame: int, chunk_path: str) -> str:
    """Render frames [start_frame, end_frame) in headless Chromium and pipe to ffmpeg."""
    t0 = time.time()
    cmd = [
        "ffmpeg", "-y",
        "-loglevel", "error",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "16",
        "-pix_fmt", "yuv420p",
        chunk_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page.goto(STAGE_HTML, wait_until="networkidle")
        page.wait_for_timeout(300)

        count = end_frame - start_frame
        for idx, frame_num in enumerate(range(start_frame, end_frame)):
            t_sec = frame_num / float(FPS)
            page.evaluate(f"window.__seekTo({t_sec:.5f})")
            jpg_bytes = page.screenshot(type="jpeg", quality=94)
            proc.stdin.write(jpg_bytes)
            if (idx + 1) % 100 == 0 or (idx + 1) == count:
                elapsed = time.time() - t0
                fps_rate = (idx + 1) / max(elapsed, 0.001)
                print(f"[Worker {worker_id}] {idx + 1}/{count} frames ({fps_rate:.1f} fps)", flush=True)

        browser.close()

    proc.stdin.close()
    ret = proc.wait()
    if ret != 0:
        raise RuntimeError(f"Worker {worker_id} ffmpeg exited with code {ret}")
    return chunk_path


SAMPLE_TIMES = [
    (3.2,  "S1A · 3D Split-Tilt 对比：碎片化聊天框 + 手绘红叉"),
    (6.5,  "S1B · 3D Split-Tilt 对比：ANS 可复现生产系统 + 荧光笔"),
    (11.5, "S2A · 3D Page Scroll：倾斜透视网页平滑滚动"),
    (15.2, "S2B · Center-Outward Expansion + SVG 自绘连线 + 景深虚化"),
    (20.5, "S3A · 工程管线 Station 01：确定性脚本 + 80% 动态字号计数"),
    (26.5, "S3B · 工程管线 3 大视觉站点 + SVG 脉冲管道全连通"),
    (33.8, "S4 · Rack Focus 景深聚焦 + 三大透明契约 + 物理弹簧点击"),
    (43.5, "S5 · 去 AI 塑料味 3D 对比：廉价紫蓝霓虹 vs Bento/瑞士网格"),
    (49.5, "S6A · Dynamic Scale 动态计数 (300+ / 24套) + SVG 进度环"),
    (54.5, "S6B · 外行大白话一键转写大师级内行指令 + 物理点击"),
    (64.0, "S7 · 纯 3D 小恐龙展厅 + AI Tracking Box 实时追踪 + 戳脸互动"),
    (76.8, "S8 · 终章 CTA：ans.cauai.fun 物理按压回弹 + 12 线放射 Burst"),
]


def build_preview_sheet_direct(out_png: str):
    """Snapshot 12 key frames directly from headless Chromium for instant visual audit."""
    tmp_dir = f"{CHUNK_DIR}/preview_frames"
    os.makedirs(tmp_dir, exist_ok=True)
    thumbs = []
    tw, th = 640, 360
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page.goto(STAGE_HTML, wait_until="networkidle")
        page.wait_for_timeout(400)
        for idx, (t_sec, label) in enumerate(SAMPLE_TIMES):
            page.evaluate(f"window.__seekTo({t_sec:.5f})")
            frame_jpg = f"{tmp_dir}/direct_{idx:02d}.jpg"
            page.screenshot(path=frame_jpg, type="jpeg", quality=95)
            im = Image.open(frame_jpg).resize((tw, th), Image.Resampling.LANCZOS)
            thumbs.append(im)
        browser.close()
    cols, rows = 3, 4
    sheet = Image.new("RGB", (tw * cols, th * rows), (24, 24, 22))
    for idx, im in enumerate(thumbs):
        r, c = divmod(idx, cols)
        sheet.paste(im, (c * tw, r * th))
    sheet.save(out_png)
    print(f"Saved direct preview sheet to {out_png}", flush=True)


def build_preview_sheet(mp4_path: str, out_png: str):
    """Extract 12 key frames across all 5 Priority Acts and build a clean 3x4 preview sheet."""
    tmp_dir = f"{CHUNK_DIR}/preview_frames"
    os.makedirs(tmp_dir, exist_ok=True)
    thumbs = []
    tw, th = 640, 360
    for idx, (t_sec, label) in enumerate(SAMPLE_TIMES):
        frame_jpg = f"{tmp_dir}/f_{idx:02d}.jpg"
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-ss", f"{t_sec:.2f}",
            "-i", mp4_path,
            "-frames:v", "1",
            "-q:v", "2",
            frame_jpg,
        ], check=True)
        im = Image.open(frame_jpg).resize((tw, th), Image.Resampling.LANCZOS)
        thumbs.append(im)

    cols, rows = 3, 4
    sheet = Image.new("RGB", (tw * cols, th * rows), (24, 24, 22))
    for idx, im in enumerate(thumbs):
        r, c = divmod(idx, cols)
        sheet.paste(im, (c * tw, r * th))
    sheet.save(out_png)
    print(f"Saved preview sheet to {out_png}", flush=True)


def main():
    os.makedirs(CHUNK_DIR, exist_ok=True)
    if "--preview-only" in sys.argv:
        build_preview_sheet_direct(PREVIEW_SHEET)
        return
    t_start = time.time()
    print(f"Starting HyperFrames render: {TOTAL_FRAMES} frames @ {FPS}fps across {NUM_WORKERS} workers...", flush=True)

    frames_per_worker = (TOTAL_FRAMES + NUM_WORKERS - 1) // NUM_WORKERS
    tasks = []
    chunk_paths = []
    for w in range(NUM_WORKERS):
        s_f = w * frames_per_worker
        e_f = min(TOTAL_FRAMES, (w + 1) * frames_per_worker)
        if s_f >= e_f:
            break
        c_path = f"{CHUNK_DIR}/chunk_{w:02d}.mp4"
        chunk_paths.append(c_path)
        tasks.append((w, s_f, e_f, c_path))

    with ProcessPoolExecutor(max_workers=NUM_WORKERS) as ex:
        futs = {ex.submit(render_chunk, w, s_f, e_f, c_path): w for (w, s_f, e_f, c_path) in tasks}
        for fut in as_completed(futs):
            w = futs[fut]
            c_path = fut.result()
            print(f"[Main] Worker {w} finished -> {c_path}", flush=True)

    concat_list = f"{CHUNK_DIR}/concat.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for cp in chunk_paths:
            f.write(f"file '{cp}'\n")

    audio_src = MIXED_AUDIO_M4A if os.path.exists(MIXED_AUDIO_M4A) else VOICE_ALL_M4A
    print(f"Concatenating chunks and muxing audio ({audio_src})...", flush=True)
    mux_cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", concat_list,
        "-i", audio_src,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        FINAL_MP4,
    ]
    subprocess.run(mux_cmd, check=True)
    elapsed = time.time() - t_start
    print(f"Rendered {FINAL_MP4} in {elapsed:.1f}s!", flush=True)

    build_preview_sheet(FINAL_MP4, PREVIEW_SHEET)


if __name__ == "__main__":
    main()
