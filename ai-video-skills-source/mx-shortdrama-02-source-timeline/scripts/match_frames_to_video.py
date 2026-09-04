#!/usr/bin/env python3
import argparse
import csv
import json
import math
import re
from pathlib import Path

import cv2
import numpy as np


def timecode(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def feature_from_bgr(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return cv2.resize(gray, (54, 96), interpolation=cv2.INTER_AREA).reshape(-1).astype(np.float32)


def feature_from_image(path):
    img = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Cannot read image: {path}")
    return feature_from_bgr(img)


def number_key(path):
    m = re.search(r"(\d+)", path.stem)
    return int(m.group(1)) if m else 10**9


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--frames-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--episode-id", required=True)
    args = ap.parse_args()

    video = Path(args.video)
    frames_dir = Path(args.frames_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    images = sorted([p for p in frames_dir.rglob("*") if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}], key=number_key)
    if not images:
        raise SystemExit(f"No frames found in {frames_dir}")

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    feats = []
    times = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        feats.append(feature_from_bgr(frame))
        times.append(idx / fps)
        idx += 1
    cap.release()
    matrix = np.stack(feats, axis=0)
    times = np.array(times)

    rows = []
    for seq, path in enumerate(images, 1):
        f = feature_from_image(path)
        mse = np.mean((matrix - f) ** 2, axis=1)
        best = int(np.argmin(mse))
        best_time = float(times[best])
        mask = np.abs(times - best_time) > 0.5
        second = float(np.min(mse[mask])) if mask.any() else math.nan
        ratio = second / float(mse[best]) if mse[best] > 0 and not math.isnan(second) else 999
        confidence = "high" if float(mse[best]) < 120 or ratio > 1.6 else "check"
        rows.append({
            "seq": seq,
            "file": path.name,
            "path": str(path),
            "time_sec": round(best_time, 3),
            "timecode": timecode(best_time),
            "frame_index": best,
            "mse": round(float(mse[best]), 3),
            "second_mse": "" if math.isnan(second) else round(second, 3),
            "ratio": round(ratio, 3) if ratio != 999 else 999,
            "confidence": confidence,
        })

    rows = sorted(rows, key=lambda r: r["time_sec"])
    csv_path = out_dir / f"{args.episode_id}_frame_time_mapping_sorted.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    json_path = out_dir / f"{args.episode_id}_frame_time_mapping_sorted.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    low = [r for r in rows if r["confidence"] != "high"]
    print(json.dumps({"ok": True, "count": len(rows), "csv": str(csv_path), "low_confidence": low}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
