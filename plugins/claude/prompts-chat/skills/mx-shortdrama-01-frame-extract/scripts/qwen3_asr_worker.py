#!/usr/bin/env python3
import argparse
import json
import traceback
from pathlib import Path

import build_audio_evidence as audio_evidence


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--result-json", required=True)
    parser.add_argument("--asr-model", default="Qwen/Qwen3-ASR-1.7B")
    parser.add_argument("--asr-aligner-model", default="Qwen/Qwen3-ForcedAligner-0.6B")
    parser.add_argument("--asr-enable-timestamps", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--asr-device-map", default="auto")
    parser.add_argument("--asr-dtype", default="auto")
    parser.add_argument("--asr-max-inference-batch-size", type=int, default=1)
    parser.add_argument("--asr-aligner-batch-size", type=int, default=16)
    parser.add_argument("--asr-language", default="zh")
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--model-cache-dir", default=str(audio_evidence.DEFAULT_MODEL_CACHE_DIR))
    args = parser.parse_args()

    run_args = argparse.Namespace(
        skip_asr=False,
        asr_python="",
        out_dir=args.out_dir,
        asr_model=args.asr_model,
        asr_aligner_model=args.asr_aligner_model,
        asr_enable_timestamps=args.asr_enable_timestamps,
        asr_device_map=args.asr_device_map,
        asr_dtype=args.asr_dtype,
        asr_max_inference_batch_size=args.asr_max_inference_batch_size,
        asr_aligner_batch_size=args.asr_aligner_batch_size,
        asr_language=args.asr_language,
        local_files_only=args.local_files_only,
        model_cache_dir=args.model_cache_dir,
    )

    result_path = Path(args.result_json)
    try:
        rows, status = audio_evidence.run_qwen3_asr(Path(args.audio), args.episode_id, run_args)
        payload = {"ok": bool(status.get("ok")), "rows": rows, "status": status}
    except Exception as exc:
        payload = {
            "ok": False,
            "rows": [],
            "status": {
                "ok": False,
                "status": "worker_failed",
                "backend": "qwen3_asr",
                "reason": f"{exc.__class__.__name__}: {exc}",
                "traceback": traceback.format_exc(),
            },
        }

    audio_evidence.write_json(result_path, payload)
    print(json.dumps({
        "ok": payload.get("ok", False),
        "result_json": str(result_path),
        "status": payload.get("status", {}).get("status"),
    }, ensure_ascii=False))
    if not payload.get("ok"):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
