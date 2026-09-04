#!/usr/bin/env python3
"""Generate TikTok-style key-highlight captions and optionally burn them in."""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import ImageFont


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "so",
    "the",
    "then",
    "this",
    "to",
    "under",
    "you",
    "your",
}


@dataclass
class Word:
    start: float
    end: float
    text: str
    highlight: bool = False


def run_json(cmd: list[str]) -> dict:
    result = subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8")
    return json.loads(result.stdout)


def ffprobe_video(path: Path) -> dict:
    data = run_json(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=index,codec_type,width,height,avg_frame_rate",
            "-of",
            "json",
            str(path),
        ]
    )
    video = next(s for s in data["streams"] if s.get("codec_type") == "video")
    return {
        "width": int(video["width"]),
        "height": int(video["height"]),
        "duration": float(data["format"]["duration"]),
        "fps": video.get("avg_frame_rate", ""),
    }


def normalize(token: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", token.lower())


def script_tokens(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?[.,!?;:]?", text)


def transcribe_words(video: Path, model_name: str, language: str) -> tuple[list[Word], dict]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(video),
        task="transcribe",
        language=language,
        beam_size=5,
        word_timestamps=True,
        vad_filter=False,
    )
    words: list[Word] = []
    raw_segments = []
    for seg in segments:
        seg_words = []
        for w in seg.words or []:
            word = Word(float(w.start), float(w.end), w.word.strip())
            if word.text:
                words.append(word)
                seg_words.append({"start": word.start, "end": word.end, "word": word.text})
        raw_segments.append({"start": seg.start, "end": seg.end, "text": seg.text.strip(), "words": seg_words})
    return words, {"language": info.language, "duration": info.duration, "segments": raw_segments}


def apply_script_text(words: list[Word], script_text: str) -> None:
    tokens = script_tokens(script_text)
    if len(tokens) != len(words):
        print(f"WARNING: script word count {len(tokens)} != ASR word count {len(words)}; keeping ASR text.")
        return
    for word, token in zip(words, tokens):
        word.text = token


def parse_keywords(text: str) -> list[list[str]]:
    phrases = []
    for raw in re.split(r"[,;\n]+", text or ""):
        parts = [normalize(p) for p in raw.split()]
        parts = [p for p in parts if p]
        if parts:
            phrases.append(parts)
    return sorted(phrases, key=len, reverse=True)


def mark_highlights(words: list[Word], keyword_text: str) -> None:
    phrases = parse_keywords(keyword_text)
    norms = [normalize(w.text) for w in words]
    if not phrases:
        for word, norm in zip(words, norms):
            word.highlight = len(norm) > 3 and norm not in STOPWORDS
        return
    i = 0
    while i < len(words):
        matched = False
        for phrase in phrases:
            n = len(phrase)
            if norms[i : i + n] == phrase:
                for j in range(i, i + n):
                    words[j].highlight = True
                i += n
                matched = True
                break
        if not matched:
            i += 1


def should_break(prev: Word, current: Word, current_chunk: list[Word], max_words: int, max_chars: int) -> bool:
    if current.start - prev.end >= 0.24:
        return True
    if prev.text.endswith((".", "?", "!", ";", ":")):
        return True
    if len(current_chunk) >= max_words:
        return True
    chars = len(" ".join(w.text for w in [*current_chunk, current]))
    return chars > max_chars


def chunk_words(words: list[Word], max_words: int, max_chars: int) -> list[list[Word]]:
    chunks: list[list[Word]] = []
    current: list[Word] = []
    for word in words:
        if current and should_break(current[-1], word, current, max_words, max_chars):
            chunks.append(current)
            current = []
        current.append(word)
    if current:
        chunks.append(current)
    return chunks


def ass_time(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    cs = int(round((t - int(t)) * 100))
    if cs == 100:
        s += 1
        cs = 0
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def srt_time(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def font_for(size: int) -> ImageFont.FreeTypeFont:
    for path in [r"C:\Windows\Fonts\impact.ttf", r"C:\Windows\Fonts\arialbd.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def split_lines(tokens: list[Word], font: ImageFont.FreeTypeFont, max_width: int) -> list[list[Word]]:
    def width(items: Iterable[Word]) -> int:
        return font.getbbox(" ".join(w.text.upper() for w in items))[2]

    if width(tokens) <= max_width or len(tokens) <= 2:
        return [tokens]
    best = None
    for cut in range(1, len(tokens)):
        left, right = tokens[:cut], tokens[cut:]
        lw, rw = width(left), width(right)
        score = (max(0, lw - max_width) + max(0, rw - max_width)) * 10000 + abs(lw - rw)
        if best is None or score < best[0]:
            best = (score, [left, right])
    return best[1]


def render_tokens(tokens: list[Word], base_tag: str, highlight_tag: str, lead_tag: str, font, max_width: int) -> str:
    lines = []
    for line in split_lines(tokens, font, max_width):
        out = []
        state = None
        for i, word in enumerate(line):
            if i:
                out.append(" ")
            if word.highlight != state:
                out.append(highlight_tag if word.highlight else base_tag)
                state = word.highlight
            out.append(word.text.upper().replace("{", "(").replace("}", ")"))
        lines.append("".join(out))
    return lead_tag + r"\N".join(lines)


def build_subtitles(
    words: list[Word],
    meta: dict,
    out_dir: Path,
    stem: str,
    max_words: int,
    max_chars: int,
    gap: float,
) -> tuple[Path, Path, int, int]:
    width, height = meta["width"], meta["height"]
    font_size = max(38, round(height * 0.04))
    highlight_size = round(font_size * 1.04)
    outline = max(3, round(height * 0.0032))
    shadow = max(1, round(height * 0.0008))
    y = round(height * 0.739)
    max_width = round(width * 0.85)
    font = font_for(font_size)

    base = rf"{{\fnImpact\b1\fs{font_size}\fscx100\fscy100\fsp0\c&H00FFFFFF&\3c&H00000000&\bord{outline}\shad{shadow}\blur0.35}}"
    highlight = rf"{{\fnImpact\b1\fs{highlight_size}\fscx103\fscy103\fsp0\c&H0000D7FF&\3c&H00000000&\bord{outline}\shad{shadow}\blur0.3}}"
    lead = rf"{{\an2\pos({round(width / 2)},{y})\q2}}"

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Impact,{font_size},&H00FFFFFF,&H0000D7FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,{outline},{shadow},2,{round(width * 0.067)},{round(width * 0.067)},{round(height * 0.219)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    chunks = chunk_words(words, max_words=max_words, max_chars=max_chars)
    events = []
    srt = []
    event_times: list[tuple[float, float]] = []
    for idx, chunk in enumerate(chunks, 1):
        start = chunk[0].start
        end = chunk[-1].end
        if idx < len(chunks):
            next_start = chunks[idx][0].start
            end = min(end + 0.08, max(start + 0.18, next_start - gap))
        else:
            end += 0.08
        event_times.append((start, end))
        text = render_tokens(chunk, base, highlight, lead, font, max_width)
        events.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Caption,,0,0,0,,{text}")
        srt += [str(idx), f"{srt_time(start)} --> {srt_time(end)}", " ".join(w.text for w in chunk), ""]

    overlaps = sum(1 for i in range(len(event_times) - 1) if event_times[i][1] > event_times[i + 1][0])

    ass_path = out_dir / f"{stem}_tk_keyhighlight.ass"
    srt_path = out_dir / f"{stem}_tk_keyhighlight.srt"
    ass_path.write_text(header + "\n".join(events) + "\n", encoding="utf-8-sig")
    srt_path.write_text("\n".join(srt), encoding="utf-8")
    return ass_path, srt_path, len(events), overlaps


def burn_video(input_video: Path, ass_path: Path, output_video: Path) -> None:
    output_video.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_video),
            "-vf",
            f"ass={ass_path.name}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(output_video),
        ],
        cwd=str(ass_path.parent),
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", type=Path)
    parser.add_argument("--output-video", type=Path)
    parser.add_argument("--script-file", type=Path)
    parser.add_argument("--script-text")
    parser.add_argument("--keywords", default="")
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="en")
    parser.add_argument("--max-words", type=int, default=6)
    parser.add_argument("--max-chars", type=int, default=36)
    parser.add_argument("--gap", type=float, default=0.04)
    parser.add_argument("--no-burn", action="store_true")
    args = parser.parse_args()

    input_video = args.input.resolve()
    out_dir = (args.out_dir or input_video.parent / "subtitles").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = input_video.stem

    meta = ffprobe_video(input_video)
    words, transcript = transcribe_words(input_video, args.model, args.language)
    script = args.script_text
    if args.script_file:
        script = args.script_file.read_text(encoding="utf-8")
    if script:
        apply_script_text(words, script)
    mark_highlights(words, args.keywords)

    transcript_path = out_dir / f"{stem}_whisper_words.json"
    transcript_path.write_text(json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8")

    ass_path, srt_path, events, overlaps = build_subtitles(
        words, meta, out_dir, stem, max_words=args.max_words, max_chars=args.max_chars, gap=args.gap
    )
    output_video = args.output_video or input_video.with_name(f"{stem}_tiktok_keyhighlight.mp4")
    if not args.no_burn:
        burn_video(input_video, ass_path, output_video.resolve())

    print(f"Transcript: {transcript_path}")
    print(f"ASS: {ass_path}")
    print(f"SRT: {srt_path}")
    if not args.no_burn:
        print(f"Video: {output_video.resolve()}")
    print(f"Events: {events}")
    print(f"Overlaps: {overlaps}")


if __name__ == "__main__":
    main()
