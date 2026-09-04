#!/usr/bin/env python3
import argparse
import csv
import json
import sqlite3
from pathlib import Path

import cv2


def load_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def fail(errors, message):
    errors.append(message)


def image_size(path):
    img = cv2.imdecode(__import__("numpy").fromfile(str(path), dtype=__import__("numpy").uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    return img.shape[1], img.shape[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--min-frames", type=int, default=120)
    parser.add_argument("--max-frames", type=int, default=720)
    parser.add_argument("--bounded", action="store_true", help="Enforce the legacy min/max frame-count range.")
    parser.add_argument("--require-asr", action="store_true")
    parser.add_argument("--require-audio-ledger", action="store_true")
    parser.add_argument("--allow-missing-shotlevel-supplement", action="store_true")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    errors = []
    warnings = []

    manifest_csv = out_dir / f"{args.episode_id}_frame_manifest.csv"
    manifest_json = out_dir / f"{args.episode_id}_frame_manifest.json"
    frames_dir = out_dir / "reference_frames_original"
    shot_csv = out_dir / f"{args.episode_id}_shot_list.csv"
    shotlevel_manifest = out_dir / "shotlevel_start_mid_end_manifest.csv"
    shotlevel_dir = out_dir / "shotlevel_start_mid_end_frames"
    summary_json = out_dir / f"{args.episode_id}_evidence_pack_summary.json"
    evidence_jsonl = out_dir / f"{args.episode_id}_evidence_pack.jsonl"
    evidence_sqlite = out_dir / f"{args.episode_id}_evidence_pack.sqlite"
    transnet_csv = out_dir / "transnet_shots" / f"{args.episode_id}_transnet_shots.csv"
    ocr_csv = out_dir / "subtitle_ocr" / f"{args.episode_id}_subtitle_ocr.csv"
    audio = out_dir / "audio" / f"{args.episode_id}_16k_mono.wav"
    asr_csv = out_dir / f"{args.episode_id}_transcript_segments.csv"
    asr_blocker = out_dir / f"{args.episode_id}_asr_blocker.json"
    audio_status_json = out_dir / f"{args.episode_id}_audio_tool_status.json"
    audio_event_csv = out_dir / f"{args.episode_id}_audio_event_ledger.csv"
    dialogue_ledger_csv = out_dir / f"{args.episode_id}_dialogue_ledger.csv"
    vad_csv = out_dir / f"{args.episode_id}_vad_segments.csv"

    for path in [manifest_csv, manifest_json, shot_csv, summary_json, evidence_jsonl, evidence_sqlite, transnet_csv, ocr_csv, audio]:
        if not path.exists():
            fail(errors, f"missing_required_file: {path}")
    if not args.allow_missing_shotlevel_supplement and not shotlevel_manifest.exists():
        fail(errors, f"missing_required_shotlevel_supplement: {shotlevel_manifest}")

    if args.require_asr and not asr_csv.exists():
        fail(errors, f"missing_required_asr: {asr_csv}")
    elif not asr_csv.exists():
        if asr_blocker.exists():
            warnings.append(f"asr_blocker_recorded: {asr_blocker}")
        else:
            warnings.append(f"missing_asr_optional: {asr_csv}")

    if args.require_audio_ledger:
        for path in [audio_status_json, audio_event_csv, dialogue_ledger_csv, vad_csv]:
            if not path.exists():
                fail(errors, f"missing_required_audio_evidence_file: {path}")

    manifest_rows = []
    if manifest_csv.exists():
        manifest_rows = load_csv(manifest_csv)
        if not manifest_rows:
            fail(errors, "frame_manifest_empty")
        if args.bounded and not (args.min_frames <= len(manifest_rows) <= args.max_frames):
            fail(errors, f"frame_count_out_of_range: {len(manifest_rows)} not in {args.min_frames}-{args.max_frames}")
        order_values = [int(r["order"]) for r in manifest_rows]
        if order_values != list(range(1, len(order_values) + 1)):
            fail(errors, "manifest_order_not_contiguous")
        time_values = [float(r["time_sec"]) for r in manifest_rows]
        if time_values != sorted(time_values):
            fail(errors, "manifest_not_sorted_by_time_sec")

    frame_files = sorted(frames_dir.glob("*.png")) if frames_dir.exists() else []
    if manifest_rows and len(frame_files) != len(manifest_rows):
        fail(errors, f"frame_file_count_mismatch: {len(frame_files)} files vs {len(manifest_rows)} manifest rows")

    if manifest_rows and frame_files:
        first_path = Path(manifest_rows[0].get("path") or frames_dir / manifest_rows[0]["file"])
        expected_size = image_size(first_path)
        if not expected_size:
            fail(errors, f"cannot_read_first_frame: {first_path}")
        else:
            checked = 0
            for row in manifest_rows:
                path = Path(row.get("path") or frames_dir / row["file"])
                if not path.exists():
                    fail(errors, f"missing_frame_file: {path}")
                    continue
                size = image_size(path)
                checked += 1
                if size != expected_size:
                    fail(errors, f"frame_resolution_mismatch: {path} {size} != {expected_size}")
            if checked and expected_size[0] < 720:
                fail(errors, f"reference_resolution_too_low: {expected_size}")

    shot_rows = load_csv(shot_csv) if shot_csv.exists() else []
    shotlevel_rows = load_csv(shotlevel_manifest) if shotlevel_manifest.exists() else []
    if shotlevel_manifest.exists():
        expected_min = len(shot_rows) * 3 if shot_rows else 1
        if len(shotlevel_rows) < expected_min:
            fail(errors, f"shotlevel_supplement_too_sparse: {len(shotlevel_rows)} rows, expected at least {expected_min}")
        shotlevel_files = sorted(shotlevel_dir.glob("*.png")) if shotlevel_dir.exists() else []
        if len(shotlevel_files) != len(shotlevel_rows):
            fail(errors, f"shotlevel_file_count_mismatch: {len(shotlevel_files)} files vs {len(shotlevel_rows)} manifest rows")

    transnet_rows = load_csv(transnet_csv) if transnet_csv.exists() else []
    if transnet_csv.exists() and len(transnet_rows) < 1:
        fail(errors, "transnet_shot_table_empty")

    ocr_rows = load_csv(ocr_csv) if ocr_csv.exists() else []
    if ocr_csv.exists() and len(ocr_rows) < 1:
        warnings.append("subtitle_ocr_empty")

    audio_event_rows = load_csv(audio_event_csv) if audio_event_csv.exists() else []
    dialogue_ledger_rows = load_csv(dialogue_ledger_csv) if dialogue_ledger_csv.exists() else []
    vad_rows = load_csv(vad_csv) if vad_csv.exists() else []
    if args.require_audio_ledger and not audio_event_rows:
        fail(errors, f"audio_event_ledger_empty: {audio_event_csv}")
    if args.require_audio_ledger and not dialogue_ledger_rows:
        fail(errors, f"dialogue_ledger_empty: {dialogue_ledger_csv}")
    if args.require_audio_ledger and not vad_rows:
        warnings.append(f"vad_segments_empty: {vad_csv}")
    if audio_event_rows:
        required_audio_keys = {"event_id", "start_sec", "end_sec", "layer", "event", "source_tool"}
        for row in audio_event_rows[:5]:
            missing = required_audio_keys - set(row)
            if missing:
                fail(errors, f"audio_event_ledger_missing_keys: {sorted(missing)}")
        frame_manifest_reasons = " ".join(row.get("reason", "") for row in manifest_rows)
        if args.require_audio_ledger and "audio_event" not in frame_manifest_reasons and "dialogue_" not in frame_manifest_reasons:
            warnings.append("audio_ledger_exists_but_no_audio_reason_seen_in_frame_manifest")

    jsonl_rows = []
    if evidence_jsonl.exists():
        raw = evidence_jsonl.read_text(encoding="utf-8").strip()
        jsonl_rows = [json.loads(line) for line in raw.splitlines()] if raw else []
        if manifest_rows and len(jsonl_rows) != len(manifest_rows):
            fail(errors, f"evidence_jsonl_count_mismatch: {len(jsonl_rows)} vs {len(manifest_rows)}")
        required_keys = {"episode_id", "order", "time_sec", "timecode", "frame_file", "frame_path", "opencv_shot_id", "transnet_shot_id", "reason", "subtitle_ocr"}
        for row in jsonl_rows[:5]:
            missing = required_keys - set(row)
            if missing:
                fail(errors, f"evidence_jsonl_missing_keys: {sorted(missing)}")

    sqlite_counts = {}
    if evidence_sqlite.exists():
        try:
            conn = sqlite3.connect(evidence_sqlite)
            cur = conn.cursor()
            for table in ["evidence_frames", "transnet_shots", "subtitle_ocr", "run_status"]:
                sqlite_counts[table] = cur.execute(f"select count(*) from {table}").fetchone()[0]
            conn.close()
            if manifest_rows and sqlite_counts.get("evidence_frames") != len(manifest_rows):
                fail(errors, f"sqlite_evidence_frame_count_mismatch: {sqlite_counts.get('evidence_frames')} vs {len(manifest_rows)}")
        except Exception as exc:
            fail(errors, f"sqlite_read_failed: {exc}")

    summary = {}
    if summary_json.exists():
        summary = json.loads(summary_json.read_text(encoding="utf-8"))
        if summary.get("frame_count") != len(manifest_rows):
            fail(errors, f"summary_frame_count_mismatch: {summary.get('frame_count')} vs {len(manifest_rows)}")
        if summary.get("transnet_shot_count") != len(transnet_rows):
            fail(errors, f"summary_transnet_count_mismatch: {summary.get('transnet_shot_count')} vs {len(transnet_rows)}")
        if summary.get("subtitle_ocr_count") != len(ocr_rows):
            fail(errors, f"summary_ocr_count_mismatch: {summary.get('subtitle_ocr_count')} vs {len(ocr_rows)}")

    report = {
        "ok": not errors,
        "episode_id": args.episode_id,
        "errors": errors,
        "warnings": warnings,
        "frame_count": len(manifest_rows),
        "reference_frame_files": len(frame_files),
        "shot_list_rows": len(shot_rows),
        "shotlevel_supplement_rows": len(shotlevel_rows),
        "transnet_shots": len(transnet_rows),
        "subtitle_ocr_rows": len(ocr_rows),
        "audio_event_rows": len(audio_event_rows),
        "dialogue_ledger_rows": len(dialogue_ledger_rows),
        "vad_rows": len(vad_rows),
        "jsonl_rows": len(jsonl_rows),
        "sqlite_counts": sqlite_counts,
        "asr_exists": asr_csv.exists(),
        "asr_blocker_exists": asr_blocker.exists(),
        "audio_tool_status_exists": audio_status_json.exists(),
        "frame_count_policy": "bounded_legacy" if args.bounded else "unbounded_evidence_coverage",
    }
    report_path = out_dir / f"{args.episode_id}_evidence_validation.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
