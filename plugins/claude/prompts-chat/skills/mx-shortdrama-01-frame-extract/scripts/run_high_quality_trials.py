#!/usr/bin/env python3
import argparse
import csv
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def run(cmd, cwd=None, env=None, timeout=None):
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout


def read_csv(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def timecode(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def stamp(sec):
    sec = max(0.0, float(sec))
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms >= 1000:
        s += 1
        ms -= 1000
    return f"{h}_{m:02d}_{s:02d}_{ms:03d}"


def video_meta(video):
    import cv2

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return fps, total


def run_omnishotcut(args, trials_dir, summary):
    omni_dir = Path(args.omnishotcut_dir) if args.omnishotcut_dir else None
    hq_python = Path(args.hq_python) if args.hq_python else None
    if not omni_dir or not hq_python or not hq_python.exists():
        summary["omnishotcut"] = {"ok": False, "reason": "missing hq python or OmniShotCut dir"}
        return
    ckpt = omni_dir / "checkpoints" / "OmniShotCut_ckpt.pth"
    if not ckpt.exists():
        summary["omnishotcut"] = {"ok": False, "reason": f"missing checkpoint: {ckpt}"}
        return

    out = trials_dir / f"omnishotcut_{args.episode_id}"
    out.mkdir(parents=True, exist_ok=True)
    result_json = out / f"{args.episode_id}_omnishotcut_default_results.json"
    visual_dir = out / "visual_default"
    cmd = [
        str(hq_python),
        str(omni_dir / "inference.py"),
        "--checkpoint_path",
        str(ckpt),
        "--input_video_path",
        str(args.video),
        "--result_store_path",
        str(result_json),
        "--visual_store_folder_path",
        str(visual_dir),
        "--overlap_window_length",
        "20",
        "--mode",
        "default",
    ]
    code, output = run(cmd, cwd=omni_dir, timeout=args.timeout)
    (out / f"{args.episode_id}_omnishotcut.log").write_text(output, encoding="utf-8")
    if code != 0 or not result_json.exists():
        summary["omnishotcut"] = {"ok": False, "returncode": code, "log": str(out / f"{args.episode_id}_omnishotcut.log")}
        return

    fps, total = video_meta(args.video)
    data = json.loads(result_json.read_text(encoding="utf-8"))[0]
    rows = []
    for i, rg in enumerate(data.get("pred_ranges", []), 1):
        a, b = int(rg[0]), int(rg[1])
        rows.append(
            {
                "shot_id": i,
                "start_frame": a,
                "end_frame": b,
                "start_sec": round(a / fps, 3),
                "end_sec": round(b / fps, 3),
                "start_timecode": timecode(a / fps),
                "end_timecode": timecode(b / fps),
                "intra_label": data.get("pred_intra_labels", [""] * len(rows))[i - 1] if i - 1 < len(data.get("pred_intra_labels", [])) else "",
                "inter_label": data.get("pred_inter_labels", [""] * len(rows))[i - 1] if i - 1 < len(data.get("pred_inter_labels", [])) else "",
            }
        )
    omni_csv = out / f"{args.episode_id}_omnishotcut_shots.csv"
    write_csv(omni_csv, rows)

    trans_csv = Path(args.out_dir) / "transnet_shots" / f"{args.episode_id}_transnet_shots.csv"
    comp = {}
    if trans_csv.exists():
        trans = read_csv(trans_csv)
        omni_bound = [int(r["end_frame"]) for r in rows[:-1]]
        trans_bound = [int(float(r["end_frame"])) for r in trans[:-1]]
        diffs = []
        matched = 0
        for b in omni_bound:
            nearest = min(trans_bound, key=lambda x: abs(x - b)) if trans_bound else None
            if nearest is None:
                continue
            d = abs(nearest - b)
            diffs.append(d)
            if d <= 5:
                matched += 1
        comp = {
            "transnet_shot_count": len(trans),
            "omnishotcut_boundaries": len(omni_bound),
            "transnet_boundaries": len(trans_bound),
            "omnishotcut_boundaries_within_5_frames_of_transnet": matched,
            "median_nearest_boundary_diff_frames": sorted(diffs)[len(diffs) // 2] if diffs else None,
            "max_nearest_boundary_diff_frames": max(diffs) if diffs else None,
        }
    summary["omnishotcut"] = {
        "ok": True,
        "shot_count": len(rows),
        "csv": str(omni_csv),
        "visual_dir": str(visual_dir),
        **comp,
    }


def prepare_subtitle_crops(args, trials_dir, summary):
    try:
        from PIL import Image
    except Exception as exc:
        summary["subtitle_crops"] = {"ok": False, "reason": repr(exc)}
        return None, []

    ocr_csv = Path(args.out_dir) / "subtitle_ocr" / f"{args.episode_id}_subtitle_ocr.csv"
    if not ocr_csv.exists():
        summary["subtitle_crops"] = {"ok": False, "reason": f"missing {ocr_csv}"}
        return None, []
    rows = read_csv(ocr_csv)
    out = trials_dir / f"rapid_videocr_{args.episode_id}"
    rgb = out / "RGBImages"
    if rgb.exists():
        shutil.rmtree(rgb)
    rgb.mkdir(parents=True, exist_ok=True)

    manifest = []
    for i, row in enumerate(rows):
        start = float(row["time_sec"])
        end = float(rows[i + 1]["time_sec"]) if i + 1 < len(rows) else start + 1.2
        end = max(end, start + 0.6)
        src = Path(args.out_dir) / "reference_frames_original" / row["frame_file"]
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        w, h = im.size
        y0, y1 = int(h * 0.54), int(h * 0.78)
        crop = im.crop((0, y0, w, y1))
        fname = f"{stamp(start)}__{stamp(end)}_0000000000{w:04d}{y0:04d}{w:04d}{y1:04d}.jpeg"
        dst = rgb / fname
        crop.save(dst, quality=96)
        manifest.append(
            {
                "source_frame": str(src),
                "crop": str(dst),
                "start": start,
                "end": end,
                "known_rapidocr_text": row["subtitle_text"],
            }
        )
    (out / "input_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    summary["subtitle_crops"] = {"ok": True, "count": len(manifest), "rgb_dir": str(rgb)}
    return rgb, manifest


def run_rapid_videocr(args, rgb_dir, manifest, trials_dir, summary):
    if not rgb_dir or not manifest or not args.hq_python:
        summary["rapid_videocr"] = {"ok": False, "reason": "missing crops or hq python"}
        return
    exe = Path(args.hq_python).parent / "Scripts" / "rapid_videocr.exe"
    if not exe.exists():
        exe = Path(args.hq_python).parent / "rapid_videocr.exe"
    if not exe.exists():
        summary["rapid_videocr"] = {"ok": False, "reason": f"missing rapid_videocr exe near {args.hq_python}"}
        return
    out = trials_dir / f"rapid_videocr_{args.episode_id}" / "outputs"
    cmd = [str(exe), "-i", str(rgb_dir), "-s", str(out), "-f", f"{args.episode_id}_rapid_videocr", "-o", "all"]
    code, output = run(cmd, timeout=args.timeout)
    (out.parent / f"{args.episode_id}_rapid_videocr.log").write_text(output, encoding="utf-8")
    txt = out / f"{args.episode_id}_rapid_videocr.txt"
    if code != 0 or not txt.exists():
        summary["rapid_videocr"] = {"ok": False, "returncode": code, "log": str(out.parent / f"{args.episode_id}_rapid_videocr.log")}
        return
    rapid = [line.strip() for line in txt.read_text(encoding="utf-8").splitlines() if line.strip()]
    current = [m["known_rapidocr_text"].strip() for m in manifest]
    sims = [difflib.SequenceMatcher(None, a, b).ratio() for a, b in zip(current, rapid)]
    summary["rapid_videocr"] = {
        "ok": True,
        "count": len(rapid),
        "same_as_current": sum(1 for a, b in zip(current, rapid) if a == b),
        "avg_similarity": round(sum(sims) / len(sims), 3) if sims else None,
        "low_similarity_count": sum(1 for s in sims if s < 0.85),
        "txt": str(txt),
    }


def run_paddleocr(args, manifest, trials_dir, summary):
    if not manifest or not args.paddle_python:
        summary["paddleocr"] = {"ok": False, "reason": "missing manifest or paddle python"}
        return
    paddle_python = Path(args.paddle_python)
    if not paddle_python.exists():
        summary["paddleocr"] = {"ok": False, "reason": f"missing {paddle_python}"}
        return
    out = trials_dir / f"paddleocr_{args.episode_id}"
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "input_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    script = out / "run_paddleocr_helper.py"
    script.write_text(
        """
import csv, json, sys
from pathlib import Path
from paddleocr import PaddleOCR
manifest = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out_dir = Path(sys.argv[2])
ocr = PaddleOCR(use_angle_cls=False, lang='ch', show_log=False, use_gpu=False)
rows = []
for i, item in enumerate(manifest, 1):
    try:
        res = ocr.ocr(item['crop'], cls=False)
        texts, scores = [], []
        if res and res[0]:
            for det in res[0]:
                texts.append(det[1][0].strip())
                scores.append(float(det[1][1]))
        text = ' '.join(t for t in texts if t)
        score = round(sum(scores) / len(scores), 4) if scores else ''
        error = ''
    except Exception as exc:
        text, score, error = '', '', repr(exc)
    rows.append({'order': i, 'known_rapidocr_text': item['known_rapidocr_text'], 'paddle_text': text, 'score': score, 'error': error})
with (out_dir / 'paddleocr_results.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
(out_dir / 'paddleocr_results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
""",
        encoding="utf-8",
    )
    code, output = run([str(paddle_python), str(script), str(manifest_path), str(out)], timeout=args.timeout)
    (out / "paddleocr.log").write_text(output, encoding="utf-8")
    results = out / "paddleocr_results.json"
    if code != 0 or not results.exists():
        summary["paddleocr"] = {"ok": False, "returncode": code, "log": str(out / "paddleocr.log")}
        return
    rows = json.loads(results.read_text(encoding="utf-8"))
    sims = [difflib.SequenceMatcher(None, r["known_rapidocr_text"], r["paddle_text"]).ratio() for r in rows]
    summary["paddleocr"] = {
        "ok": True,
        "count": len(rows),
        "same_as_current": sum(1 for r in rows if r["known_rapidocr_text"] == r["paddle_text"]),
        "avg_similarity": round(sum(sims) / len(sims), 3) if sims else None,
        "low_similarity_count": sum(1 for s in sims if s < 0.85),
        "errors": sum(1 for r in rows if r.get("error")),
        "json": str(results),
    }


def run_asr(args, trials_dir, summary):
    if not args.run_asr or not args.hq_python:
        summary["asr"] = {"ok": False, "reason": "not requested or missing hq python"}
        return
    audio = Path(args.out_dir) / "audio" / f"{args.episode_id}_16k_mono.wav"
    if not audio.exists():
        summary["asr"] = {"ok": False, "reason": f"missing audio: {audio}"}
        return
    out = trials_dir / f"asr_{args.episode_id}"
    out.mkdir(parents=True, exist_ok=True)
    helper = out / "run_asr_helper.py"
    script_dir = Path(__file__).resolve().parent
    qwen3_asr_python = Path.home() / "anaconda3" / "envs" / "qwen3_asr312" / "python.exe"
    model_cache_dir = args.project_root / "tools" / "model_cache" / "huggingface"
    helper.write_text(
        f"""
import csv, json, sys
from argparse import Namespace
from pathlib import Path
sys.path.insert(0, {str(script_dir)!r})
from build_audio_evidence import run_qwen3_asr, run_faster_whisper, write_srt

audio, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
episode_id = sys.argv[3]
base_args = Namespace(
    skip_asr=False,
    asr_model='Qwen/Qwen3-ASR-1.7B',
    asr_aligner_model='Qwen/Qwen3-ForcedAligner-0.6B',
    asr_enable_timestamps=True,
    asr_python={str(qwen3_asr_python)!r},
    asr_language='zh',
    asr_device_map='auto',
    asr_dtype='auto',
    asr_max_inference_batch_size=1,
    asr_aligner_batch_size=16,
    model_cache_dir={str(model_cache_dir)!r},
    local_files_only=False,
    out_dir=out_dir,
    asr_device='auto',
    asr_compute_type='auto',
    asr_beam_size=5,
    faster_whisper_model='large-v3-turbo',
)
out = {{}}
rows, status = run_qwen3_asr(audio, episode_id, base_args)
out['qwen3_asr'] = status
if not status.get('ok'):
    fallback_rows, fallback_status = run_faster_whisper(audio, episode_id, base_args)
    fallback_status['fallback_from'] = [status]
    rows, status = fallback_rows, fallback_status
    out['faster_whisper_large-v3-turbo'] = fallback_status
if rows:
    json_path = out_dir / 'asr_segments.json'
    csv_path = out_dir / 'asr_segments.csv'
    srt_path = out_dir / 'asr_segments.srt'
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    with csv_path.open('w', encoding='utf-8-sig', newline='') as f:
        fields = ['index', 'speaker', 'start', 'end', 'start_timecode', 'end_timecode', 'text', 'source_tool', 'notes']
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in rows:
            w.writerow({{field: row.get(field, '') for field in fields}})
    write_srt(srt_path, rows)
    out['selected_asr'] = {{'ok': True, 'backend': status.get('backend'), 'segments': len(rows), 'json': str(json_path), 'csv': str(csv_path), 'srt': str(srt_path)}}
else:
    out['selected_asr'] = {{'ok': False, 'backend': status.get('backend'), 'reason': status.get('reason')}}
(out_dir / 'asr_summary.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(out, ensure_ascii=False, indent=2))
""",
        encoding="utf-8",
    )
    env = os.environ.copy()
    env["HF_ENDPOINT"] = "https://hf-mirror.com"
    env.setdefault("MODELSCOPE_CACHE", str(Path(args.project_root) / "tool_trials" / "modelscope_cache"))
    code, output = run([str(args.hq_python), str(helper), str(audio), str(out), args.episode_id], env=env, timeout=args.timeout)
    (out / "asr.log").write_text(output, encoding="utf-8")
    asr_sum = out / "asr_summary.json"
    if code != 0 or not asr_sum.exists():
        summary["asr"] = {"ok": False, "returncode": code, "log": str(out / "asr.log")}
    else:
        summary["asr"] = {"ok": True, "summary": json.loads(asr_sum.read_text(encoding="utf-8"))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--hq-python")
    parser.add_argument("--paddle-python")
    parser.add_argument("--omnishotcut-dir")
    parser.add_argument("--run-asr", action="store_true")
    parser.add_argument("--timeout", type=int, default=1800)
    args = parser.parse_args()
    args.video = Path(args.video)
    args.out_dir = Path(args.out_dir)
    args.project_root = Path(args.project_root)

    trials_dir = args.project_root / "tool_trials"
    trials_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "episode_id": args.episode_id,
        "video": str(args.video),
        "out_dir": str(args.out_dir),
        "selection": {
            "shot_default": "TransNetV2 stable + OmniShotCut QA when available",
            "ocr_default": "RapidOCR hard subtitles",
            "asr_default": "ASR auxiliary only; Qwen3-ASR-1.7B + ForcedAligner preferred for Chinese timing, faster-whisper remains fallback",
        },
    }
    run_omnishotcut(args, trials_dir, summary)
    rgb_dir, manifest = prepare_subtitle_crops(args, trials_dir, summary)
    run_rapid_videocr(args, rgb_dir, manifest, trials_dir, summary)
    run_paddleocr(args, manifest, trials_dir, summary)
    run_asr(args, trials_dir, summary)

    out = trials_dir / f"{args.episode_id}_high_quality_trial_summary.json"
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "summary": str(out)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
