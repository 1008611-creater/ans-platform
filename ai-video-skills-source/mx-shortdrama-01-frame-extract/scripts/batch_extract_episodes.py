#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def run_step(cmd, log_file):
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("a", encoding="utf-8") as log:
        log.write("\n" + "=" * 80 + "\n")
        log.write(datetime.now().isoformat(timespec="seconds") + "\n")
        log.write(" ".join(f'"{part}"' if " " in str(part) else str(part) for part in cmd) + "\n")
        log.flush()
        proc = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, text=True)
    return proc.returncode


def episode_video(source_dir, episode_number, source_start):
    source_number = source_start + episode_number - 1
    return Path(source_dir) / f"{source_number:03d}.mp4"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--start-episode", type=int, default=1)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--source-start", type=int, default=1)
    parser.add_argument("--target-frames", type=int)
    parser.add_argument("--min-frames", type=int)
    parser.add_argument("--max-frames", type=int)
    parser.add_argument("--bounded", action="store_true", help="Use legacy bounded extraction and validate the target frame count.")
    parser.add_argument("--chunk-sec", type=float, default=60.0)
    parser.add_argument("--dense-motion-interval", type=float, default=0.5)
    parser.add_argument("--skip-asr", action="store_true")
    parser.add_argument("--asr-model", default="small")
    parser.add_argument("--asr-language", default="zh")
    parser.add_argument("--asr-device", default="cpu")
    parser.add_argument("--asr-compute-type", default="int8")
    parser.add_argument("--allow-asr-download", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    skill_dir = Path(__file__).resolve().parents[1]
    extract_script = skill_dir / "scripts" / "extract_episode_frames.py"
    enhance_script = skill_dir / "scripts" / "enhance_episode_evidence.py"
    transcribe_script = skill_dir / "scripts" / "transcribe_audio_faster_whisper.py"
    validate_script = skill_dir / "scripts" / "validate_episode_evidence.py"
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    batch_rows = []

    for episode_number in range(args.start_episode, args.start_episode + args.count):
        episode_id = f"EP{episode_number:03d}"
        video = episode_video(args.source_dir, episode_number, args.source_start)
        out_dir = output_root / f"{episode_id}_frames"
        summary = out_dir / f"{episode_id}_evidence_pack_summary.json"
        log_file = out_dir / f"{episode_id}_batch.log"

        row = {
            "episode_id": episode_id,
            "video": str(video),
            "out_dir": str(out_dir),
            "started_at": datetime.now().isoformat(timespec="seconds"),
            "status": "pending",
        }
        if not video.exists():
            row["status"] = "missing_video"
            batch_rows.append(row)
            continue
        if summary.exists() and not args.force:
            row["status"] = "skipped_existing"
            row["summary"] = str(summary)
            batch_rows.append(row)
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        extract_cmd = [
            sys.executable,
            str(extract_script),
            "--video",
            str(video),
            "--episode-id",
            episode_id,
            "--out-dir",
            str(out_dir),
            "--chunk-sec",
            str(args.chunk_sec),
            "--dense-motion-interval",
            str(args.dense_motion_interval),
        ]
        if args.bounded:
            extract_cmd.append("--bounded")
        if args.bounded and args.target_frames is not None:
            extract_cmd.extend(["--target-frames", str(args.target_frames)])
        if args.bounded and args.min_frames is not None:
            extract_cmd.extend(["--min-frames", str(args.min_frames)])
        if args.bounded and args.max_frames is not None:
            extract_cmd.extend(["--max-frames", str(args.max_frames)])
        code = run_step(extract_cmd, log_file)
        if code != 0:
            row["status"] = "extract_failed"
            row["returncode"] = code
            row["log"] = str(log_file)
            batch_rows.append(row)
            continue

        if not args.skip_asr:
            audio_path = out_dir / "audio" / f"{episode_id}_16k_mono.wav"
            if audio_path.exists():
                asr_cmd = [
                    sys.executable,
                    str(transcribe_script),
                    "--audio",
                    str(audio_path),
                    "--episode-id",
                    episode_id,
                    "--out-dir",
                    str(out_dir),
                    "--model",
                    args.asr_model,
                    "--language",
                    args.asr_language,
                    "--device",
                    args.asr_device,
                    "--compute-type",
                    args.asr_compute_type,
                ]
                if not args.allow_asr_download:
                    asr_cmd.append("--local-files-only")
                code = run_step(asr_cmd, log_file)
                if code != 0:
                    row["status"] = "asr_failed"
                    row["returncode"] = code
                    row["log"] = str(log_file)
                    batch_rows.append(row)
                    continue
                row["asr"] = str(out_dir / f"{episode_id}_transcript_segments.csv")
            else:
                row["asr"] = "skipped_missing_audio"

        enhance_cmd = [
            sys.executable,
            str(enhance_script),
            "--video",
            str(video),
            "--episode-id",
            episode_id,
            "--out-dir",
            str(out_dir),
        ]
        code = run_step(enhance_cmd, log_file)
        if code != 0:
            row["status"] = "enhance_failed"
            row["returncode"] = code
            row["log"] = str(log_file)
            batch_rows.append(row)
            continue

        validate_cmd = [
            sys.executable,
            str(validate_script),
            "--episode-id",
            episode_id,
            "--out-dir",
            str(out_dir),
        ]
        if args.bounded:
            validate_cmd.append("--bounded")
            if args.min_frames is not None:
                validate_cmd.extend(["--min-frames", str(args.min_frames)])
            if args.max_frames is not None:
                validate_cmd.extend(["--max-frames", str(args.max_frames)])
        if not args.skip_asr:
            validate_cmd.append("--require-asr")
        code = run_step(validate_cmd, log_file)
        if code != 0:
            row["status"] = "validation_failed"
            row["returncode"] = code
            row["validation"] = str(out_dir / f"{episode_id}_evidence_validation.json")
            row["log"] = str(log_file)
            batch_rows.append(row)
            continue

        row["status"] = "ok" if summary.exists() else "ok_missing_summary"
        row["summary"] = str(summary)
        row["validation"] = str(out_dir / f"{episode_id}_evidence_validation.json")
        row["log"] = str(log_file)
        row["finished_at"] = datetime.now().isoformat(timespec="seconds")
        batch_rows.append(row)

        batch_path = output_root / "batch_extract_status.json"
        batch_path.write_text(json.dumps(batch_rows, ensure_ascii=False, indent=2), encoding="utf-8")

    batch_path = output_root / "batch_extract_status.json"
    batch_path.write_text(json.dumps(batch_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "status": str(batch_path), "rows": batch_rows}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
