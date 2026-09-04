#!/usr/bin/env python3
import argparse
import csv
import json
from pathlib import Path

from faster_whisper import WhisperModel


def fmt(sec):
    m = int(sec // 60)
    s = sec - m * 60
    return f"{m:02d}:{s:06.3f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--episode-id", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--model", default="medium")
    ap.add_argument("--language", default="zh")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--compute-type", default="int8")
    ap.add_argument("--local-files-only", action="store_true")
    args = ap.parse_args()

    audio = Path(args.audio)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    if not audio.exists():
        raise SystemExit(f"Audio not found: {audio}")

    model = WhisperModel(
        args.model,
        device=args.device,
        compute_type=args.compute_type,
        local_files_only=args.local_files_only,
    )
    segments, info = model.transcribe(
        str(audio),
        language=args.language,
        vad_filter=True,
        beam_size=5,
        word_timestamps=False,
    )

    rows = []
    for i, seg in enumerate(segments, 1):
        text = (seg.text or "").strip()
        if not text:
            continue
        rows.append({
            "index": i,
            "speaker": "speaker_unknown",
            "start": f"{seg.start:.3f}",
            "end": f"{seg.end:.3f}",
            "start_timecode": fmt(seg.start),
            "end_timecode": fmt(seg.end),
            "text": text,
            "avg_logprob": f"{getattr(seg, 'avg_logprob', 0.0):.4f}",
            "no_speech_prob": f"{getattr(seg, 'no_speech_prob', 0.0):.4f}",
            "notes": "speaker unresolved; assign in Step 02 using frame evidence",
        })

    csv_path = out_dir / f"{args.episode_id}_transcript_segments.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["index", "speaker", "start", "end", "start_timecode", "end_timecode", "text", "avg_logprob", "no_speech_prob", "notes"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    json_path = out_dir / f"{args.episode_id}_transcript_segments.json"
    payload = {
        "episode_id": args.episode_id,
        "audio": str(audio),
        "model": args.model,
        "language": getattr(info, "language", args.language),
        "language_probability": getattr(info, "language_probability", None),
        "diarization": "not_available",
        "segments": rows,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({"ok": True, "segments": len(rows), "csv": str(csv_path), "json": str(json_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
