#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import wave
from datetime import datetime
from pathlib import Path

import numpy as np


WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_QWEN3_ASR_PYTHON = Path(r"C:\Users\lsb\anaconda3\envs\qwen3_asr312\python.exe")
DEFAULT_MODEL_CACHE_DIR = WORKSPACE_ROOT / "tools" / "model_cache" / "huggingface"
WORKSPACE_SPEAKER_VENDOR_DIR = (
    WORKSPACE_ROOT
    / "tools"
    / "python_vendor"
    / f"speaker_py{sys.version_info.major}{sys.version_info.minor}"
)


def timecode(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def srt_timecode(sec):
    sec = max(0.0, float(sec or 0.0))
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms >= 1000:
        s += 1
        ms -= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    order = 1
    for row in rows:
        text = str(row.get("text", "")).replace("\r", " ").replace("\n", " ").strip()
        if not text:
            continue
        start = float(row.get("start") or row.get("start_sec") or 0)
        end = float(row.get("end") or row.get("end_sec") or start + 1.0)
        if end <= start:
            end = start + 1.0
        lines.extend([
            str(order),
            f"{srt_timecode(start)} --> {srt_timecode(end)}",
            text,
            "",
        ])
        order += 1
    path.write_text("\n".join(lines), encoding="utf-8")


def find_ffmpeg():
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


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


def extract_audio(video, out_dir, episode_id, skip_audio=False):
    audio_dir = out_dir / "audio"
    audio_path = audio_dir / f"{episode_id}_16k_mono.wav"
    if skip_audio:
        return audio_path, {"ok": False, "status": "skipped", "path": str(audio_path)}

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        return audio_path, {"ok": False, "status": "ffmpeg_not_found", "path": str(audio_path)}

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
        return audio_path, {
            "ok": False,
            "status": f"failed:{exc.__class__.__name__}",
            "path": str(audio_path),
            "ffmpeg": ffmpeg,
        }

    return audio_path, {
        "ok": audio_path.exists(),
        "status": "ok" if audio_path.exists() else "failed:no_output",
        "path": str(audio_path),
        "ffmpeg": ffmpeg,
    }


def read_wav_mono(path):
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        sample_rate = wf.getframerate()
        frames = wf.getnframes()
        raw = wf.readframes(frames)
    if sampwidth != 2:
        raise ValueError(f"unsupported_sample_width:{sampwidth}")
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    return samples, sample_rate


def frame_rms(samples, sample_rate, frame_ms=30, hop_ms=10):
    frame = max(1, int(sample_rate * frame_ms / 1000))
    hop = max(1, int(sample_rate * hop_ms / 1000))
    if len(samples) < frame:
        return np.array([], dtype=np.float32), hop / sample_rate
    values = []
    for start in range(0, len(samples) - frame + 1, hop):
        chunk = samples[start:start + frame]
        values.append(float(np.sqrt(np.mean(chunk * chunk))))
    return np.asarray(values, dtype=np.float32), hop / sample_rate


def merge_segments(segments, max_gap=0.25):
    if not segments:
        return []
    merged = [segments[0]]
    for start, end, confidence in segments[1:]:
        last_start, last_end, last_confidence = merged[-1]
        if start - last_end <= max_gap:
            merged[-1] = (last_start, max(last_end, end), max(last_confidence, confidence))
        else:
            merged.append((start, end, confidence))
    return merged


def speech_rows_from_segments(episode_id, segments, source_tool, notes, default_confidence="0.850"):
    rows = []
    for i, (start_sec, end_sec, confidence) in enumerate(segments, 1):
        rows.append({
            "event_id": f"{episode_id}_vad_{i:04d}",
            "start_sec": f"{start_sec:.3f}",
            "end_sec": f"{end_sec:.3f}",
            "timecode": timecode(start_sec),
            "layer": "dialogue",
            "speaker": "",
            "text": "",
            "emotion": "",
            "event": "speech_activity",
            "confidence": f"{confidence:.3f}" if isinstance(confidence, (float, int)) else default_confidence,
            "source_tool": source_tool,
            "notes": notes,
        })
    return rows


def silence_rows_from_segments(episode_id, speech_segments, duration, source_tool):
    silence_rows = []
    cursor = 0.0
    silence_id = 1
    for start_sec, end_sec, _ in speech_segments:
        if start_sec - cursor >= 0.8:
            silence_rows.append({
                "event_id": f"{episode_id}_silence_{silence_id:04d}",
                "start_sec": f"{cursor:.3f}",
                "end_sec": f"{start_sec:.3f}",
                "timecode": timecode(cursor),
                "layer": "silence",
                "speaker": "",
                "text": "",
                "emotion": "",
                "event": "silence_or_reaction_gap",
                "confidence": "0.650",
                "source_tool": source_tool,
                "notes": "silence/reaction gap candidate; verify against picture",
            })
            silence_id += 1
        cursor = max(cursor, end_sec)
    if duration - cursor >= 0.8:
        silence_rows.append({
            "event_id": f"{episode_id}_silence_{silence_id:04d}",
            "start_sec": f"{cursor:.3f}",
            "end_sec": f"{duration:.3f}",
            "timecode": timecode(cursor),
            "layer": "silence",
            "speaker": "",
            "text": "",
            "emotion": "",
            "event": "silence_or_reaction_gap",
            "confidence": "0.650",
            "source_tool": source_tool,
            "notes": "silence/reaction gap candidate; verify against picture",
        })
    return silence_rows


def silero_vad(audio_path, episode_id, min_speech_sec=0.18, merge_gap_sec=0.25):
    try:
        import torch
        from silero_vad import get_speech_timestamps, load_silero_vad
    except Exception as exc:
        return None, None, None, {
            "ok": False,
            "method": "silero_vad",
            "status": "package_unavailable",
            "reason": f"{exc.__class__.__name__}: {exc}",
        }

    samples, sample_rate = read_wav_mono(audio_path)
    duration = len(samples) / sample_rate if sample_rate else 0.0
    if len(samples) == 0:
        return [], [], [], {
            "ok": False,
            "method": "silero_vad",
            "status": "empty_audio",
            "duration_sec": round(duration, 3),
        }

    try:
        model = load_silero_vad()
        audio_tensor = torch.from_numpy(samples)
        raw_segments = get_speech_timestamps(
            audio_tensor,
            model,
            sampling_rate=sample_rate,
            min_speech_duration_ms=int(min_speech_sec * 1000),
            min_silence_duration_ms=int(merge_gap_sec * 1000),
            return_seconds=True,
        )
    except Exception as exc:
        return None, None, None, {
            "ok": False,
            "method": "silero_vad",
            "status": "failed",
            "reason": f"{exc.__class__.__name__}: {exc}",
            "duration_sec": round(duration, 3),
        }

    speech_segments = []
    for segment in raw_segments:
        start_sec = float(segment.get("start", 0.0))
        end_sec = min(float(segment.get("end", start_sec)), duration)
        if end_sec - start_sec >= min_speech_sec:
            speech_segments.append((start_sec, end_sec, 0.85))
    speech_segments = merge_segments(speech_segments, merge_gap_sec)
    speech_rows = speech_rows_from_segments(
        episode_id,
        speech_segments,
        "silero_vad",
        "speech activity cue from Silero VAD; not a transcript",
    )
    silence_rows = silence_rows_from_segments(episode_id, speech_segments, duration, "silero_vad")
    peak_rows = []
    status = {
        "ok": True,
        "method": "silero_vad",
        "status": "ok",
        "sample_rate": sample_rate,
        "duration_sec": round(duration, 3),
        "speech_segment_count": len(speech_rows),
        "silence_segment_count": len(silence_rows),
        "post_sound_candidates": "disabled_by_redraw_workflow",
    }
    return speech_rows, silence_rows, peak_rows, status


def energy_vad(audio_path, episode_id, min_speech_sec=0.18, merge_gap_sec=0.25):
    samples, sample_rate = read_wav_mono(audio_path)
    duration = len(samples) / sample_rate if sample_rate else 0.0
    rms, hop_sec = frame_rms(samples, sample_rate)
    if len(rms) == 0:
        return [], [], [], {
            "ok": False,
            "method": "energy_vad_fallback",
            "reason": "empty_audio",
            "duration_sec": round(duration, 3),
        }

    floor = float(np.percentile(rms, 20))
    high = float(np.percentile(rms, 95))
    threshold = max(floor * 2.5, high * 0.12, 0.006)
    active = rms >= threshold

    raw_segments = []
    start = None
    peak = 0.0
    for i, is_active in enumerate(active):
        t = i * hop_sec
        if is_active and start is None:
            start = t
            peak = float(rms[i])
        elif is_active:
            peak = max(peak, float(rms[i]))
        elif start is not None:
            end = t
            if end - start >= min_speech_sec:
                confidence = min(0.99, max(0.1, peak / (threshold * 3.0)))
                raw_segments.append((start, end, confidence))
            start = None
            peak = 0.0
    if start is not None:
        end = len(rms) * hop_sec
        if end - start >= min_speech_sec:
            confidence = min(0.99, max(0.1, peak / (threshold * 3.0)))
            raw_segments.append((start, min(end, duration), confidence))

    speech_segments = merge_segments(raw_segments, merge_gap_sec)
    speech_rows = speech_rows_from_segments(
        episode_id,
        speech_segments,
        "energy_vad_fallback",
        "speech activity cue for frame extraction; not a transcript",
    )
    silence_rows = silence_rows_from_segments(episode_id, speech_segments, duration, "energy_vad_fallback")

    peak_rows = []
    status = {
        "ok": True,
        "method": "energy_vad_fallback",
        "sample_rate": sample_rate,
        "duration_sec": round(duration, 3),
        "speech_segment_count": len(speech_rows),
        "silence_segment_count": len(silence_rows),
        "post_sound_candidates": "disabled_by_redraw_workflow",
        "threshold": round(threshold, 6),
        "rms_p20": round(floor, 6),
        "rms_p95": round(high, 6),
    }
    return speech_rows, silence_rows, peak_rows, status


def audio_peak_rows(rms, hop_sec, episode_id, threshold):
    """Legacy helper for explicit diagnostics only; not used by the redraw workflow."""
    return []


def qwen_language_name(language):
    mapping = {
        "zh": "Chinese",
        "cn": "Chinese",
        "chinese": "Chinese",
        "mandarin": "Chinese",
        "yue": "Cantonese",
        "cantonese": "Cantonese",
        "en": "English",
        "english": "English",
        "ja": "Japanese",
        "jp": "Japanese",
        "japanese": "Japanese",
        "ko": "Korean",
        "kr": "Korean",
        "korean": "Korean",
    }
    key = str(language or "").strip().lower()
    return mapping.get(key, language or "Chinese")


def default_qwen3_asr_python():
    candidates = [
        DEFAULT_QWEN3_ASR_PYTHON,
        Path.home() / "anaconda3" / "envs" / "qwen3_asr312" / "python.exe",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def add_workspace_vendor_paths():
    for path in [WORKSPACE_SPEAKER_VENDOR_DIR]:
        if path.exists():
            path_text = str(path)
            if path_text not in sys.path:
                sys.path.insert(0, path_text)


def configure_model_cache(args):
    cache_dir = Path(getattr(args, "model_cache_dir", "") or DEFAULT_MODEL_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    hub_dir = cache_dir / "hub"
    hub_dir.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(cache_dir)
    os.environ["HF_HUB_CACHE"] = str(hub_dir)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(hub_dir)
    os.environ["TRANSFORMERS_CACHE"] = str(hub_dir)
    os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
    return cache_dir


def tail_text(text, max_chars=4000):
    text = str(text or "")
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def jsonable(value):
    try:
        json.dumps(value, ensure_ascii=False)
        return value
    except TypeError:
        pass
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    if hasattr(value, "__dict__"):
        return jsonable(vars(value))
    return str(value)


def get_any(obj, names, default=None):
    for name in names:
        if isinstance(obj, dict) and name in obj:
            return obj.get(name)
        if hasattr(obj, name):
            return getattr(obj, name)
    return default


def normalize_seconds(value, duration=None):
    if value is None or value == "":
        return None
    try:
        sec = float(value)
    except Exception:
        return None
    if duration and sec > max(duration * 2, 120.0):
        sec = sec / 1000.0
    elif sec > 10000:
        sec = sec / 1000.0
    return max(0.0, sec)


def parse_timestamp_item(item, duration=None):
    text = get_any(item, ["text", "token", "word", "char", "value"], "")
    start = get_any(item, ["start", "start_time", "begin", "begin_time", "start_sec"], None)
    end = get_any(item, ["end", "end_time", "finish", "finish_time", "end_sec"], None)
    stamp_value = get_any(item, ["timestamp", "timestamps", "time_stamp", "time_stamps"], None)

    if isinstance(item, (list, tuple)):
        if len(item) >= 3:
            text, start, end = item[0], item[1], item[2]
        elif len(item) == 2:
            text = item[0]
            stamp_value = item[1]

    if isinstance(stamp_value, (list, tuple)) and len(stamp_value) >= 2:
        start = stamp_value[0]
        end = stamp_value[1]

    text = str(text or "").strip()
    start = normalize_seconds(start, duration)
    end = normalize_seconds(end, duration)
    if not text or start is None:
        return None
    if end is None or end <= start:
        end = start + 0.3
    return {"text": text, "start": start, "end": end}


def qwen_result_text(result):
    text = get_any(result, ["text", "transcript", "sentence"], "")
    if isinstance(text, list):
        text = "".join(str(part) for part in text)
    return str(text or "").strip()


def qwen_result_timestamps(result):
    return get_any(result, ["time_stamps", "timestamps", "time_stamp", "timestamp"], None)


def timestamp_items(raw_timestamps):
    if not raw_timestamps:
        return []
    if hasattr(raw_timestamps, "model_dump"):
        try:
            raw_timestamps = raw_timestamps.model_dump()
        except Exception:
            pass
    if isinstance(raw_timestamps, dict):
        for key in ["segments", "words", "tokens", "items", "timestamps", "time_stamps"]:
            value = raw_timestamps.get(key)
            if isinstance(value, list):
                return value
        return [raw_timestamps]
    if isinstance(raw_timestamps, list):
        return raw_timestamps
    for key in ["segments", "words", "tokens", "items", "timestamps", "time_stamps"]:
        value = getattr(raw_timestamps, key, None)
        if isinstance(value, list):
            return value
    if hasattr(raw_timestamps, "__dict__"):
        values = vars(raw_timestamps)
        for key in ["segments", "words", "tokens", "items", "timestamps", "time_stamps"]:
            value = values.get(key)
            if isinstance(value, list):
                return value
    return []


def group_timestamp_items(items, duration=None, max_chars=42, max_seconds=6.0):
    rows = []
    bucket = []
    start = None
    end = None
    for item in items:
        parsed = parse_timestamp_item(item, duration=duration)
        if not parsed:
            continue
        if start is None:
            start = parsed["start"]
        bucket.append(parsed["text"])
        end = parsed["end"]
        joined = "".join(bucket).strip()
        should_flush = (
            joined.endswith(("。", "！", "？", "!", "?", "；", ";"))
            or len(joined) >= max_chars
            or (end is not None and start is not None and end - start >= max_seconds)
        )
        if should_flush:
            rows.append({
                "speaker": "speaker_unknown",
                "start": f"{start:.3f}",
                "end": f"{max(end or start + 1.0, start + 0.2):.3f}",
                "text": re.sub(r"\s+", " ", joined),
                "source_tool": "qwen3_asr",
                "notes": "Qwen3-ASR text with Qwen3-ForcedAligner timestamps; speaker unresolved until diarization pass",
            })
            bucket = []
            start = None
            end = None
    if bucket and start is not None:
        joined = "".join(bucket).strip()
        rows.append({
            "speaker": "speaker_unknown",
            "start": f"{start:.3f}",
            "end": f"{max(end or start + 1.0, start + 0.2):.3f}",
            "text": re.sub(r"\s+", " ", joined),
            "source_tool": "qwen3_asr",
            "notes": "Qwen3-ASR text with Qwen3-ForcedAligner timestamps; speaker unresolved until diarization pass",
        })
    for i, row in enumerate(rows, 1):
        row["index"] = i
        row["start_timecode"] = timecode(float(row["start"]))
        row["end_timecode"] = timecode(float(row["end"]))
        row["avg_logprob"] = ""
        row["no_speech_prob"] = ""
    return rows


def run_qwen3_asr(audio_path, episode_id, args):
    if args.skip_asr:
        return [], {"ok": False, "status": "skipped"}

    asr_python = str(getattr(args, "asr_python", "") or "").strip()
    if asr_python:
        asr_python_path = Path(asr_python)
        if not asr_python_path.exists():
            return [], {
                "ok": False,
                "status": "python_not_found",
                "backend": "qwen3_asr",
                "python": asr_python,
                "reason": "configured Qwen3 ASR Python does not exist",
            }
        if Path(sys.executable).resolve() != asr_python_path.resolve():
            return run_qwen3_asr_subprocess(audio_path, episode_id, args)

    try:
        import torch
        from qwen_asr import Qwen3ASRModel
    except Exception as exc:
        return [], {
            "ok": False,
            "status": "package_unavailable",
            "backend": "qwen3_asr",
            "model": args.asr_model,
            "reason": f"{exc.__class__.__name__}: {exc}",
            "install_hint": "pip install -U qwen-asr",
        }

    device_map = args.asr_device_map
    if device_map == "auto":
        try:
            device_map = "cuda:0" if torch.cuda.is_available() else "cpu"
        except Exception:
            device_map = "cpu"
    dtype_name = args.asr_dtype
    if dtype_name == "auto":
        dtype_name = "bfloat16" if str(device_map).startswith("cuda") else "float32"
    dtype = getattr(torch, dtype_name, torch.float32)

    duration = None
    try:
        samples, sample_rate = read_wav_mono(audio_path)
        duration = len(samples) / sample_rate if sample_rate else None
    except Exception:
        pass

    kwargs = {
        "dtype": dtype,
        "device_map": device_map,
    }
    if args.local_files_only:
        kwargs["local_files_only"] = True
    if args.asr_enable_timestamps and args.asr_aligner_model:
        kwargs["forced_aligner"] = args.asr_aligner_model
        # qwen-asr 0.0.6 forwards forced_aligner_kwargs directly to
        # AutoModel.from_pretrained; ASR-only batch-size kwargs break that path.
        kwargs["forced_aligner_kwargs"] = {
            "dtype": dtype,
            "device_map": device_map,
        }

    try:
        model = Qwen3ASRModel.from_pretrained(args.asr_model, **kwargs)
        result = model.transcribe(
            audio=str(audio_path),
            language=qwen_language_name(args.asr_language),
            return_time_stamps=args.asr_enable_timestamps,
        )
    except Exception as exc:
        return [], {
            "ok": False,
            "status": "failed",
            "backend": "qwen3_asr",
            "model": args.asr_model,
            "aligner_model": args.asr_aligner_model if args.asr_enable_timestamps else "",
            "device_map": device_map,
            "dtype": dtype_name,
            "reason": f"{exc.__class__.__name__}: {exc}",
        }

    result_list = result if isinstance(result, list) else [result]
    first = result_list[0] if result_list else {}
    raw_timestamps = qwen_result_timestamps(first)
    rows = group_timestamp_items(timestamp_items(raw_timestamps), duration=duration) if raw_timestamps else []
    if not rows:
        text = qwen_result_text(first)
        if text:
            rows = [{
                "index": 1,
                "speaker": "speaker_unknown",
                "start": "0.000",
                "end": f"{max(duration or 1.0, 1.0):.3f}",
                "start_timecode": timecode(0.0),
                "end_timecode": timecode(max(duration or 1.0, 1.0)),
                "text": re.sub(r"\s+", " ", text),
                "avg_logprob": "",
                "no_speech_prob": "",
                "source_tool": "qwen3_asr",
                "notes": "Qwen3-ASR text without usable timestamps; rerun with Qwen3-ForcedAligner/CapsWriter for SRT-grade timing",
            }]

    raw_path = Path(args.out_dir) / f"{episode_id}_qwen3_asr_raw.json"
    write_json(raw_path, {
        "episode_id": episode_id,
        "audio": str(audio_path),
        "model": args.asr_model,
        "aligner_model": args.asr_aligner_model if args.asr_enable_timestamps else "",
        "language": qwen_language_name(args.asr_language),
        "result": jsonable(result),
    })

    status = {
        "ok": bool(rows),
        "status": "ok" if rows else "empty_result",
        "backend": "qwen3_asr",
        "model": args.asr_model,
        "aligner_model": args.asr_aligner_model if args.asr_enable_timestamps else "",
        "device_map": device_map,
        "dtype": dtype_name,
        "language": qwen_language_name(args.asr_language),
        "timestamps": bool(raw_timestamps),
        "segments": len(rows),
        "raw": str(raw_path),
    }
    return rows, status


def run_qwen3_asr_subprocess(audio_path, episode_id, args):
    asr_python = Path(str(getattr(args, "asr_python", "") or "")).expanduser()
    worker = Path(__file__).with_name("qwen3_asr_worker.py")
    if not worker.exists():
        return [], {
            "ok": False,
            "status": "worker_missing",
            "backend": "qwen3_asr",
            "reason": str(worker),
        }

    cache_dir = configure_model_cache(args)
    result_path = Path(args.out_dir) / f"{episode_id}_qwen3_asr_worker.json"
    if result_path.exists():
        result_path.unlink()

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["HF_HOME"] = str(cache_dir)
    env["HF_HUB_CACHE"] = str(cache_dir / "hub")
    env["HUGGINGFACE_HUB_CACHE"] = str(cache_dir / "hub")
    env["TRANSFORMERS_CACHE"] = str(cache_dir / "hub")
    cmd = [
        str(asr_python),
        str(worker),
        "--audio",
        str(audio_path),
        "--episode-id",
        episode_id,
        "--out-dir",
        str(args.out_dir),
        "--result-json",
        str(result_path),
        "--asr-model",
        str(args.asr_model),
        "--asr-aligner-model",
        str(args.asr_aligner_model),
        "--asr-language",
        str(args.asr_language),
        "--asr-device-map",
        str(args.asr_device_map),
        "--asr-dtype",
        str(args.asr_dtype),
        "--asr-max-inference-batch-size",
        str(args.asr_max_inference_batch_size),
        "--asr-aligner-batch-size",
        str(args.asr_aligner_batch_size),
        "--model-cache-dir",
        str(cache_dir),
    ]
    if args.asr_enable_timestamps:
        cmd.append("--asr-enable-timestamps")
    else:
        cmd.append("--no-asr-enable-timestamps")
    if args.local_files_only:
        cmd.append("--local-files-only")

    try:
        timeout_sec = int(getattr(args, "asr_timeout_sec", 0) or 0)
        completed = subprocess.run(
            cmd,
            cwd=str(worker.parent),
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_sec if timeout_sec > 0 else None,
        )
    except subprocess.TimeoutExpired as exc:
        if result_path.exists():
            try:
                payload = json.loads(result_path.read_text(encoding="utf-8"))
                if payload.get("ok"):
                    status = payload.get("status") or {}
                    status["subprocess_exit_warning"] = "timeout_after_result_json"
                    status["timeout_sec"] = int(getattr(args, "asr_timeout_sec", 0) or 0)
                    return payload.get("rows") or [], status
            except Exception:
                pass
        return [], {
            "ok": False,
            "status": "timeout",
            "backend": "qwen3_asr",
            "python": str(asr_python),
            "worker": str(worker),
            "timeout_sec": int(getattr(args, "asr_timeout_sec", 0) or 0),
            "reason": "Qwen3 ASR subprocess exceeded timeout; continue with blocker/fallback evidence instead of stalling Step 01",
            "stdout": tail_text(exc.stdout),
            "stderr": tail_text(exc.stderr),
        }
    except Exception as exc:
        return [], {
            "ok": False,
            "status": "subprocess_failed",
            "backend": "qwen3_asr",
            "python": str(asr_python),
            "worker": str(worker),
            "reason": f"{exc.__class__.__name__}: {exc}",
        }

    payload = None
    if result_path.exists():
        try:
            payload = json.loads(result_path.read_text(encoding="utf-8"))
        except Exception as exc:
            payload = {
                "ok": False,
                "rows": [],
                "status": {
                    "ok": False,
                    "status": "result_json_invalid",
                    "backend": "qwen3_asr",
                    "reason": f"{exc.__class__.__name__}: {exc}",
                },
            }

    if not payload:
        return [], {
            "ok": False,
            "status": "subprocess_failed_no_payload",
            "backend": "qwen3_asr",
            "python": str(asr_python),
            "worker": str(worker),
            "returncode": completed.returncode,
            "stdout": tail_text(completed.stdout),
            "stderr": tail_text(completed.stderr),
        }

    rows = payload.get("rows") or []
    status = payload.get("status") or {}
    status["backend"] = status.get("backend") or "qwen3_asr"
    status["python"] = str(asr_python)
    status["worker"] = str(worker)
    status["returncode"] = completed.returncode
    status["stdout"] = tail_text(completed.stdout)
    status["stderr"] = tail_text(completed.stderr)
    status["result_json"] = str(result_path)
    if not rows and status.get("ok") is None:
        status["ok"] = False
    return rows, status


def run_faster_whisper(audio_path, episode_id, args):
    if args.skip_asr:
        return [], {"ok": False, "status": "skipped"}
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        return [], {"ok": False, "status": "package_unavailable", "backend": "faster_whisper", "reason": str(exc)}

    device = args.asr_device
    compute_type = args.asr_compute_type
    if device == "auto":
        try:
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"
    if compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"

    def transcribe_with(current_device, current_compute_type):
        model = WhisperModel(
            args.faster_whisper_model,
            device=current_device,
            compute_type=current_compute_type,
            local_files_only=args.local_files_only,
        )
        segments, info = model.transcribe(
            str(audio_path),
            language=args.asr_language,
            vad_filter=True,
            beam_size=args.asr_beam_size,
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
                "start_timecode": timecode(seg.start),
                "end_timecode": timecode(seg.end),
                "text": text,
                "avg_logprob": f"{getattr(seg, 'avg_logprob', 0.0):.4f}",
                "no_speech_prob": f"{getattr(seg, 'no_speech_prob', 0.0):.4f}",
                "source_tool": "faster_whisper",
                "notes": "speaker unresolved; use visible frame and hard subtitle evidence in Step 02",
            })
        status = {
            "ok": True,
            "status": "ok",
            "backend": "faster_whisper",
            "model": args.faster_whisper_model,
            "device": current_device,
            "compute_type": current_compute_type,
            "language": getattr(info, "language", args.asr_language),
            "language_probability": getattr(info, "language_probability", None),
            "segments": len(rows),
        }
        return rows, status

    attempts = [(device, compute_type)]
    if device != "cpu":
        attempts.append(("cpu", "int8"))

    failures = []
    for attempt_device, attempt_compute_type in attempts:
        try:
            rows, status = transcribe_with(attempt_device, attempt_compute_type)
            if failures:
                status["fallback_from"] = failures
            return rows, status
        except Exception as exc:
            failures.append({
                "device": attempt_device,
                "compute_type": attempt_compute_type,
                "reason": f"{exc.__class__.__name__}: {exc}",
            })

    return [], {
        "ok": False,
        "status": "failed",
        "backend": "faster_whisper",
        "model": args.faster_whisper_model,
        "device": device,
        "compute_type": compute_type,
        "fallback_attempts": failures,
        "reason": failures[-1]["reason"] if failures else "unknown_failure",
    }


def run_asr(audio_path, episode_id, args):
    if args.asr_backend == "none":
        return [], {"ok": False, "status": "disabled", "backend": "none"}

    failures = []
    if args.asr_backend in {"qwen3", "auto"}:
        rows, status = run_qwen3_asr(audio_path, episode_id, args)
        if status.get("ok"):
            return rows, status
        failures.append(status)
        if args.asr_fallback != "faster-whisper" and args.asr_backend != "auto":
            return rows, status

    if args.asr_backend in {"faster-whisper", "auto", "qwen3"} and args.asr_fallback == "faster-whisper":
        rows, status = run_faster_whisper(audio_path, episode_id, args)
        if failures:
            status["fallback_from"] = failures
        return rows, status

    return [], {
        "ok": False,
        "status": "failed",
        "backend": args.asr_backend,
        "fallback_attempts": failures,
        "reason": failures[-1].get("reason") if failures else "no_backend_attempted",
    }


def apply_quality_profile(args):
    if args.quality_profile == "hq_full":
        if args.asr_fallback is None:
            args.asr_fallback = "none"
        if args.speaker_backend is None:
            args.speaker_backend = "auto"
        if not args.skip_hq_audio:
            args.run_hq_audio = True
        if args.strict_quality_gate is None:
            args.strict_quality_gate = True
        return

    if args.asr_fallback is None:
        args.asr_fallback = "faster-whisper"
    if args.speaker_backend is None:
        args.speaker_backend = "none"
    if args.strict_quality_gate is None:
        args.strict_quality_gate = False


def build_quality_gate_status(statuses, args, transcript_rows, speaker_rows):
    profile = getattr(args, "quality_profile", "hq_full")
    gate = {
        "profile": profile,
        "ok": True,
        "blockers": [],
        "warnings": [],
        "required_chain": [
            "16k mono WAV",
            "Silero VAD or explicit fallback",
            "Qwen3-ASR-1.7B",
            "Qwen3-ForcedAligner-0.6B timestamps/SRT",
            "speaker second-pass attempt",
            "audio-event ledger",
        ],
    }
    if profile != "hq_full":
        gate["status"] = "not_strict_stable_batch"
        return gate

    vad_status = statuses.get("vad", {})
    if not vad_status.get("ok"):
        gate["blockers"].append("VAD did not produce speech timing; audio-guided frame extraction is unsafe.")

    hq_status = statuses.get("hq_audio", {})
    if not hq_status.get("ok"):
        gate["warnings"].append(
            f"HQ audio helper did not complete: {hq_status.get('status', 'unknown')}. Main VAD remains the fallback timing source."
        )

    asr_status = statuses.get("asr", {})
    if asr_status.get("backend") != "qwen3_asr" or not asr_status.get("ok"):
        gate["blockers"].append(
            "Qwen3-ASR-1.7B did not complete as the primary transcript layer."
        )
    elif not transcript_rows:
        gate["blockers"].append("Qwen3-ASR completed without usable transcript rows.")
    elif getattr(args, "asr_enable_timestamps", True) and not asr_status.get("timestamps"):
        gate["blockers"].append(
            "Qwen3-ForcedAligner timestamp output is missing; SRT-grade timing is not proven."
        )

    speaker_status = statuses.get("speaker_diarization", {})
    if not speaker_rows:
        gate["warnings"].append(
            "Speaker second-pass did not produce a speaker ledger; Step02/Step04 must resolve speakers from hard subtitles, visible cuts, mouth movement, and story context."
        )
    if speaker_status.get("status") in {"not_run", "disabled"}:
        gate["warnings"].append("Speaker second-pass was not attempted.")

    gate["ok"] = not gate["blockers"]
    gate["status"] = "passed" if gate["ok"] else "blocked"
    return gate


def run_speaker_second_pass(audio_path, transcript_rows, episode_id, args):
    if args.speaker_backend in {"none", "off"}:
        return [], {"ok": False, "status": "not_run", "backend": args.speaker_backend}
    if not transcript_rows:
        return [], {"ok": False, "status": "not_run_no_transcript", "backend": args.speaker_backend}

    add_workspace_vendor_paths()
    requested = args.speaker_backend
    if requested == "auto":
        try:
            import sherpa_onnx  # noqa: F401
            requested = "sherpa-onnx"
        except Exception:
            try:
                import wespeaker  # noqa: F401
                requested = "wespeaker"
            except Exception:
                return [], {
                    "ok": False,
                    "status": "package_unavailable",
                    "backend": "auto",
                    "reason": "Neither sherpa-onnx nor wespeaker is installed",
                }

    if requested == "sherpa-onnx":
        try:
            import sherpa_onnx  # noqa: F401
        except Exception as exc:
            return [], {
                "ok": False,
                "status": "package_unavailable",
                "backend": "sherpa-onnx",
                "reason": f"{exc.__class__.__name__}: {exc}",
                "install_hint": "pip install sherpa-onnx",
            }
        return [], {
            "ok": False,
            "status": "not_configured",
            "backend": "sherpa-onnx",
            "reason": "sherpa-onnx speaker identification needs speaker enrollment/model paths; unknown-speaker episodes need diarization/clustering first",
            "docs": "https://k2-fsa.github.io/sherpa/onnx/speaker-identification/index.html",
        }

    if requested == "wespeaker":
        try:
            import wespeaker  # noqa: F401
        except Exception as exc:
            return [], {
                "ok": False,
                "status": "package_unavailable",
                "backend": "wespeaker",
                "reason": f"{exc.__class__.__name__}: {exc}",
                "install_hint": "pip install wespeaker",
            }
        return [], {
            "ok": False,
            "status": "not_configured",
            "backend": "wespeaker",
            "reason": "WeSpeaker can provide speaker embeddings/recognition, but this workflow still needs a configured diarization or clustering pass to assign unknown speakers",
            "docs": "https://github.com/wenet-e2e/wespeaker",
        }

    return [], {"ok": False, "status": "unknown_backend", "backend": requested}


def transcript_to_dialogue_ledger(episode_id, transcript_rows):
    rows = []
    for row in transcript_rows:
        start = float(row["start"])
        end = float(row["end"])
        rows.append({
            "event_id": f"{episode_id}_asr_{int(row['index']):04d}",
            "start_sec": f"{start:.3f}",
            "end_sec": f"{end:.3f}",
            "timecode": timecode(start),
            "layer": "dialogue",
            "speaker": row.get("speaker", "speaker_unknown"),
            "text": row.get("text", ""),
            "emotion": "",
            "event": "asr_speech",
            "confidence": "",
            "source_tool": row.get("source_tool", "asr"),
            "notes": row.get("notes", ""),
        })
    return rows


def optional_tool_status():
    add_workspace_vendor_paths()
    checks = {
        "silero_vad": "silero_vad",
        "qwen_asr": "qwen_asr",
        "qwen_transformers": "transformers",
        "sherpa_onnx": "sherpa_onnx",
        "wespeaker": "wespeaker",
        "pyannote_audio": "pyannote.audio",
        "panns_inference": "panns_inference",
        "laion_clap": "laion_clap",
        "emotion2vec": "emotion2vec",
        "speechbrain": "speechbrain",
    }
    statuses = {}
    for name, module_name in checks.items():
        try:
            __import__(module_name)
            statuses[name] = {"ok": True, "status": "available_not_run"}
        except Exception as exc:
            statuses[name] = {
                "ok": False,
                "status": "package_unavailable",
                "reason": exc.__class__.__name__,
            }
    qwen_python = default_qwen3_asr_python()
    statuses["qwen3_asr_python"] = {
        "ok": bool(qwen_python and qwen_python.exists()),
        "status": "available" if qwen_python and qwen_python.exists() else "missing",
        "path": str(qwen_python) if qwen_python else "",
    }
    panns_checkpoint = Path.home() / "panns_data" / "Cnn14_mAP=0.431.pth"
    statuses["panns_cnn14_checkpoint"] = {
        "ok": panns_checkpoint.exists() and panns_checkpoint.stat().st_size >= 300_000_000,
        "status": "available_not_run" if panns_checkpoint.exists() and panns_checkpoint.stat().st_size >= 300_000_000 else "checkpoint_missing_or_incomplete",
        "path": str(panns_checkpoint),
    }
    try:
        from transformers import Qwen2AudioForConditionalGeneration  # noqa: F401

        statuses["qwen2_audio_transformers"] = {
            "ok": True,
            "status": "runtime_class_available_model_weights_not_loaded",
        }
    except Exception as exc:
        statuses["qwen2_audio_transformers"] = {
            "ok": False,
            "status": "runtime_class_unavailable",
            "reason": f"{exc.__class__.__name__}: {exc}",
        }
    hf_token_present = any(os.environ.get(name) for name in ["HF_TOKEN", "HUGGINGFACE_TOKEN", "PYANNOTE_AUTH_TOKEN"])
    statuses["pyannote_hf_token"] = {
        "ok": hf_token_present,
        "status": "token_present" if hf_token_present else "token_missing_for_gated_diarization_models",
    }
    return statuses


def default_hq_python():
    candidates = [
        Path(r"C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe"),
        Path.home() / "anaconda3" / "envs" / "shortdrama_hq310" / "python.exe",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def run_hq_audio(audio_path, out_dir, episode_id, hq_python, hq_device, skip_qwen3):
    if not hq_python:
        return {"ok": False, "status": "missing_hq_python"}, [], []
    hq_python = Path(hq_python)
    if not hq_python.exists():
        return {"ok": False, "status": "missing_hq_python", "path": str(hq_python)}, [], []
    script = Path(__file__).resolve().parent / "run_hq_audio_evidence.py"
    cmd = [
        str(hq_python),
        str(script),
        "--audio",
        str(audio_path),
        "--episode-id",
        episode_id,
        "--out-dir",
        str(out_dir),
        "--device",
        hq_device,
    ]
    # ASR is handled by the main Qwen3/fallback path in this script. The HQ
    # helper only adds optional VAD/performance layers so transcript rows do
    # not get duplicated.
    cmd.append("--skip-qwen3")
    env = os.environ.copy()
    ffmpeg_dir = Path(r"D:\codex-work\aaa\tools\bin")
    if ffmpeg_dir.exists():
        env["PATH"] = str(ffmpeg_dir) + os.pathsep + env.get("PATH", "")
    try:
        proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, timeout=1800)
    except Exception as exc:
        return {"ok": False, "status": "failed", "reason": f"{exc.__class__.__name__}: {exc}"}, [], []

    log_path = out_dir / f"{episode_id}_hq_audio.log"
    log_path.write_text(proc.stdout or "", encoding="utf-8")
    status_path = out_dir / f"{episode_id}_hq_audio_status.json"
    status = {
        "ok": proc.returncode == 0 and status_path.exists(),
        "status": "ok" if proc.returncode == 0 else "failed",
        "returncode": proc.returncode,
        "python": str(hq_python),
        "log": str(log_path),
    }
    if status_path.exists():
        try:
            status["layers"] = json.loads(status_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    silero_rows = load_audio_event_rows([out_dir / f"{episode_id}_silero_vad_segments.csv"])
    qwen_rows = load_audio_event_rows([out_dir / f"{episode_id}_qwen3_asr_dialogue_ledger.csv"])
    return status, silero_rows, qwen_rows


def write_asr_blocker(out_dir, episode_id, status):
    path = out_dir / f"{episode_id}_asr_blocker.json"
    write_json(path, status)
    return path


def build_summary(out_dir, episode_id, audio_path, statuses, outputs):
    path = out_dir / f"{episode_id}_audio_evidence_summary.md"
    lines = [
        f"# {episode_id} Audio Evidence Summary",
        "",
        f"- Built at: {datetime.now().isoformat(timespec='seconds')}",
        f"- Audio file: `{audio_path}`",
        f"- Audio extraction: `{statuses.get('audio_extract', {}).get('status', '')}`",
        f"- VAD: `{statuses.get('vad', {}).get('method', '')}` / {statuses.get('vad', {}).get('speech_segment_count', 0)} speech segments",
        f"- HQ audio: `{statuses.get('hq_audio', {}).get('status', 'not_run')}`",
        f"- ASR: `{statuses.get('asr', {}).get('backend', '')}` / `{statuses.get('asr', {}).get('status', '')}` / {statuses.get('asr', {}).get('segments', 0)} segments",
        f"- SRT: `{outputs.get('transcript_srt', '')}`",
        f"- Speaker pass: `{statuses.get('speaker_diarization', {}).get('backend', '')}` / `{statuses.get('speaker_diarization', {}).get('status', '')}`",
        f"- Quality gate: `{statuses.get('quality_gate', {}).get('profile', '')}` / `{statuses.get('quality_gate', {}).get('status', '')}`",
        f"- Audio event ledger: `{outputs.get('audio_event_ledger_csv', '')}`",
        f"- Dialogue ledger: `{outputs.get('dialogue_ledger_csv', '')}`",
        f"- VAD ledger: `{outputs.get('vad_segments_csv', '')}`",
        "",
        "Use the audio event ledger as `extract_episode_frames.py --audio-events` input. It is for dialogue, silence, breath, emotion, and story information cues only; post-added sound effects and background music are excluded from the redraw workflow.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def remove_stale_outputs(out_dir, episode_id):
    names = [
        f"{episode_id}_asr_blocker.json",
        f"{episode_id}_transcript_segments.csv",
        f"{episode_id}_transcript_segments.json",
        f"{episode_id}_transcript.srt",
        f"{episode_id}_qwen3_asr_raw.json",
        f"{episode_id}_qwen3_asr_dialogue_ledger.csv",
        f"{episode_id}_qwen3_asr_dialogue_ledger.json",
        f"{episode_id}_speaker_ledger.csv",
        f"{episode_id}_speaker_ledger.json",
        f"{episode_id}_dialogue_ledger.csv",
        f"{episode_id}_dialogue_ledger.json",
        f"{episode_id}_audio_event_ledger.csv",
        f"{episode_id}_audio_event_ledger.json",
        f"{episode_id}_vad_segments.csv",
        f"{episode_id}_vad_segments.json",
        f"{episode_id}_audio_tool_status.json",
        f"{episode_id}_audio_evidence_summary.md",
        f"{episode_id}_hq_audio.log",
        f"{episode_id}_hq_audio_status.json",
        f"{episode_id}_silero_vad_segments.csv",
        f"{episode_id}_silero_vad_segments.json",
        f"{episode_id}_sensevoice_raw.json",
        f"{episode_id}_sensevoice_dialogue_ledger.csv",
        f"{episode_id}_sensevoice_dialogue_ledger.json",
    ]
    for name in names:
        path = out_dir / name
        if path.exists():
            path.unlink()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--quality-profile", choices=["hq_full", "stable_batch"], default="hq_full")
    parser.add_argument("--skip-audio", action="store_true")
    parser.add_argument("--skip-asr", action="store_true")
    parser.add_argument("--asr-backend", choices=["qwen3", "faster-whisper", "auto", "none"], default="qwen3")
    parser.add_argument("--asr-fallback", choices=["faster-whisper", "none"], default=None)
    parser.add_argument("--asr-model", default="Qwen/Qwen3-ASR-1.7B")
    parser.add_argument("--asr-aligner-model", default="Qwen/Qwen3-ForcedAligner-0.6B")
    parser.add_argument("--asr-enable-timestamps", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--asr-python", default=str(default_qwen3_asr_python() or ""))
    parser.add_argument("--asr-device-map", default="auto")
    parser.add_argument("--asr-dtype", default="auto")
    parser.add_argument("--asr-timeout-sec", type=int, default=1200)
    parser.add_argument("--asr-max-inference-batch-size", type=int, default=1)
    parser.add_argument("--asr-aligner-batch-size", type=int, default=16)
    parser.add_argument("--faster-whisper-model", default="large-v3-turbo")
    parser.add_argument("--asr-language", default="zh")
    parser.add_argument("--asr-device", default="auto")
    parser.add_argument("--asr-compute-type", default="auto")
    parser.add_argument("--asr-beam-size", type=int, default=3)
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--speaker-backend", choices=["none", "off", "auto", "sherpa-onnx", "wespeaker"], default=None)
    parser.add_argument("--model-cache-dir", default=str(DEFAULT_MODEL_CACHE_DIR))
    parser.add_argument("--hq-python")
    parser.add_argument("--hq-device", default="cpu")
    parser.add_argument("--run-hq-audio", action="store_true")
    parser.add_argument("--skip-hq-audio", action="store_true")
    parser.add_argument("--skip-sensevoice", action="store_true", help="Legacy alias; now skips Qwen3 in HQ helpers.")
    parser.add_argument("--skip-qwen3", action="store_true")
    parser.add_argument("--strict-quality-gate", action=argparse.BooleanOptionalAction, default=None)
    args = parser.parse_args()
    apply_quality_profile(args)

    video = Path(args.video)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    remove_stale_outputs(out_dir, args.episode_id)
    statuses = {}
    outputs = {}

    audio_path, statuses["audio_extract"] = extract_audio(video, out_dir, args.episode_id, args.skip_audio)
    if not statuses["audio_extract"].get("ok"):
        statuses.update(optional_tool_status())
        status_path = out_dir / f"{args.episode_id}_audio_tool_status.json"
        write_json(status_path, statuses)
        print(json.dumps({"ok": False, "audio": str(audio_path), "status": str(status_path), "statuses": statuses}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    try:
        vad_rows, silence_rows, peak_rows, statuses["vad"] = silero_vad(audio_path, args.episode_id)
        if vad_rows is None:
            silero_status = statuses["vad"]
            vad_rows, silence_rows, peak_rows, statuses["vad"] = energy_vad(audio_path, args.episode_id)
            statuses["vad"]["fallback_from"] = silero_status
    except Exception as exc:
        try:
            vad_rows, silence_rows, peak_rows, statuses["vad"] = energy_vad(audio_path, args.episode_id)
            statuses["vad"]["fallback_from"] = {
                "ok": False,
                "method": "silero_vad",
                "status": "failed",
                "reason": f"{exc.__class__.__name__}: {exc}",
            }
        except Exception as fallback_exc:
            vad_rows, silence_rows, peak_rows = [], [], []
            statuses["vad"] = {
                "ok": False,
                "method": "energy_vad_fallback",
                "status": "failed",
                "reason": f"{fallback_exc.__class__.__name__}: {fallback_exc}",
                "fallback_from": f"{exc.__class__.__name__}: {exc}",
            }

    hq_vad_rows = []
    hq_asr_rows = []
    skip_hq_qwen3 = args.skip_qwen3 or args.skip_sensevoice
    if args.run_hq_audio and not args.skip_hq_audio:
        hq_python = Path(args.hq_python) if args.hq_python else default_hq_python()
        statuses["hq_audio"], hq_vad_rows, hq_asr_rows = run_hq_audio(
            audio_path,
            out_dir,
            args.episode_id,
            hq_python,
            args.hq_device,
            skip_hq_qwen3,
        )
    else:
        statuses["hq_audio"] = {
            "ok": False,
            "status": "not_run_default",
            "reason": "pass --run-hq-audio to run optional high-quality audio calibration",
        }

    transcript_rows, statuses["asr"] = run_asr(audio_path, args.episode_id, args)
    if statuses["asr"].get("backend") == "qwen3_asr":
        statuses["qwen3_asr"] = statuses["asr"]
    elif statuses["asr"].get("backend") == "faster_whisper":
        statuses["faster_whisper"] = statuses["asr"]

    speaker_rows, statuses["speaker_diarization"] = run_speaker_second_pass(
        audio_path,
        transcript_rows,
        args.episode_id,
        args,
    )

    faster_dialogue_rows = transcript_to_dialogue_ledger(args.episode_id, transcript_rows) if transcript_rows else []
    if hq_asr_rows:
        dialogue_rows = hq_asr_rows + faster_dialogue_rows
    elif faster_dialogue_rows:
        dialogue_rows = faster_dialogue_rows
    elif hq_vad_rows:
        dialogue_rows = hq_vad_rows
    else:
        dialogue_rows = list(vad_rows)
    if not transcript_rows and not statuses["asr"].get("ok"):
        outputs["asr_blocker"] = str(write_asr_blocker(out_dir, args.episode_id, statuses["asr"]))

    event_rows = []
    event_rows.extend(dialogue_rows)
    event_rows.extend(hq_vad_rows)
    event_rows.extend(vad_rows)
    event_rows.extend(silence_rows)
    event_rows = sorted(event_rows, key=lambda row: float(row.get("start_sec") or 0))

    ledger_fields = [
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
    transcript_fields = [
        "index",
        "speaker",
        "start",
        "end",
        "start_timecode",
        "end_timecode",
        "text",
        "avg_logprob",
        "no_speech_prob",
        "source_tool",
        "notes",
    ]

    vad_csv = out_dir / f"{args.episode_id}_vad_segments.csv"
    vad_json = out_dir / f"{args.episode_id}_vad_segments.json"
    write_csv(vad_csv, vad_rows, ledger_fields)
    write_json(vad_json, {"episode_id": args.episode_id, "rows": vad_rows})
    outputs["vad_segments_csv"] = str(vad_csv)
    outputs["vad_segments_json"] = str(vad_json)

    transcript_csv = out_dir / f"{args.episode_id}_transcript_segments.csv"
    transcript_json = out_dir / f"{args.episode_id}_transcript_segments.json"
    if transcript_rows:
        write_csv(transcript_csv, transcript_rows, transcript_fields)
        write_json(transcript_json, {
            "episode_id": args.episode_id,
            "audio": str(audio_path),
            "tool": statuses["asr"].get("backend", "asr"),
            "status": statuses["asr"],
            "segments": transcript_rows,
        })
        transcript_srt = out_dir / f"{args.episode_id}_transcript.srt"
        write_srt(transcript_srt, transcript_rows)
        outputs["transcript_segments_csv"] = str(transcript_csv)
        outputs["transcript_segments_json"] = str(transcript_json)
        outputs["transcript_srt"] = str(transcript_srt)
        if statuses["asr"].get("backend") == "qwen3_asr":
            qwen_dialogue_rows = transcript_to_dialogue_ledger(args.episode_id, transcript_rows)
            qwen_dialogue_csv = out_dir / f"{args.episode_id}_qwen3_asr_dialogue_ledger.csv"
            qwen_dialogue_json = out_dir / f"{args.episode_id}_qwen3_asr_dialogue_ledger.json"
            write_csv(qwen_dialogue_csv, qwen_dialogue_rows, ledger_fields)
            write_json(qwen_dialogue_json, {
                "episode_id": args.episode_id,
                "rows": qwen_dialogue_rows,
                "status": statuses["asr"],
            })
            outputs["qwen3_asr_dialogue_ledger_csv"] = str(qwen_dialogue_csv)
            outputs["qwen3_asr_dialogue_ledger_json"] = str(qwen_dialogue_json)

    if speaker_rows:
        speaker_csv = out_dir / f"{args.episode_id}_speaker_ledger.csv"
        speaker_json = out_dir / f"{args.episode_id}_speaker_ledger.json"
        speaker_fields = ["index", "speaker", "start", "end", "start_timecode", "end_timecode", "confidence", "source_tool", "notes"]
        write_csv(speaker_csv, speaker_rows, speaker_fields)
        write_json(speaker_json, {"episode_id": args.episode_id, "rows": speaker_rows, "status": statuses["speaker_diarization"]})
        outputs["speaker_ledger_csv"] = str(speaker_csv)
        outputs["speaker_ledger_json"] = str(speaker_json)

    dialogue_csv = out_dir / f"{args.episode_id}_dialogue_ledger.csv"
    dialogue_json = out_dir / f"{args.episode_id}_dialogue_ledger.json"
    write_csv(dialogue_csv, dialogue_rows, ledger_fields)
    write_json(dialogue_json, {"episode_id": args.episode_id, "rows": dialogue_rows})
    outputs["dialogue_ledger_csv"] = str(dialogue_csv)
    outputs["dialogue_ledger_json"] = str(dialogue_json)

    event_csv = out_dir / f"{args.episode_id}_audio_event_ledger.csv"
    event_json = out_dir / f"{args.episode_id}_audio_event_ledger.json"
    write_csv(event_csv, event_rows, ledger_fields)
    write_json(event_json, {"episode_id": args.episode_id, "rows": event_rows})
    outputs["audio_event_ledger_csv"] = str(event_csv)
    outputs["audio_event_ledger_json"] = str(event_json)

    statuses["quality_gate"] = build_quality_gate_status(statuses, args, transcript_rows, speaker_rows)
    statuses.update(optional_tool_status())
    status_path = out_dir / f"{args.episode_id}_audio_tool_status.json"
    write_json(status_path, statuses)
    outputs["audio_tool_status"] = str(status_path)
    outputs["audio_evidence_summary"] = str(build_summary(out_dir, args.episode_id, audio_path, statuses, outputs))

    print(json.dumps({
        "ok": True,
        "episode_id": args.episode_id,
        "audio": str(audio_path),
        "vad_segments": len(vad_rows),
        "dialogue_rows": len(dialogue_rows),
        "audio_event_rows": len(event_rows),
        "transcript_segments": len(transcript_rows),
        "hq_vad_rows": len(hq_vad_rows),
        "hq_asr_rows": len(hq_asr_rows),
        "speaker_rows": len(speaker_rows),
        "quality_gate": statuses["quality_gate"],
        "outputs": outputs,
        "statuses": statuses,
    }, ensure_ascii=False, indent=2))
    if args.strict_quality_gate and not statuses["quality_gate"].get("ok"):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
