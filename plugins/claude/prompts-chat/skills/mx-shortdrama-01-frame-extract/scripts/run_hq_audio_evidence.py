#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from build_audio_evidence import (
    energy_vad,
    silero_vad,
    write_csv,
    write_json,
)


LEDGER_FIELDS = [
    "event_id",
    "start_sec",
    "end_sec",
    "timecode",
    "layer",
    "speaker",
    "text",
    "emotion",
    "event",
    "confidence",
    "source_tool",
    "notes",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--skip-qwen3", action="store_true")
    parser.add_argument("--skip-sensevoice", action="store_true", help="Legacy alias; ignored.")
    args = parser.parse_args()

    audio = Path(args.audio)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    status = {}
    try:
        vad_rows, silence_rows, peak_rows, vad_status = silero_vad(audio, args.episode_id)
        if vad_rows is None:
            fallback_from = vad_status
            vad_rows, silence_rows, peak_rows, vad_status = energy_vad(audio, args.episode_id)
            vad_status["fallback_from"] = fallback_from
    except Exception as exc:
        vad_rows, silence_rows, peak_rows = [], [], []
        vad_status = {
            "ok": False,
            "status": "failed",
            "method": "silero_or_energy_vad",
            "reason": f"{exc.__class__.__name__}: {exc}",
        }

    silero_csv = out_dir / f"{args.episode_id}_silero_vad_segments.csv"
    silero_json = out_dir / f"{args.episode_id}_silero_vad_segments.json"
    write_csv(silero_csv, vad_rows or [], LEDGER_FIELDS)
    write_json(silero_json, {"episode_id": args.episode_id, "rows": vad_rows or [], "status": vad_status})
    status["silero_vad"] = {
        **vad_status,
        "csv": str(silero_csv),
        "json": str(silero_json),
        "rows": len(vad_rows or []),
    }
    status["qwen3_asr"] = {
        "ok": False,
        "status": "not_run_in_hq_helper",
        "reason": "main build_audio_evidence.py ASR path handles Qwen3-ASR to avoid duplicate transcript rows",
    }

    status_path = out_dir / f"{args.episode_id}_hq_audio_status.json"
    write_json(status_path, status)
    print(json.dumps({"ok": True, "status": str(status_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
