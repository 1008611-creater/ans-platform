#!/usr/bin/env python3
import argparse
import base64
import csv
import json
import os
import re
import time
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np


CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")
TEXTISH_RE = re.compile(r"[\u4e00-\u9fffA-Za-z0-9]")
NORMALIZE_RE = re.compile(r"[\s，。！？、,.!?;；:：\"'“”‘’（）()《》<>【】\[\]-]+")
UNCERTAIN_TOKENS = [
    "待确认",
    "听不清",
    "分歧",
    "人名",
    "称呼",
    "集团",
    "机构",
    "短句",
    "错",
    "疑",
    "校正",
    "金额",
    "品牌",
]
EXACT_TEXT_TOKENS = [
    "元",
    "集团",
    "违约金",
    "优惠",
    "台本",
    "年终奖",
    "百万",
    "人事部",
    "辞职",
    "总裁",
    "眉笔",
]
SCREEN_KEYWORDS = [
    "屏幕",
    "文字",
    "评论",
    "弹幕",
    "直播界面",
    "手机",
    "监控",
    "数据",
    "商品页",
    "UI",
    "台本屏",
]
PADDLE_JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
PADDLE_MODEL = "PaddleOCR-VL-1.6"
BAIDU_TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
BAIDU_ACCURATE_BASIC_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic"


def read_csv(path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


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


def parse_sec(value):
    if value is None or value == "":
        return 0.0
    text = str(value).strip()
    if ":" not in text:
        return float(text)
    parts = [float(part) for part in text.split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return float(text)


def fmt_sec(sec):
    sec = float(sec)
    minute = int(sec // 60)
    second = sec - minute * 60
    return f"{minute:02d}:{second:05.2f}"


def normalize(text):
    return NORMALIZE_RE.sub("", str(text or "")).strip()


def safe_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def has_text(text):
    return bool(TEXTISH_RE.search(str(text or "")))


def is_probable_text(text):
    cleaned = normalize(text)
    chinese_count = len(CHINESE_RE.findall(cleaned))
    return chinese_count >= 2 or (len(cleaned) >= 3 and has_text(cleaned))


def image_read(path):
    return cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)


def region_specs(policy):
    regions = {
        "lower_subtitle": (0.52, 0.88),
    }
    if "comment" in policy or "screen" in policy:
        regions["upper_live_comment"] = (0.00, 0.52)
    if "screen" in policy:
        regions["full_frame"] = (0.00, 1.00)
    return regions


def target_regions_for_engine(policy, engine, region_mode):
    specs = region_specs(policy)
    if engine not in {"paddle-api", "baidu-api"} or region_mode == "all":
        return specs
    if "screen" in policy:
        return {"full_frame": specs.get("full_frame", (0.0, 1.0))}
    if "comment" in policy:
        return {"upper_live_comment": specs.get("upper_live_comment", (0.0, 0.52))}
    return {"lower_subtitle": specs.get("lower_subtitle", (0.52, 0.88))}


def line_needs_ocr(row):
    reasons = []
    confidence = str(row.get("confidence", "")).lower()
    speaker = str(row.get("speaker", ""))
    text = str(row.get("clean_text", row.get("text", "")))
    note = str(row.get("semantic_note", ""))
    combined = f"{speaker} {text} {note}"
    cleaned = normalize(text)
    if confidence in {"low", "medium"}:
        reasons.append(f"confidence_{confidence}")
    if 0 < len(cleaned) <= 2:
        reasons.append("short_fragment_subtitle_window")
    if any(token in combined for token in UNCERTAIN_TOKENS):
        reasons.append("uncertain_semantic_token")
    if any(token in text for token in EXACT_TEXT_TOKENS):
        reasons.append("exact_wording_or_number")
    if "观众弹幕" in speaker or "评论" in speaker:
        reasons.append("onscreen_comment_candidate")
    if "/" in speaker or "/" in text:
        reasons.append("variant_candidate")
    return reasons


def frame_rank(row):
    reason = str(row.get("reason", ""))
    score = 0.0
    if "subtitle_change" in reason:
        score += 8
    if "dialogue_start" in reason or "dialogue_end" in reason:
        score += 5
    if "audio_event" in reason:
        score += 3
    if "shot_mid" in reason or "shot_mid_sharp" in reason:
        score += 2
    if "shot_start" in reason or "shot_end" in reason:
        score += 1
    try:
        score += min(float(row.get("sharpness", 0)) / 1000.0, 2.0)
    except ValueError:
        pass
    return score


def time_in_range(sec, start, end):
    return start <= sec <= end


def parse_range(text):
    if not text or "-" not in str(text):
        return None
    left, right = str(text).split("-", 1)
    return parse_sec(left), parse_sec(right)


def load_timeline_windows(path):
    if not path or not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    windows = []
    for item in data.get("timeline", []):
        text = " ".join(str(item.get(key, "")) for key in ["beat", "visual", "blocking", "dialogue", "focus"])
        if not any(keyword in text for keyword in SCREEN_KEYWORDS):
            continue
        parsed = parse_range(item.get("range", ""))
        if not parsed:
            continue
        windows.append({
            "shot": item.get("shot", ""),
            "start": parsed[0],
            "end": parsed[1],
            "reason": "screen_or_text_timeline_row",
            "text": text,
        })
    return windows


def select_candidates(manifest_rows, dialogue_rows, timeline_windows, frame_dir, pad, max_frames_per_line, max_total_frames):
    manifest = []
    for row in manifest_rows:
        item = dict(row)
        item["time_float"] = float(item.get("time_sec", 0))
        if not item.get("path"):
            item["path"] = str(frame_dir / item.get("file", ""))
        item["rank"] = frame_rank(item)
        manifest.append(item)

    selected = {}
    line_reasons = {}
    for line in dialogue_rows:
        reasons = line_needs_ocr(line)
        if not reasons:
            continue
        line_id = str(line.get("index", len(line_reasons) + 1))
        start = parse_sec(line.get("start", 0)) - pad
        end = parse_sec(line.get("end", line.get("start", 0))) + pad
        candidates = [row for row in manifest if time_in_range(row["time_float"], start, end)]
        if not candidates and manifest:
            midpoint = (start + end) / 2
            candidates = [min(manifest, key=lambda row: abs(row["time_float"] - midpoint))]
        candidates = sorted(candidates, key=lambda row: (-row["rank"], abs(row["time_float"] - (start + end) / 2)))
        for frame in candidates[:max_frames_per_line]:
            key = frame["order"]
            selected.setdefault(key, {"frame": frame, "line_ids": set(), "reasons": set(), "policy": set()})
            selected[key]["line_ids"].add(line_id)
            selected[key]["reasons"].update(reasons)
            selected[key]["reasons"].add("dialogue_window")
            if "onscreen_comment_candidate" in reasons:
                selected[key]["policy"].add("comment")
            if any(reason in reasons for reason in ["exact_wording_or_number", "variant_candidate"]):
                selected[key]["policy"].add("subtitle")
            line_reasons[line_id] = reasons

    for window in timeline_windows:
        frames = [row for row in manifest if time_in_range(row["time_float"], window["start"], window["end"])]
        frames = sorted(frames, key=lambda row: (-row["rank"], abs(row["time_float"] - (window["start"] + window["end"]) / 2)))
        for frame in frames[:3]:
            key = frame["order"]
            selected.setdefault(key, {"frame": frame, "line_ids": set(), "reasons": set(), "policy": set()})
            selected[key]["reasons"].add(window["reason"])
            selected[key]["reasons"].add(f"timeline_shot:{window['shot']}")
            selected[key]["policy"].add("screen")

    rows = []
    for item in selected.values():
        frame = item["frame"]
        policy = item["policy"] or {"subtitle"}
        rows.append({
            "order": frame.get("order", ""),
            "time_sec": frame.get("time_sec", ""),
            "timecode": frame.get("timecode", ""),
            "frame_file": frame.get("file", ""),
            "frame_path": frame.get("path", ""),
            "reason": frame.get("reason", ""),
            "rank": round(float(frame.get("rank", 0)), 4),
            "line_ids": ";".join(sorted(item["line_ids"], key=lambda value: int(value) if value.isdigit() else 10**9)),
            "selection_reasons": ";".join(sorted(item["reasons"])),
            "policy": ";".join(sorted(policy)),
            "regions": ";".join(region_specs(policy).keys()),
        })
    rows = sorted(rows, key=lambda row: (float(row["time_sec"]), int(row["order"])))
    if len(rows) > max_total_frames:
        rows = sorted(rows, key=lambda row: (-float(row["rank"]), float(row["time_sec"])))[:max_total_frames]
        rows = sorted(rows, key=lambda row: (float(row["time_sec"]), int(row["order"])))
    return rows, line_reasons


def clean_ocr_text(text):
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", str(text or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def recursive_text_values(value):
    texts = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"text", "recText", "markdown"} and isinstance(item, str):
                texts.append(item)
            else:
                texts.extend(recursive_text_values(item))
    elif isinstance(value, list):
        for item in value:
            texts.extend(recursive_text_values(item))
    return texts


def parse_paddle_jsonl(text):
    outputs = []
    raw = []
    for line in str(text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        raw.append(payload)
        result = payload.get("result", payload)
        layout_results = result.get("layoutParsingResults", []) if isinstance(result, dict) else []
        for layout in layout_results:
            markdown = layout.get("markdown", {}) if isinstance(layout, dict) else {}
            md_text = markdown.get("text", "") if isinstance(markdown, dict) else ""
            md_text = clean_ocr_text(md_text)
            if md_text:
                outputs.append(md_text)
        if not outputs:
            for value in recursive_text_values(result):
                value = clean_ocr_text(value)
                if value:
                    outputs.append(value)
    return " ".join(dict.fromkeys(outputs)), raw


def extract_text_from_paddle_meta(meta):
    outputs = []
    for payload in meta.get("raw_jsonl", []) if isinstance(meta, dict) else []:
        result = payload.get("result", payload) if isinstance(payload, dict) else payload
        layout_results = result.get("layoutParsingResults", []) if isinstance(result, dict) else []
        for layout in layout_results:
            markdown = layout.get("markdown", {}) if isinstance(layout, dict) else {}
            md_text = markdown.get("text", "") if isinstance(markdown, dict) else ""
            md_text = clean_ocr_text(md_text)
            if md_text:
                outputs.append(md_text)
        if not outputs:
            for value in recursive_text_values(result):
                value = clean_ocr_text(value)
                if value:
                    outputs.append(value)
    return " ".join(dict.fromkeys(outputs))


def submit_paddle_job(file_path, token, model, job_url, poll_interval, timeout_sec):
    import requests

    headers = {"Authorization": f"bearer {token}"}
    optional_payload = {
        "useDocOrientationClassify": False,
        "useDocUnwarping": False,
        "useChartRecognition": False,
    }
    data = {
        "model": model,
        "optionalPayload": json.dumps(optional_payload, ensure_ascii=False),
    }
    with open(file_path, "rb") as f:
        response = requests.post(job_url, headers=headers, data=data, files={"file": f}, timeout=60)
    if response.status_code != 200:
        raise RuntimeError(f"paddle job submit failed: {response.status_code} {response.text[:300]}")
    job_id = response.json()["data"]["jobId"]
    deadline = time.time() + timeout_sec
    last_state = ""
    while time.time() < deadline:
        result_response = requests.get(f"{job_url}/{job_id}", headers=headers, timeout=60)
        if result_response.status_code != 200:
            raise RuntimeError(f"paddle job poll failed: {result_response.status_code} {result_response.text[:300]}")
        payload = result_response.json()
        data = payload.get("data", {})
        state = data.get("state", "")
        last_state = state
        if state == "done":
            json_url = data.get("resultUrl", {}).get("jsonUrl", "")
            if not json_url:
                return "", {"job_id": job_id, "state": state, "warning": "missing_json_url"}
            jsonl_response = requests.get(json_url, timeout=120)
            jsonl_response.raise_for_status()
            parsed_text, raw_jsonl = parse_paddle_jsonl(jsonl_response.text)
            return parsed_text, {"job_id": job_id, "state": state, "json_url": json_url, "raw_jsonl": raw_jsonl}
        if state == "failed":
            raise RuntimeError(f"paddle job failed: {data.get('errorMsg', '')}")
        time.sleep(poll_interval)
    raise RuntimeError(f"paddle job timeout after {timeout_sec}s, last_state={last_state}, job_id={job_id}")


def get_baidu_access_token(api_key, secret_key, token_value):
    token_value = str(token_value or "").strip()
    if token_value:
        return token_value
    api_key = str(api_key or "").strip()
    secret_key = str(secret_key or "").strip()
    if not api_key or not secret_key:
        raise RuntimeError("Missing Baidu OCR credentials. Set BAIDU_OCR_ACCESS_TOKEN or BAIDU_OCR_API_KEY and BAIDU_OCR_SECRET_KEY.")
    import requests

    params = {
        "grant_type": "client_credentials",
        "client_id": api_key,
        "client_secret": secret_key,
    }
    response = requests.get(BAIDU_TOKEN_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    access_token = payload.get("access_token", "")
    if not access_token:
        raise RuntimeError(f"Baidu OCR token request failed: {payload}")
    return access_token


def submit_baidu_ocr(file_path, access_token, api_url, timeout_sec):
    import requests

    with open(file_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("ascii")
    data = {
        "image": image_b64,
        "detect_direction": "true",
        "paragraph": "false",
        "probability": "true",
    }
    response = requests.post(
        f"{api_url}?access_token={access_token}",
        data=data,
        timeout=timeout_sec,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("error_code"):
        raise RuntimeError(f"Baidu OCR failed: {payload}")
    words = []
    for item in payload.get("words_result", []) or []:
        text = clean_ocr_text(item.get("words", ""))
        if not text or not is_probable_text(text):
            continue
        prob = safe_float((item.get("probability") or {}).get("average", ""), 0.0)
        words.append({"text": text, "score": round(prob, 4)})
    return " ".join(dict.fromkeys(word["text"] for word in words)), payload, words


def write_region_image(image, candidate, region_name, top, bottom, crops_dir):
    height = image.shape[0]
    y1 = int(height * top)
    y2 = int(height * bottom)
    crop = image[y1:y2, :]
    if crop.size == 0:
        return None
    stem = Path(candidate["frame_file"]).stem
    crop_path = crops_dir / f"{candidate['order']}_{stem}_{region_name}.png"
    ok, buf = cv2.imencode(".png", crop, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    if not ok:
        return None
    crop_path.parent.mkdir(parents=True, exist_ok=True)
    buf.tofile(str(crop_path))
    return crop_path


def run_ocr(
    candidates,
    min_score,
    engine,
    out_dir,
    paddle_token,
    paddle_model,
    paddle_job_url,
    paddle_poll_interval,
    paddle_timeout,
    paddle_region_mode,
    baidu_access_token,
    baidu_api_key,
    baidu_secret_key,
    baidu_ocr_url,
    baidu_timeout,
):
    if engine == "paddle-api":
        return run_paddle_api_ocr(
            candidates,
            out_dir,
            paddle_token,
            paddle_model,
            paddle_job_url,
            paddle_poll_interval,
            paddle_timeout,
            paddle_region_mode,
        )
    if engine == "baidu-api":
        return run_baidu_api_ocr(
            candidates,
            out_dir,
            baidu_access_token,
            baidu_api_key,
            baidu_secret_key,
            baidu_ocr_url,
            baidu_timeout,
            paddle_region_mode,
        )
    return run_rapidocr(candidates, min_score)


def run_rapidocr(candidates, min_score):
    try:
        from rapidocr_onnxruntime import RapidOCR
    except Exception as exc:
        raise SystemExit(f"rapidocr_onnxruntime unavailable: {exc}")
    ocr = RapidOCR()
    ledger = []
    errors = []
    for candidate in candidates:
        frame_path = Path(candidate["frame_path"])
        image = image_read(frame_path)
        if image is None:
            errors.append({"frame_file": candidate["frame_file"], "error": "image_read_failed"})
            continue
        height = image.shape[0]
        width = image.shape[1]
        policies = set(filter(None, candidate.get("policy", "").split(";"))) or {"subtitle"}
        for region_name, (top, bottom) in region_specs(policies).items():
            y1 = int(height * top)
            y2 = int(height * bottom)
            crop = image[y1:y2, :]
            if crop.size == 0:
                continue
            try:
                result, _ = ocr(crop)
            except Exception as exc:
                errors.append({"frame_file": candidate["frame_file"], "region": region_name, "error": str(exc)})
                continue
            lines = []
            if result:
                for item in result:
                    box, text, score_raw = item[0], str(item[1]).strip(), float(item[2])
                    if not text or score_raw < min_score or not is_probable_text(text):
                        continue
                    x_center = sum(point[0] for point in box) / 4
                    y_center = y1 + sum(point[1] for point in box) / 4
                    lines.append({
                        "text": text,
                        "score": round(score_raw, 4),
                        "x_center": round(x_center / max(width, 1), 4),
                        "y_center": round(y_center / max(height, 1), 4),
                    })
            if not lines:
                continue
            text = " ".join(line["text"] for line in lines)
            ledger.append({
                "order": candidate["order"],
                "time_sec": candidate["time_sec"],
                "timecode": candidate["timecode"],
                "frame_file": candidate["frame_file"],
                "region": region_name,
                "region_top": top,
                "region_bottom": bottom,
                "ocr_text": text,
                "avg_score": round(sum(line["score"] for line in lines) / len(lines), 4),
                "line_ids": candidate.get("line_ids", ""),
                "selection_reasons": candidate.get("selection_reasons", ""),
                "lines_json": json.dumps(lines, ensure_ascii=False),
            })
    return ledger, errors


def run_paddle_api_ocr(candidates, out_dir, token, model, job_url, poll_interval, timeout_sec, region_mode):
    if not token:
        raise SystemExit("Missing PaddleOCR API token. Set PADDLEOCR_API_TOKEN or pass --paddle-api-token.")
    ledger = []
    errors = []
    crops_dir = out_dir / "paddle_crops"
    raw_dir = out_dir / "paddle_raw"
    for candidate in candidates:
        frame_path = Path(candidate["frame_path"])
        image = image_read(frame_path)
        if image is None:
            errors.append({"frame_file": candidate["frame_file"], "error": "image_read_failed"})
            continue
        policies = set(filter(None, candidate.get("policy", "").split(";"))) or {"subtitle"}
        for region_name, (top, bottom) in target_regions_for_engine(policies, "paddle-api", region_mode).items():
            crop_path = write_region_image(image, candidate, region_name, top, bottom, crops_dir)
            if not crop_path:
                continue
            raw_path = raw_dir / f"{candidate['order']}_{Path(candidate['frame_file']).stem}_{region_name}.json"
            if raw_path.exists():
                try:
                    meta = json.loads(raw_path.read_text(encoding="utf-8"))
                    ocr_text = extract_text_from_paddle_meta(meta)
                except Exception as exc:
                    errors.append({"frame_file": candidate["frame_file"], "region": region_name, "error": f"cached_raw_unreadable: {exc}"})
                    continue
            else:
                try:
                    ocr_text, meta = submit_paddle_job(
                        crop_path,
                        token,
                        model,
                        job_url,
                        poll_interval,
                        timeout_sec,
                    )
                except Exception as exc:
                    errors.append({"frame_file": candidate["frame_file"], "region": region_name, "error": str(exc)})
                    continue
                raw_path.parent.mkdir(parents=True, exist_ok=True)
                raw_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
            ocr_text = clean_ocr_text(ocr_text)
            if not ocr_text or not is_probable_text(ocr_text):
                continue
            ledger.append({
                "order": candidate["order"],
                "time_sec": candidate["time_sec"],
                "timecode": candidate["timecode"],
                "frame_file": candidate["frame_file"],
                "region": region_name,
                "region_top": top,
                "region_bottom": bottom,
                "ocr_text": ocr_text,
                "avg_score": "",
                "line_ids": candidate.get("line_ids", ""),
                "selection_reasons": candidate.get("selection_reasons", ""),
                "lines_json": json.dumps([{"text": ocr_text, "score": "", "source": "paddle-api", "crop": str(crop_path)}], ensure_ascii=False),
            })
    return ledger, errors


def run_baidu_api_ocr(candidates, out_dir, access_token, api_key, secret_key, api_url, timeout_sec, region_mode):
    access_token = get_baidu_access_token(api_key, secret_key, access_token)
    ledger = []
    errors = []
    crops_dir = out_dir / "baidu_crops"
    raw_dir = out_dir / "baidu_raw"
    for candidate in candidates:
        frame_path = Path(candidate["frame_path"])
        image = image_read(frame_path)
        if image is None:
            errors.append({"frame_file": candidate["frame_file"], "error": "image_read_failed"})
            continue
        policies = set(filter(None, candidate.get("policy", "").split(";"))) or {"subtitle"}
        for region_name, (top, bottom) in target_regions_for_engine(policies, "baidu-api", region_mode).items():
            crop_path = write_region_image(image, candidate, region_name, top, bottom, crops_dir)
            if not crop_path:
                continue
            raw_path = raw_dir / f"{candidate['order']}_{Path(candidate['frame_file']).stem}_{region_name}.json"
            if raw_path.exists():
                try:
                    payload = json.loads(raw_path.read_text(encoding="utf-8"))
                    words = payload.get("_clean_words", [])
                    ocr_text = " ".join(dict.fromkeys(str(word.get("text", "")) for word in words if word.get("text")))
                except Exception as exc:
                    errors.append({"frame_file": candidate["frame_file"], "region": region_name, "error": f"cached_raw_unreadable: {exc}"})
                    continue
            else:
                try:
                    ocr_text, payload, words = submit_baidu_ocr(crop_path, access_token, api_url, timeout_sec)
                except Exception as exc:
                    errors.append({"frame_file": candidate["frame_file"], "region": region_name, "error": str(exc)})
                    continue
                payload["_clean_words"] = words
                raw_path.parent.mkdir(parents=True, exist_ok=True)
                raw_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            ocr_text = clean_ocr_text(ocr_text)
            if not ocr_text or not is_probable_text(ocr_text):
                continue
            scores = [safe_float(word.get("score", ""), 0.0) for word in payload.get("_clean_words", [])]
            avg_score = round(sum(scores) / len(scores), 4) if scores else ""
            ledger.append({
                "order": candidate["order"],
                "time_sec": candidate["time_sec"],
                "timecode": candidate["timecode"],
                "frame_file": candidate["frame_file"],
                "region": region_name,
                "region_top": top,
                "region_bottom": bottom,
                "ocr_text": ocr_text,
                "avg_score": avg_score,
                "line_ids": candidate.get("line_ids", ""),
                "selection_reasons": candidate.get("selection_reasons", ""),
                "lines_json": json.dumps([{"text": ocr_text, "score": avg_score, "source": "baidu-api", "crop": str(crop_path)}], ensure_ascii=False),
            })
    return ledger, errors


def overlap_score(left, right):
    a = normalize(left)
    b = normalize(right)
    if not a or not b:
        return 0.0
    a_chars = set(a)
    b_chars = set(b)
    return len(a_chars & b_chars) / max(len(a_chars), 1)


def reconcile_dialogue(dialogue_rows, line_reasons, ocr_ledger):
    by_line = defaultdict(list)
    for row in ocr_ledger:
        for line_id in filter(None, str(row.get("line_ids", "")).split(";")):
            by_line[line_id].append(row)
    rows = []
    for line in dialogue_rows:
        line_id = str(line.get("index", ""))
        if line_id not in line_reasons:
            continue
        asr_text = line.get("clean_text", line.get("text", ""))
        matches = by_line.get(line_id, [])
        scored = []
        for match in matches:
            score = overlap_score(asr_text, match.get("ocr_text", ""))
            scored.append((score, match))
        scored.sort(key=lambda pair: (-pair[0], -safe_float(pair[1].get("avg_score", 0))))
        best = scored[0] if scored else (0, {})
        if not matches:
            verdict = "no_ocr_text"
        elif best[0] >= 0.75:
            verdict = "ocr_supports_asr"
        elif best[0] >= 0.35:
            verdict = "ocr_partial_or_variant"
        else:
            verdict = "ocr_screen_extra_or_disagrees"
        rows.append({
            "index": line_id,
            "start": line.get("start", ""),
            "end": line.get("end", ""),
            "speaker": line.get("speaker", ""),
            "asr_text": asr_text,
            "confidence": line.get("confidence", ""),
            "need_reasons": ";".join(line_reasons.get(line_id, [])),
            "candidate_ocr_rows": len(matches),
            "best_overlap": round(best[0], 4),
            "best_ocr_text": best[1].get("ocr_text", ""),
            "best_ocr_timecode": best[1].get("timecode", ""),
            "best_region": best[1].get("region", ""),
            "verdict": verdict,
        })
    return rows


def write_summary(path, episode_id, candidates, ocr_rows, reconcile_rows, errors):
    verdict_counts = defaultdict(int)
    for row in reconcile_rows:
        verdict_counts[row["verdict"]] += 1
    confidence_counts = defaultdict(int)
    for row in reconcile_rows:
        confidence_counts[row.get("confidence", "")] += 1
    lines = [
        f"# {episode_id} 智能选择 OCR 校对报告",
        "",
        "## 结论",
        "",
        f"- 候选帧：{len(candidates)}；OCR有效区域行：{len(ocr_rows)}；被校对白行：{len(reconcile_rows)}。",
        "- 选择逻辑：ASR中低置信、语义分歧/待确认、人名/机构/金额/短句、观众弹幕、Step02时间轴中的屏幕/评论/数据文字镜头。",
        "- OCR 作为校对层：支持或修正 ASR 的精确文本，但不自动覆盖人名/机构名，仍需人工最终确认。",
        "",
        "## 对白校对计数",
        "",
        "| Verdict | 行数 |",
        "| --- | ---: |",
    ]
    for key in ["ocr_supports_asr", "ocr_partial_or_variant", "ocr_screen_extra_or_disagrees", "no_ocr_text"]:
        lines.append(f"| {key} | {verdict_counts.get(key, 0)} |")
    lines.extend([
        "",
        "## 置信来源计数",
        "",
        "| ASR置信 | 行数 |",
        "| --- | ---: |",
    ])
    for key in ["high", "medium", "low"]:
        lines.append(f"| {key} | {confidence_counts.get(key, 0)} |")
    lines.extend([
        "",
        "## 重点 OCR 命中",
        "",
        "| # | 时间 | ASR文本 | OCR文本 | Verdict |",
        "| ---: | --- | --- | --- | --- |",
    ])
    important = [
        row
        for row in reconcile_rows
        if row["verdict"] in {"ocr_supports_asr", "ocr_partial_or_variant"}
        and row.get("best_ocr_text")
    ][:40]
    for row in important:
        lines.append(
            f"| {row['index']} | {row['start']}-{row['end']} | {row['asr_text']} | "
            f"{row['best_ocr_text']} | {row['verdict']} |"
        )
    if errors:
        lines.extend(["", "## OCR错误", ""])
        for error in errors[:20]:
            lines.append(f"- {error}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--step01-dir", required=True)
    parser.add_argument("--step02-dir", required=True)
    parser.add_argument("--dialogue-ledger")
    parser.add_argument("--timeline-json")
    parser.add_argument("--out-dir")
    parser.add_argument("--pad-sec", type=float, default=0.35)
    parser.add_argument("--max-frames-per-line", type=int, default=3)
    parser.add_argument("--max-total-frames", type=int, default=140)
    parser.add_argument("--ocr-min-score", type=float, default=0.45)
    parser.add_argument("--engine", choices=["baidu-api", "paddle-api", "rapidocr"], default="baidu-api")
    parser.add_argument("--paddle-api-token", default=os.environ.get("PADDLEOCR_API_TOKEN") or os.environ.get("PADDLEOCR_AISTUDIO_TOKEN", ""))
    parser.add_argument("--paddle-model", default=PADDLE_MODEL)
    parser.add_argument("--paddle-job-url", default=PADDLE_JOB_URL)
    parser.add_argument("--paddle-poll-interval", type=float, default=5.0)
    parser.add_argument("--paddle-timeout-sec", type=float, default=180.0)
    parser.add_argument("--paddle-region-mode", choices=["single", "all"], default="single")
    parser.add_argument("--baidu-access-token", default=os.environ.get("BAIDU_OCR_ACCESS_TOKEN", ""))
    parser.add_argument("--baidu-api-key", default=os.environ.get("BAIDU_OCR_API_KEY") or os.environ.get("BAIDU_API_KEY", ""))
    parser.add_argument("--baidu-secret-key", default=os.environ.get("BAIDU_OCR_SECRET_KEY") or os.environ.get("BAIDU_SECRET_KEY", ""))
    parser.add_argument("--baidu-ocr-url", default=os.environ.get("BAIDU_OCR_URL", BAIDU_ACCURATE_BASIC_URL))
    parser.add_argument("--baidu-timeout-sec", type=float, default=60.0)
    args = parser.parse_args()

    step01_dir = Path(args.step01_dir)
    step02_dir = Path(args.step02_dir)
    out_dir = Path(args.out_dir) if args.out_dir else step02_dir / "smart_ocr"
    dialogue_ledger = Path(args.dialogue_ledger) if args.dialogue_ledger else step02_dir / f"{args.episode_id}_audio_semantic_dialogue_ledger.csv"
    timeline_json = Path(args.timeline_json) if args.timeline_json else step02_dir / f"{args.episode_id}_step02_source_timeline_data.json"
    manifest_csv = step01_dir / f"{args.episode_id}_frame_manifest.csv"
    if not manifest_csv.exists():
        raise SystemExit(f"Missing manifest: {manifest_csv}")
    if not dialogue_ledger.exists():
        raise SystemExit(f"Missing dialogue ledger: {dialogue_ledger}")

    candidates, line_reasons = select_candidates(
        read_csv(manifest_csv),
        read_csv(dialogue_ledger),
        load_timeline_windows(timeline_json),
        step01_dir / "reference_frames_original",
        args.pad_sec,
        args.max_frames_per_line,
        args.max_total_frames,
    )
    ocr_rows, errors = run_ocr(
        candidates,
        args.ocr_min_score,
        args.engine,
        out_dir,
        args.paddle_api_token,
        args.paddle_model,
        args.paddle_job_url,
        args.paddle_poll_interval,
        args.paddle_timeout_sec,
        args.paddle_region_mode,
        args.baidu_access_token,
        args.baidu_api_key,
        args.baidu_secret_key,
        args.baidu_ocr_url,
        args.baidu_timeout_sec,
    )
    reconcile_rows = reconcile_dialogue(read_csv(dialogue_ledger), line_reasons, ocr_rows)

    candidate_fields = [
        "order",
        "time_sec",
        "timecode",
        "frame_file",
        "frame_path",
        "reason",
        "rank",
        "line_ids",
        "selection_reasons",
        "policy",
        "regions",
    ]
    ocr_fields = [
        "order",
        "time_sec",
        "timecode",
        "frame_file",
        "region",
        "region_top",
        "region_bottom",
        "ocr_text",
        "avg_score",
        "line_ids",
        "selection_reasons",
        "lines_json",
    ]
    reconcile_fields = [
        "index",
        "start",
        "end",
        "speaker",
        "asr_text",
        "confidence",
        "need_reasons",
        "candidate_ocr_rows",
        "best_overlap",
        "best_ocr_text",
        "best_ocr_timecode",
        "best_region",
        "verdict",
    ]
    write_csv(out_dir / f"{args.episode_id}_smart_ocr_candidates.csv", candidates, candidate_fields)
    write_json(out_dir / f"{args.episode_id}_smart_ocr_candidates.json", candidates)
    write_csv(out_dir / f"{args.episode_id}_smart_ocr_ledger.csv", ocr_rows, ocr_fields)
    write_json(out_dir / f"{args.episode_id}_smart_ocr_ledger.json", ocr_rows)
    write_csv(out_dir / f"{args.episode_id}_smart_ocr_dialogue_reconcile.csv", reconcile_rows, reconcile_fields)
    write_json(out_dir / f"{args.episode_id}_smart_ocr_dialogue_reconcile.json", reconcile_rows)
    write_json(out_dir / f"{args.episode_id}_smart_ocr_errors.json", errors)
    write_summary(out_dir / f"{args.episode_id}_smart_ocr_summary.md", args.episode_id, candidates, ocr_rows, reconcile_rows, errors)

    print(json.dumps({
        "ok": True,
        "episode_id": args.episode_id,
        "candidate_frames": len(candidates),
        "ocr_rows": len(ocr_rows),
        "dialogue_reconcile_rows": len(reconcile_rows),
        "errors": len(errors),
        "engine": args.engine,
        "out_dir": str(out_dir),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
