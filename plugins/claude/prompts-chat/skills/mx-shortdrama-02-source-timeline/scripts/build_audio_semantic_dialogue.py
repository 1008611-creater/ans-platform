#!/usr/bin/env python3
import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path


PUNCT_RE = re.compile(r"[\s，。！？、,.!?;；:：\"'“”‘’（）()《》<>【】\[\]-]+")

DEFAULT_REPLACEMENTS = [
    {"from": "媒体", "to": "眉笔", "context": ["直播", "产品", "价格", "下单", "优惠"]},
    {"from": "媒笔", "to": "眉笔", "context": ["直播", "产品", "价格", "下单", "优惠"]},
    {"from": "秦郎", "to": "秦朗", "context": ["池雪", "轻舟", "直播", "合同", "男朋友", "分手"]},
    {"from": "秦老", "to": "秦朗", "context": ["池雪", "轻舟", "直播", "合同", "男朋友", "分手"]},
    {"from": "吃走", "to": "池总", "context": ["直播", "公司", "观众", "合同", "举报", "封"]},
    {"from": "施总", "to": "池总", "context": ["直播", "公司", "观众", "合同", "举报", "封"]},
    {"from": "陆静舟", "to": "陆轻舟", "context": ["直播", "池总", "秦朗", "学弟", "粉丝", "公司"]},
    {"from": "陆青舟", "to": "陆轻舟", "context": ["直播", "池总", "秦朗", "学弟", "粉丝", "公司"]},
    {"from": "陆青州", "to": "陆轻舟", "context": ["直播", "池总", "秦朗", "学弟", "粉丝", "公司"]},
    {"from": "点击在直播间的下方", "to": "链接在直播间的下方", "context": ["直播间", "下单"]},
    {"from": "夫去幽默", "to": "风趣幽默", "context": ["直播", "主播"]},
    {"from": "结果眼", "to": "节骨眼", "context": ["时候", "业绩", "需要"]},
    {"from": "添毒", "to": "添堵", "context": ["生气", "辞职", "人事部"]},
]


def read_csv(path):
    if not path or not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows):
    fieldnames = ["index", "start", "end", "speaker", "clean_text", "confidence", "semantic_note", "evidence"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def normalize_text(text):
    return PUNCT_RE.sub("", str(text or "")).strip()


def parse_sec(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if ":" not in text:
        return float(text)
    parts = [float(part) for part in text.split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return float(text)


def fmt_mmss(sec):
    sec = float(sec or 0)
    minutes = int(sec // 60)
    seconds = sec - minutes * 60
    return f"{minutes:02d}:{seconds:05.2f}"


def load_json(path):
    if not path or not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def build_sensevoice_blob(rows):
    return normalize_text("".join(row.get("text", "") for row in rows))


def has_semantic_support(text, sensevoice_blob):
    normalized = normalize_text(text)
    if len(normalized) < 3 or not sensevoice_blob:
        return False
    return normalized in sensevoice_blob


def load_corrections(path):
    data = load_json(path)
    replacements = list(DEFAULT_REPLACEMENTS)
    replacements.extend(data.get("replacements", []))
    overrides = data.get("line_overrides") or data.get("lines") or {}
    return replacements, {str(key): value for key, value in overrides.items()}


def apply_replacements(text, context_text, replacements):
    changed = []
    output = text
    for item in replacements:
        source = item.get("from", "")
        target = item.get("to", "")
        if not source or source not in output:
            continue
        context_words = item.get("context") or []
        if context_words and not any(word in context_text for word in context_words):
            continue
        output = output.replace(source, target)
        changed.append(f"{source}->{target}")
    return output, changed


def speaker_for(start_sec, text, raw_speaker, speaker_map):
    if raw_speaker and raw_speaker not in {"speaker_unknown", "unknown", "未知"}:
        return raw_speaker
    for item in speaker_map:
        item_start = parse_sec(item.get("start_sec", item.get("start", 0))) or 0
        item_end = parse_sec(item.get("end_sec", item.get("end", 10**9))) or 10**9
        contains = item.get("contains") or []
        if isinstance(contains, str):
            contains = [contains]
        if item_start <= start_sec <= item_end and (not contains or any(token in text for token in contains)):
            return item.get("speaker", "未知/待确认")
    return "未知/待确认"


def confidence_for(text, raw_row, changed, semantic_support):
    normalized = normalize_text(text)
    try:
        no_speech_prob = float(raw_row.get("no_speech_prob", 0) or 0)
    except ValueError:
        no_speech_prob = 0
    try:
        avg_logprob = float(raw_row.get("avg_logprob", 0) or 0)
    except ValueError:
        avg_logprob = 0
    if not normalized:
        return "low"
    if len(normalized) <= 2 or no_speech_prob >= 0.6 or avg_logprob <= -1.0:
        return "low"
    if changed:
        return "medium"
    if semantic_support:
        return "high"
    if len(normalized) <= 5:
        return "medium"
    return "medium"


def build_rows(transcript_rows, sensevoice_rows, replacements, overrides, speaker_map):
    sensevoice_blob = build_sensevoice_blob(sensevoice_rows)
    rows = []
    for idx, raw in enumerate(transcript_rows, 1):
        start_sec = parse_sec(raw.get("start", raw.get("start_sec", 0))) or 0
        end_sec = parse_sec(raw.get("end", raw.get("end_sec", start_sec))) or start_sec
        text = str(raw.get("text", "")).strip()
        context_text = " ".join([
            transcript_rows[max(0, idx - 2)].get("text", "") if transcript_rows else "",
            text,
            transcript_rows[idx].get("text", "") if idx < len(transcript_rows) else "",
            "".join(row.get("text", "") for row in sensevoice_rows),
        ])
        clean_text, changed = apply_replacements(text, context_text, replacements)
        semantic_support = has_semantic_support(clean_text, sensevoice_blob) or has_semantic_support(text, sensevoice_blob)
        confidence = confidence_for(clean_text, raw, changed, semantic_support)
        note_parts = []
        if semantic_support:
            note_parts.append("SenseVoice/FunASR语义支持")
        if changed:
            note_parts.append("语义校正：" + "；".join(changed))
        if not note_parts:
            note_parts.append("来自faster-whisper时间戳；需结合画面校对")
        row = {
            "index": str(idx),
            "start": fmt_mmss(start_sec),
            "end": fmt_mmss(end_sec),
            "speaker": speaker_for(start_sec, clean_text, raw.get("speaker", ""), speaker_map),
            "clean_text": clean_text,
            "confidence": confidence,
            "semantic_note": "；".join(note_parts),
            "evidence": "ASR+语义分析；无OCR",
        }
        override = overrides.get(str(raw.get("index", idx))) or overrides.get(str(idx))
        if override:
            row.update({key: str(value) for key, value in override.items()})
            row["evidence"] = row.get("evidence") or "ASR+语义分析；无OCR；人工校正"
        rows.append(row)
    return rows


def write_markdown(path, episode_id, rows):
    counts = Counter(row.get("confidence", "") for row in rows)
    lines = [
        f"# {episode_id} 纯ASR+语义分析对白测试",
        "",
        "## 结论",
        "",
        f"- 不使用OCR，基于 faster-whisper 时间戳段、SenseVoice/FunASR 语义候选和校正规则，生成 {len(rows)} 行对白候选。",
        "- 可用于 Step02 原片对白顺序和镜头时间轴初稿；姓名、机构名、金额、屏幕文字和极短句仍需标注待确认。",
        "- OCR 应作为精确硬字幕/屏幕文字 QA 层，而不是当前项目的默认阻塞层。",
        "",
        "## 质量计数",
        "",
        "| 级别 | 行数 |",
        "| --- | ---: |",
        f"| high | {counts.get('high', 0)} |",
        f"| medium | {counts.get('medium', 0)} |",
        f"| low | {counts.get('low', 0)} |",
        "",
        "## 对白顺序测试稿",
        "",
        "| # | 时间 | 说话人 | 清理后对白 | 置信 | 说明 |",
        "| ---: | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['index']} | {row['start']}-{row['end']} | {row['speaker']} | "
            f"{row['clean_text']} | {row['confidence']} | {row['semantic_note']} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--step01-dir", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--transcript-csv")
    parser.add_argument("--sensevoice-csv")
    parser.add_argument("--corrections-json")
    parser.add_argument("--speaker-map-json")
    args = parser.parse_args()

    step01_dir = Path(args.step01_dir)
    out_dir = Path(args.out_dir)
    transcript_csv = Path(args.transcript_csv) if args.transcript_csv else step01_dir / f"{args.episode_id}_transcript_segments.csv"
    sensevoice_csv = Path(args.sensevoice_csv) if args.sensevoice_csv else step01_dir / f"{args.episode_id}_sensevoice_dialogue_ledger.csv"
    if not transcript_csv.exists():
        raise SystemExit(f"Missing transcript CSV: {transcript_csv}")

    replacements, overrides = load_corrections(Path(args.corrections_json) if args.corrections_json else None)
    speaker_map_data = load_json(Path(args.speaker_map_json) if args.speaker_map_json else None)
    speaker_map = speaker_map_data.get("speaker_map", speaker_map_data if isinstance(speaker_map_data, list) else [])
    rows = build_rows(
        read_csv(transcript_csv),
        read_csv(sensevoice_csv),
        replacements,
        overrides,
        speaker_map,
    )

    csv_path = out_dir / f"{args.episode_id}_audio_semantic_dialogue_ledger.csv"
    json_path = out_dir / f"{args.episode_id}_audio_semantic_dialogue_ledger.json"
    md_path = out_dir / f"{args.episode_id}_audio_semantic_dialogue_test.md"
    write_csv(csv_path, rows)
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown(md_path, args.episode_id, rows)

    print(json.dumps({
        "ok": True,
        "episode_id": args.episode_id,
        "rows": len(rows),
        "confidence_counts": Counter(row.get("confidence", "") for row in rows),
        "csv": str(csv_path),
        "json": str(json_path),
        "markdown": str(md_path),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
