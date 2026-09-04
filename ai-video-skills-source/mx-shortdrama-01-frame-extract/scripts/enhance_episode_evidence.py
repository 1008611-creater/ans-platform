#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import shutil
import sqlite3
from pathlib import Path

import cv2

CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")


def timecode(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def write_image(path, frame):
    ok, buf = cv2.imencode(path.suffix, frame, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    if not ok:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    buf.tofile(str(path))
    return True


def video_meta(video):
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return {
        "fps": fps,
        "frame_count": total,
        "width": width,
        "height": height,
        "duration": total / fps if fps else 0,
    }


def read_frame_at_index(video, frame_index):
    cap = cv2.VideoCapture(str(video))
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, int(frame_index)))
    ok, frame = cap.read()
    cap.release()
    return frame if ok else None


def find_ffmpeg_dir():
    found = shutil.which("ffmpeg")
    if found:
        return str(Path(found).parent)
    workspace_ffmpeg = Path(r"D:\codex-work\aaa\tools\bin\ffmpeg.exe")
    if workspace_ffmpeg.exists():
        return str(workspace_ffmpeg.parent)
    try:
        import imageio_ffmpeg

        exe = Path(imageio_ffmpeg.get_ffmpeg_exe())
        return str(exe.parent)
    except Exception:
        return None


def run_transnet(video, episode_id, out_dir, threshold, torch_threads=None):
    transnet_dir = out_dir / "transnet_shots"
    keyframes_dir = transnet_dir / "keyframes"
    transnet_dir.mkdir(parents=True, exist_ok=True)
    try:
        from transnetv2_pytorch import TransNetV2
    except Exception as exc:
        status = {"ok": False, "reason": f"transnetv2_pytorch unavailable: {exc}"}
        (transnet_dir / f"{episode_id}_transnet_status.json").write_text(
            json.dumps(status, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return status, []

    ffmpeg_dir = find_ffmpeg_dir()
    if ffmpeg_dir:
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

    meta = video_meta(video)
    try:
        import torch

        if torch_threads:
            torch.set_num_threads(int(torch_threads))
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"
    model = TransNetV2(device=device)
    scenes = model.detect_scenes(str(video), threshold=threshold)
    rows = []
    for scene in scenes:
        shot_id = int(scene.get("shot_id", len(rows) + 1))
        start_frame = int(scene["start_frame"])
        end_frame = int(scene["end_frame"])
        mid_frame = int((start_frame + end_frame) / 2)
        mid_sec = mid_frame / meta["fps"]
        keyframe = f"{episode_id}_shot_{shot_id:03d}_{timecode(mid_sec).replace(':', '-')}.png"
        frame = read_frame_at_index(video, mid_frame)
        if frame is not None:
            write_image(keyframes_dir / keyframe, frame)
        rows.append({
            "shot_id": shot_id,
            "start_frame": start_frame,
            "end_frame": end_frame,
            "mid_frame": mid_frame,
            "start_sec": round(start_frame / meta["fps"], 3),
            "end_sec": round(end_frame / meta["fps"], 3),
            "mid_sec": round(mid_sec, 3),
            "start_timecode": timecode(start_frame / meta["fps"]),
            "end_timecode": timecode(end_frame / meta["fps"]),
            "mid_timecode": timecode(mid_sec),
            "probability": scene.get("probability", ""),
            "keyframe": keyframe,
        })

    if not rows:
        status = {"ok": False, "reason": "TransNetV2 returned no scenes"}
        return status, []

    csv_path = transnet_dir / f"{episode_id}_transnet_shots.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = list(rows[0].keys())
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    json_path = transnet_dir / f"{episode_id}_transnet_shots.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    status = {
        "ok": True,
        "shot_count": len(rows),
        "csv": str(csv_path),
        "json": str(json_path),
        "keyframes_dir": str(keyframes_dir),
    }
    return status, rows


def load_manifest(out_dir, episode_id):
    manifest = out_dir / f"{episode_id}_frame_manifest.json"
    if not manifest.exists():
        raise SystemExit(f"Missing manifest: {manifest}")
    rows = json.loads(manifest.read_text(encoding="utf-8"))
    for row in rows:
        row["time_float"] = float(row["time_sec"])
    return rows


def transnet_shot_for_time(shots, time_sec):
    if not shots:
        return ""
    for shot in shots:
        if float(shot["start_sec"]) <= time_sec <= float(shot["end_sec"]):
            return shot["shot_id"]
    nearest = min(shots, key=lambda s: abs(float(s["mid_sec"]) - time_sec))
    return nearest["shot_id"]


def is_probable_chinese_subtitle(text):
    cleaned = re.sub(r"\s+", "", text)
    chinese_count = len(CHINESE_RE.findall(cleaned))
    return chinese_count >= 2


def run_rapidocr(out_dir, episode_id, manifest_rows, min_score):
    ocr_dir = out_dir / "subtitle_ocr"
    ocr_dir.mkdir(parents=True, exist_ok=True)
    try:
        from rapidocr_onnxruntime import RapidOCR
    except Exception as exc:
        status = {"ok": False, "reason": f"rapidocr_onnxruntime unavailable: {exc}"}
        (ocr_dir / f"{episode_id}_subtitle_ocr_status.json").write_text(
            json.dumps(status, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return status, []

    ocr = RapidOCR()
    rows = []
    for row in manifest_rows:
        frame_path = Path(row["path"])
        image = cv2.imdecode(
            __import__("numpy").fromfile(str(frame_path), dtype=__import__("numpy").uint8),
            cv2.IMREAD_COLOR,
        )
        if image is None:
            continue
        height = image.shape[0]
        result, _ = ocr(str(frame_path))
        subtitle_lines = []
        if result:
            for item in result:
                box, text, score_raw = item[0], str(item[1]).strip(), float(item[2])
                y_center = sum(point[1] for point in box) / 4
                # Burned-in short-drama subtitles in vertical frames usually sit below center.
                in_subtitle_band = height * 0.54 <= y_center <= height * 0.78
                if text and score_raw >= min_score and in_subtitle_band and is_probable_chinese_subtitle(text):
                    subtitle_lines.append({
                        "text": text,
                        "score": round(score_raw, 4),
                        "y_center": round(y_center, 1),
                    })
        subtitle_text = " ".join(line["text"] for line in subtitle_lines)
        if subtitle_text:
            rows.append({
                "order": row["order"],
                "time_sec": row["time_sec"],
                "timecode": row["timecode"],
                "frame_file": row["file"],
                "subtitle_text": subtitle_text,
                "avg_score": round(sum(line["score"] for line in subtitle_lines) / len(subtitle_lines), 4),
                "lines": subtitle_lines,
            })

    csv_path = ocr_dir / f"{episode_id}_subtitle_ocr.csv"
    fieldnames = ["order", "time_sec", "timecode", "frame_file", "subtitle_text", "avg_score"]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row[k] for k in fieldnames})
    json_path = ocr_dir / f"{episode_id}_subtitle_ocr.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    srt_path = ocr_dir / f"{episode_id}_subtitle_ocr_dedup.srt"
    write_srt(rows, srt_path)

    status = {
        "ok": True,
        "subtitle_frame_count": len(rows),
        "csv": str(csv_path),
        "json": str(json_path),
        "srt": str(srt_path),
    }
    return status, rows


def write_srt(rows, srt_path):
    deduped = []
    last_text = None
    for row in rows:
        text = row["subtitle_text"]
        if text == last_text:
            continue
        deduped.append(row)
        last_text = text
    lines = []
    for i, row in enumerate(deduped, 1):
        start = float(row["time_sec"])
        end = float(deduped[i]["time_sec"]) if i < len(deduped) else start + 2.0
        end = max(end, start + 0.8)
        lines.extend([
            str(i),
            f"{srt_time(start)} --> {srt_time(end)}",
            row["subtitle_text"],
            "",
        ])
    srt_path.write_text("\n".join(lines), encoding="utf-8")


def srt_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


def write_evidence_pack(out_dir, episode_id, manifest_rows, transnet_rows, subtitle_rows, statuses):
    subtitle_by_order = {int(row["order"]): row for row in subtitle_rows}
    pack_rows = []
    for row in manifest_rows:
        order = int(row["order"])
        pack_rows.append({
            "episode_id": episode_id,
            "order": order,
            "time_sec": float(row["time_sec"]),
            "timecode": row["timecode"],
            "frame_file": row["file"],
            "frame_path": row["path"],
            "opencv_shot_id": row.get("shot_id", ""),
            "transnet_shot_id": transnet_shot_for_time(transnet_rows, float(row["time_sec"])),
            "reason": row["reason"],
            "subtitle_ocr": subtitle_by_order.get(order, {}).get("subtitle_text", ""),
            "subtitle_ocr_score": subtitle_by_order.get(order, {}).get("avg_score", ""),
        })
    jsonl_path = out_dir / f"{episode_id}_evidence_pack.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for row in pack_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    sqlite_path = out_dir / f"{episode_id}_evidence_pack.sqlite"
    write_sqlite(sqlite_path, pack_rows, transnet_rows, subtitle_rows, statuses)
    json_path = out_dir / f"{episode_id}_evidence_pack_summary.json"
    json_path.write_text(
        json.dumps({
            "episode_id": episode_id,
            "frame_count": len(manifest_rows),
            "subtitle_ocr_count": len(subtitle_rows),
            "transnet_shot_count": len(transnet_rows),
            "statuses": statuses,
            "evidence_jsonl": str(jsonl_path),
            "evidence_sqlite": str(sqlite_path),
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return jsonl_path, json_path


def write_sqlite(sqlite_path, pack_rows, transnet_rows, subtitle_rows, statuses):
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    if sqlite_path.exists():
        sqlite_path.unlink()
    conn = sqlite3.connect(sqlite_path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            create table evidence_frames (
                episode_id text,
                frame_order integer,
                time_sec real,
                timecode text,
                frame_file text,
                frame_path text,
                opencv_shot_id text,
                transnet_shot_id text,
                reason text,
                subtitle_ocr text,
                subtitle_ocr_score text
            )
            """
        )
        cur.executemany(
            """
            insert into evidence_frames values (
                :episode_id, :order, :time_sec, :timecode, :frame_file, :frame_path,
                :opencv_shot_id, :transnet_shot_id, :reason, :subtitle_ocr, :subtitle_ocr_score
            )
            """,
            pack_rows,
        )
        cur.execute(
            """
            create table transnet_shots (
                shot_id integer,
                start_frame integer,
                end_frame integer,
                mid_frame integer,
                start_sec real,
                end_sec real,
                mid_sec real,
                start_timecode text,
                end_timecode text,
                mid_timecode text,
                probability text,
                keyframe text
            )
            """
        )
        if transnet_rows:
            cur.executemany(
                """
                insert into transnet_shots values (
                    :shot_id, :start_frame, :end_frame, :mid_frame, :start_sec,
                    :end_sec, :mid_sec, :start_timecode, :end_timecode,
                    :mid_timecode, :probability, :keyframe
                )
                """,
                transnet_rows,
            )
        cur.execute(
            """
            create table subtitle_ocr (
                frame_order integer,
                time_sec real,
                timecode text,
                frame_file text,
                subtitle_text text,
                avg_score real
            )
            """
        )
        if subtitle_rows:
            cur.executemany(
                """
                insert into subtitle_ocr values (
                    :order, :time_sec, :timecode, :frame_file, :subtitle_text, :avg_score
                )
                """,
                subtitle_rows,
            )
        cur.execute("create table run_status (layer text primary key, status_json text)")
        cur.executemany(
            "insert into run_status values (?, ?)",
            [(layer, json.dumps(status, ensure_ascii=False)) for layer, status in statuses.items()],
        )
        conn.commit()
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--transnet-threshold", type=float, default=0.5)
    parser.add_argument("--ocr-min-score", type=float, default=0.45)
    parser.add_argument("--transnet-torch-threads", type=int, default=0)
    parser.add_argument("--skip-transnet", action="store_true")
    parser.add_argument("--skip-ocr", action="store_true")
    args = parser.parse_args()

    video = Path(args.video)
    out_dir = Path(args.out_dir)
    manifest_rows = load_manifest(out_dir, args.episode_id)
    statuses = {}
    transnet_rows = []
    subtitle_rows = []
    if not args.skip_transnet:
        statuses["transnet"], transnet_rows = run_transnet(video, args.episode_id, out_dir, args.transnet_threshold, args.transnet_torch_threads)
    if not args.skip_ocr:
        statuses["rapidocr"], subtitle_rows = run_rapidocr(out_dir, args.episode_id, manifest_rows, args.ocr_min_score)
    jsonl_path, summary_path = write_evidence_pack(
        out_dir,
        args.episode_id,
        manifest_rows,
        transnet_rows,
        subtitle_rows,
        statuses,
    )
    print(json.dumps({
        "ok": True,
        "episode_id": args.episode_id,
        "transnet": statuses.get("transnet"),
        "rapidocr": statuses.get("rapidocr"),
        "evidence_jsonl": str(jsonl_path),
        "summary": str(summary_path),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
