#!/usr/bin/env python3
import argparse
import csv
import json
import math
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def timecode(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def sharpness(gray):
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def hist_feature(frame):
    small = cv2.resize(frame, (96, 170), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [24, 16], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist.flatten()


def read_frame(cap, fps, t):
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    target_idx = max(0, int(round(t * fps)))
    if frame_count > 0:
        target_idx = min(frame_count - 1, target_idx)
    cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
    ok, frame = cap.read()
    if not ok:
        return None
    idx = max(0, int(cap.get(cv2.CAP_PROP_POS_FRAMES)) - 1)
    actual_t = idx / fps
    return idx, actual_t, frame


def add_time(times, t, reason, shot_id=None, min_gap=0.18, priority=50):
    if t < 0:
        return
    existing = times.get(round(t, 3))
    if existing:
        existing["reasons"].add(reason)
        existing["priority"] = max(existing.get("priority", 0), priority)
        if shot_id is not None:
            existing["shot_id"] = shot_id
        return
    for old in times:
        if abs(old - t) < min_gap:
            times[old]["reasons"].add(reason)
            times[old]["priority"] = max(times[old].get("priority", 0), priority)
            if shot_id is not None and not times[old].get("shot_id"):
                times[old]["shot_id"] = shot_id
            return
    times[round(t, 3)] = {"reasons": {reason}, "shot_id": shot_id, "priority": priority}


def nearest_sample(samples, t):
    if not samples:
        return None
    return min(samples, key=lambda s: abs(s["t"] - t))


def parse_seconds(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        pass
    if ":" not in text:
        return None
    parts = text.split(":")
    try:
        parts = [float(part) for part in parts]
    except ValueError:
        return None
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return None


def load_audio_event_rows(paths):
    rows = []
    for raw_path in paths or []:
        path = Path(raw_path)
        if not path.exists():
            continue
        if path.suffix.lower() == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data = data.get("events") or data.get("segments") or data.get("rows") or []
            if isinstance(data, list):
                rows.extend([row for row in data if isinstance(row, dict)])
            continue
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            rows.extend(csv.DictReader(f))
    return rows


def add_audio_event_times(times, rows, duration, min_gap):
    count = 0
    for row in rows:
        start = parse_seconds(row.get("start_sec") or row.get("start") or row.get("begin") or row.get("time_sec") or row.get("timecode"))
        end = parse_seconds(row.get("end_sec") or row.get("end") or row.get("stop"))
        label = str(row.get("event") or row.get("label") or row.get("type") or row.get("text") or "").lower()
        layer = str(row.get("layer") or "").lower()
        if layer in {"sfx", "music", "bgm"} or any(token in label for token in ["sfx", "music", "bgm", "audio_peak", "sound_effect", "background_music"]):
            continue
        if start is None:
            continue
        safe_start = min(max(start, 0.0), max(0.0, duration - 0.04))
        if "dialog" in label or "speech" in label or "asr" in label or row.get("speaker"):
            reason_start = "dialogue_start"
            reason_end = "dialogue_end"
            priority = 94
        else:
            reason_start = "audio_event"
            reason_end = "audio_event"
            priority = 90
        add_time(times, safe_start, reason_start, min_gap=min_gap, priority=priority)
        count += 1
        if end is not None and end > start:
            safe_end = min(max(end, safe_start), max(0.0, duration - 0.04))
            mid = safe_start + (safe_end - safe_start) / 2
            add_time(times, mid, "audio_event_mid", min_gap=min_gap, priority=priority - 1)
            add_time(times, safe_end, reason_end, min_gap=min_gap, priority=priority)
    return count


def finalize_times(times, samples, duration, target_frames, min_frames, max_frames):
    target_frames = max(min_frames, min(max_frames, target_frames))
    for t, meta in list(times.items()):
        s = nearest_sample(samples, t)
        meta["sharp"] = s["sharp"] if s else 0.0
        meta["score"] = meta.get("priority", 0) * 1000 + min(meta["sharp"], 999)

    candidates = sorted(times.items(), key=lambda item: item[0])
    if len(candidates) < min_frames:
        gap_count = min_frames - len(candidates)
        for i in range(gap_count):
            t = duration * (i + 0.5) / gap_count
            add_time(times, min(t, duration - 0.04), "coverage", min_gap=0.22, priority=35)
        candidates = sorted(times.items(), key=lambda item: item[0])

    selected = {}
    bin_count = target_frames
    for i in range(bin_count):
        a = duration * i / bin_count
        b = duration * (i + 1) / bin_count
        in_bin = [(t, meta) for t, meta in candidates if a <= t < b]
        if not in_bin:
            continue
        t, meta = max(in_bin, key=lambda item: item[1].get("score", 0))
        selected[t] = meta

    protected_reasons = {"subtitle_change", "shot_start", "shot_mid", "shot_mid_sharp", "shot_end", "key_change"}
    protected = [
        (t, meta) for t, meta in candidates
        if meta["reasons"] & protected_reasons
    ]
    for t, meta in sorted(protected, key=lambda item: item[1].get("score", 0), reverse=True):
        if any(abs(t - old) < 0.22 for old in selected):
            continue
        if len(selected) < max_frames:
            selected[t] = meta
            continue
        removable = [
            (old, old_meta) for old, old_meta in selected.items()
            if not (old_meta["reasons"] & {"subtitle_change", "shot_start", "shot_end"})
        ]
        if not removable:
            continue
        old, old_meta = min(removable, key=lambda item: item[1].get("score", 0))
        if meta.get("score", 0) > old_meta.get("score", 0):
            selected.pop(old)
            selected[t] = meta

    if len(selected) < min_frames:
        remaining = [
            (t, meta) for t, meta in sorted(candidates, key=lambda item: item[1].get("score", 0), reverse=True)
            if t not in selected and not any(abs(t - old) < 0.18 for old in selected)
        ]
        for t, meta in remaining:
            selected[t] = meta
            if len(selected) >= min_frames:
                break

    while len(selected) > max_frames:
        removable = [
            (t, meta) for t, meta in selected.items()
            if not (meta["reasons"] & {"subtitle_change", "shot_start", "shot_end"})
        ] or list(selected.items())
        t, _ = min(removable, key=lambda item: item[1].get("score", 0))
        selected.pop(t)

    return dict(sorted(selected.items(), key=lambda item: item[0]))


def finalize_unbounded_times(times, samples, duration):
    if not times and duration > 0:
        add_time(times, min(duration / 2, duration - 0.04), "coverage", min_gap=0.0, priority=35)

    for t, meta in list(times.items()):
        s = nearest_sample(samples, t)
        meta["sharp"] = s["sharp"] if s else 0.0
        meta["score"] = meta.get("priority", 0) * 1000 + min(meta["sharp"], 999)

    return dict(sorted(times.items(), key=lambda item: item[0]))


def build_contact_sheet(rows, out_path):
    thumbs = []
    font_path = r"C:\Windows\Fonts\msyh.ttc"
    font = ImageFont.truetype(font_path, 20) if Path(font_path).exists() else ImageFont.load_default()
    for row in rows:
        img_path = Path(row["path"])
        if not img_path.exists():
            print(f"[WARN] contact sheet skipped missing frame: {img_path}")
            continue
        img = Image.open(img_path).convert("RGB")
        img.thumbnail((180, 320))
        canvas = Image.new("RGB", (180, 370), "white")
        canvas.paste(img, ((180 - img.width) // 2, 48))
        d = ImageDraw.Draw(canvas)
        d.rectangle((0, 0, 180, 48), fill=(20, 20, 20))
        d.text((4, 2), f'{row["order"]:03d} {row["timecode"]}', fill="white", font=font)
        d.text((4, 24), row["reason"][:18], fill="white", font=font)
        thumbs.append(canvas)
    if not thumbs:
        print("[WARN] contact sheet skipped because no frame images were available")
        return
    cols = 5
    sheet = Image.new("RGB", (cols * 180, math.ceil(len(thumbs) / cols) * 370), "#cccccc")
    for i, img in enumerate(thumbs):
        sheet.paste(img, ((i % cols) * 180, (i // cols) * 370))
    sheet.save(out_path, quality=92)


def write_minute_chunks(rows, out_dir, episode_id, chunk_sec):
    if chunk_sec <= 0:
        return None, []

    chunk_dir = out_dir / "minute_chunks"
    chunk_dir.mkdir(parents=True, exist_ok=True)
    for stale in chunk_dir.glob(f"{episode_id}_minute_*"):
        stale.unlink()

    groups = {}
    for row in rows:
        chunk_index = int(float(row["time_sec"]) // chunk_sec) + 1
        groups.setdefault(chunk_index, []).append(row)

    fieldnames = ["order", "file", "path", "time_sec", "timecode", "frame_index", "shot_id", "reason", "sharpness", "motion_score"]
    chunks = []
    for chunk_index in sorted(groups):
        chunk_rows = groups[chunk_index]
        start = (chunk_index - 1) * chunk_sec
        end = chunk_index * chunk_sec
        base = f"{episode_id}_minute_{chunk_index:03d}_{timecode(start).replace(':', '-')}_to_{timecode(end).replace(':', '-')}"
        csv_path = chunk_dir / f"{base}.csv"
        json_path = chunk_dir / f"{base}.json"
        with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for row in chunk_rows:
                w.writerow({k: row[k] for k in fieldnames})
        json_path.write_text(json.dumps(chunk_rows, ensure_ascii=False, indent=2), encoding="utf-8")
        chunks.append({
            "chunk_index": chunk_index,
            "start_sec": round(start, 3),
            "end_sec": round(end, 3),
            "start_timecode": timecode(start),
            "end_timecode": timecode(end),
            "frame_count": len(chunk_rows),
            "csv": str(csv_path),
            "json": str(json_path),
        })

    index_path = chunk_dir / f"{episode_id}_minute_chunks_index.json"
    index_path.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")
    return index_path, chunks


def write_shot_list(shots, fps, out_dir, episode_id):
    rows = []
    for shot_id, (a, b) in enumerate(shots, 1):
        rows.append({
            "shot_id": shot_id,
            "start_sec": f"{a:.3f}",
            "end_sec": f"{b:.3f}",
            "duration_sec": f"{(b - a):.3f}",
            "start_timecode": timecode(a),
            "end_timecode": timecode(b),
            "start_frame": int(round(a * fps)),
            "end_frame": int(round(b * fps)),
        })
    csv_path = out_dir / f"{episode_id}_shot_list.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["shot_id", "start_sec", "end_sec", "duration_sec", "start_timecode", "end_timecode", "start_frame", "end_frame"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    json_path = out_dir / f"{episode_id}_shot_list.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return csv_path, json_path, rows


def write_shotlevel_supplement(video, shots, fps, total, duration, out_dir, episode_id):
    supplement_dir = out_dir / "shotlevel_start_mid_end_frames"
    supplement_dir.mkdir(parents=True, exist_ok=True)
    for stale in supplement_dir.glob("*.png"):
        stale.unlink()

    cap = cv2.VideoCapture(str(video))
    rows = []
    for shot_id, (a, b) in enumerate(shots, 1):
        safe_start = min(max(a + 0.04, 0.0), max(0.0, duration - 0.04))
        safe_end = min(max(b - 0.04, safe_start), max(0.0, duration - 0.04))
        points = [
            ("start", safe_start),
            ("mid", min(max((a + b) / 2, 0.0), max(0.0, duration - 0.04))),
            ("end", safe_end),
        ]
        for point, t in points:
            result = read_frame(cap, fps, t)
            if result is None:
                continue
            frame_index, actual_t, frame = result
            frame_index = max(0, min(total - 1, frame_index))
            fname = f'{episode_id}_S{shot_id:03d}_{point}_{timecode(actual_t).replace(":", "-")}.png'
            path = supplement_dir / fname
            cv2.imwrite(str(path), frame, [cv2.IMWRITE_PNG_COMPRESSION, 1])
            rows.append({
                "shot_id": shot_id,
                "point": point,
                "time_sec": f"{actual_t:.3f}",
                "timecode": timecode(actual_t),
                "frame_index": frame_index,
                "source_start": f"{a:.3f}",
                "source_end": f"{b:.3f}",
                "file": fname,
                "path": str(path),
            })
    cap.release()

    csv_path = out_dir / "shotlevel_start_mid_end_manifest.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["shot_id", "point", "time_sec", "timecode", "frame_index", "source_start", "source_end", "file", "path"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    json_path = out_dir / "shotlevel_start_mid_end_manifest.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return csv_path, json_path, rows


def extract_audio(video, out_dir, episode_id, skip_audio=False):
    audio_dir = out_dir / "audio"
    audio_path = audio_dir / f"{episode_id}_16k_mono.wav"
    if skip_audio:
        return audio_path, "skipped"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return audio_path, "ffmpeg_not_found"
    audio_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(video),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        str(audio_path),
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as exc:
        return audio_path, f"failed:{exc.__class__.__name__}"
    return audio_path, "ok" if audio_path.exists() else "failed:no_output"


def write_asr_handoff(out_dir, episode_id, audio_path, audio_status):
    path = out_dir / f"{episode_id}_asr_handoff.md"
    path.write_text(
        f"# {episode_id} ASR Handoff\n\n"
        f"- Audio file: `{audio_path}`\n"
        f"- Audio extraction status: `{audio_status}`\n"
        f"- Preferred local ASR: `Qwen/Qwen3-ASR-1.7B` with `Qwen/Qwen3-ForcedAligner-0.6B` for timestamped transcript/SRT output.\n"
        f"- Fallback/comparison ASR only: faster-whisper, WhisperX, or cloud diarized ASR when Qwen3 is unavailable or timed out. Do not treat SenseVoice/FunASR as the default truth.\n"
        f"- Required transcript columns: `speaker | start | end | text | confidence | notes`.\n"
        f"- Speaker rule: mark off-screen staff, background couples, broadcast, phone voice, and main characters separately. Do not assign procedural/background lines to the heroine unless evidence supports it.\n",
        encoding="utf-8",
    )
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--episode-id", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--analysis-fps", type=float, default=4.0)
    ap.add_argument("--target-frames", type=int)
    ap.add_argument("--min-frames", type=int)
    ap.add_argument("--max-frames", type=int)
    ap.add_argument("--bounded", action="store_true", help="Use legacy min/target/max frame selection.")
    ap.add_argument("--unbounded", action="store_true", help="Explicitly use evidence coverage without a fixed frame cap. This is the redraw default.")
    ap.add_argument("--chunk-sec", type=float, default=60.0, help="Write per-minute chunk manifests for long episodes; 0 disables chunk manifests.")
    ap.add_argument("--dense-motion-interval", type=float, default=0.5, help="In unbounded mode, add motion coverage frames at this interval inside long shots.")
    ap.add_argument("--audio-events", action="append", default=[], help="CSV/JSON dialogue, silence, breath, emotion, or story information-cue ledger used to add audio-timed frame candidates.")
    ap.add_argument("--audio-event-min-gap", type=float, default=0.12)
    ap.add_argument("--skip-audio", action="store_true")
    ap.add_argument("--skip-shotlevel-supplement", action="store_true")
    args = ap.parse_args()
    bounded = args.bounded and not args.unbounded

    video = Path(args.video)
    out_dir = Path(args.out_dir)
    frames_dir = out_dir / "reference_frames_original"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for stale in frames_dir.glob("*.png"):
        stale.unlink()

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total / fps

    step = 1.0 / args.analysis_fps
    sample_every = max(1, int(round(fps / args.analysis_fps)))
    samples = []
    prev_hist = None
    prev_bottom = None
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % sample_every != 0 and idx != total - 1:
            idx += 1
            continue
        actual_t = idx / fps
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hist = hist_feature(frame)
        diff = 0.0 if prev_hist is None else float(cv2.compareHist(prev_hist.astype("float32"), hist.astype("float32"), cv2.HISTCMP_BHATTACHARYYA))
        bottom = cv2.resize(gray[int(height * 0.62):int(height * 0.93), :], (160, 60), interpolation=cv2.INTER_AREA)
        bottom_diff = 0.0 if prev_bottom is None else float(np.mean(np.abs(bottom.astype("float32") - prev_bottom.astype("float32"))))
        samples.append({"t": actual_t, "idx": idx, "diff": diff, "bottom_diff": bottom_diff, "sharp": sharpness(gray)})
        prev_hist = hist
        prev_bottom = bottom
        idx += 1

    cuts = [0.0]
    for s in samples[1:]:
        if s["diff"] > 0.42:
            cuts.append(s["t"])
    cuts.append(duration)
    cuts = sorted(set(round(x, 2) for x in cuts))
    shots = [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1) if cuts[i + 1] - cuts[i] > 0.18]
    shot_csv, shot_json, shot_rows = write_shot_list(shots, fps, out_dir, args.episode_id)
    audio_path, audio_status = extract_audio(video, out_dir, args.episode_id, args.skip_audio)
    asr_handoff = write_asr_handoff(out_dir, args.episode_id, audio_path, audio_status)
    if bounded:
        duration_capacity = max(1, int(duration / 0.22))
        default_min = min(duration_capacity, max(120, min(260, len(shots) * 2 if shots else 120)))
        default_target = min(duration_capacity, max(default_min, min(520, (len(shots) * 3 + 40) if shots else 220)))
        default_max = min(duration_capacity, max(default_target, min(720, (len(shots) * 4 + 80) if shots else 360)))
        min_frames = args.min_frames if args.min_frames is not None else default_min
        target_frames = args.target_frames if args.target_frames is not None else default_target
        max_frames = args.max_frames if args.max_frames is not None else default_max
    else:
        min_frames = args.min_frames
        target_frames = args.target_frames
        max_frames = args.max_frames

    times = {}
    if bounded and (min_frames < 1 or max_frames < min_frames):
        raise SystemExit("--min-frames must be positive and <= --max-frames")
    audio_event_rows = load_audio_event_rows(args.audio_events)
    audio_event_count = add_audio_event_times(times, audio_event_rows, duration, args.audio_event_min_gap)

    if bounded:
        for i in range(target_frames):
            t = duration * (i + 0.5) / target_frames
            add_time(times, min(t, duration - 0.04), "baseline", min_gap=0.22, priority=30)

    for shot_id, (a, b) in enumerate(shots, 1):
        mid = (a + b) / 2
        add_time(times, a + 0.04, "shot_start", shot_id, priority=82)
        add_time(times, mid, "shot_mid", shot_id, priority=78)
        add_time(times, b - 0.04, "shot_end", shot_id, priority=82)
        in_shot = [s for s in samples if a <= s["t"] <= b]
        if in_shot:
            best = max(in_shot, key=lambda x: x["sharp"])
            add_time(times, best["t"], "shot_mid_sharp", shot_id, priority=86)
            motion = np.median([s["diff"] for s in in_shot]) if len(in_shot) > 1 else 0
            if bounded and (motion > 0.12 or b - a > 2.5):
                add_time(times, a + (b - a) * 0.33, "motion", shot_id, min_gap=0.18, priority=58)
                add_time(times, a + (b - a) * 0.66, "motion", shot_id, min_gap=0.18, priority=58)
            elif (not bounded) and args.dense_motion_interval > 0 and b - a > args.dense_motion_interval * 1.5:
                t = a + args.dense_motion_interval
                while t < b - 0.08:
                    add_time(times, t, "motion_interval", shot_id, min_gap=0.16, priority=55)
                    t += args.dense_motion_interval

    for s in samples:
        if s["bottom_diff"] > 15:
            add_time(times, s["t"], "subtitle_change", min_gap=0.30, priority=95)
        if s["diff"] > 0.22:
            add_time(times, s["t"], "key_change", min_gap=0.30, priority=72)

    if bounded:
        times = finalize_times(times, samples, duration, target_frames, min_frames, max_frames)
    else:
        times = finalize_unbounded_times(times, samples, duration)

    rows = []
    targets = []
    for order, (t, meta) in enumerate(sorted(times.items()), 1):
        target_idx = max(0, min(total - 1, int(round(min(t, duration - 0.04) * fps))))
        targets.append((target_idx, order, meta))
    target_map = {}
    for target_idx, order, meta in targets:
        target_map.setdefault(target_idx, []).append((order, meta))

    cap2 = cv2.VideoCapture(str(video))
    idx = 0
    remaining = set(target_map.keys())
    while remaining:
        ok, frame = cap2.read()
        if not ok:
            break
        if idx in target_map:
            for order, meta in target_map[idx]:
                actual_t = idx / fps
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                reason = "+".join(sorted(meta["reasons"]))
                fname = f'{args.episode_id}_{order:03d}_{timecode(actual_t).replace(":", "-")}_{reason[:28].replace("+", "-")}.png'
                path = frames_dir / fname
                cv2.imwrite(str(path), frame, [cv2.IMWRITE_PNG_COMPRESSION, 1])
                motion_score = next((s["diff"] for s in samples if abs(s["t"] - actual_t) < step / 2), 0.0)
                rows.append({
                    "order": order,
                    "file": fname,
                    "path": str(path),
                    "time_sec": f"{actual_t:.3f}",
                    "timecode": timecode(actual_t),
                    "frame_index": idx,
                    "shot_id": meta.get("shot_id") or "",
                    "reason": reason,
                    "sharpness": f"{sharpness(gray):.2f}",
                    "motion_score": f"{motion_score:.4f}",
                })
            remaining.remove(idx)
        idx += 1
    cap.release()
    cap2.release()
    rows = sorted(rows, key=lambda r: r["order"])

    if bounded and not (min_frames <= len(rows) <= max_frames):
        raise SystemExit(f"Frame count {len(rows)} must be between {min_frames} and {max_frames}")

    csv_path = out_dir / f"{args.episode_id}_frame_manifest.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["order", "file", "time_sec", "timecode", "frame_index", "shot_id", "reason", "sharpness", "motion_score"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r[k] for k in fieldnames})

    json_path = out_dir / f"{args.episode_id}_frame_manifest.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    sheet_path = out_dir / f"{args.episode_id}_contact_sheet.jpg"
    build_contact_sheet(rows, sheet_path)
    chunk_index, chunks = write_minute_chunks(rows, out_dir, args.episode_id, args.chunk_sec)
    supplement_csv = ""
    supplement_count = 0
    if not args.skip_shotlevel_supplement:
        supplement_csv_path, _, supplement_rows = write_shotlevel_supplement(video, shots, fps, total, duration, out_dir, args.episode_id)
        supplement_csv = str(supplement_csv_path)
        supplement_count = len(supplement_rows)
    if bounded:
        requirement = f"{min_frames}-{max_frames} frames, target {target_frames}"
        policy = "bounded_legacy"
    else:
        requirement = f"unbounded evidence coverage, no fixed frame cap; {len(chunks)} chunk(s) of {args.chunk_sec:g}s"
        policy = "unbounded_evidence_coverage"

    summary = out_dir / f"{args.episode_id}_extraction_summary.md"
    summary.write_text(
        f"# {args.episode_id} Frame Extraction Summary\n\n"
        f"- Source: `{video}`\n"
        f"- Duration: {duration:.2f}s\n"
        f"- FPS: {fps:.3f}\n"
        f"- Resolution: {width}x{height}\n"
        f"- Extracted frames: {len(rows)}\n"
        f"- Requirement: {requirement}\n"
        f"- Extraction policy: `{policy}`\n"
        f"- Audio-event ledgers: {len(args.audio_events)} file(s), {audio_event_count} event row(s) used for frame candidates\n"
        f"- Shot list: `{shot_csv}` ({len(shot_rows)} shots)\n"
        f"- Shot-level start/mid/end supplement: `{supplement_csv}` ({supplement_count} frames)\n"
        f"- Audio: `{audio_path}` ({audio_status})\n"
        f"- ASR handoff: `{asr_handoff}`\n"
        f"- Manifest: `{csv_path}`\n"
        f"- Minute chunk index: `{chunk_index}`\n"
        f"- Original-quality reference frames: `{frames_dir}`\n"
        f"- Contact sheet preview only: `{sheet_path}`\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "ok": True,
        "frames": len(rows),
        "duration": duration,
        "shots": len(shot_rows),
        "shotlevel_supplement_frames": supplement_count,
        "shotlevel_supplement_manifest": supplement_csv,
        "audio_status": audio_status,
        "audio": str(audio_path),
        "asr_handoff": str(asr_handoff),
        "manifest": str(csv_path),
        "chunk_index": str(chunk_index) if chunk_index else "",
        "chunks": len(chunks),
        "extraction_policy": policy,
        "audio_event_ledgers": args.audio_events,
        "audio_event_rows_used": audio_event_count,
        "shot_list": str(shot_csv),
        "contact_sheet": str(sheet_path),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
