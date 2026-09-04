#!/usr/bin/env python3
"""Build a first-pass story bible from normalized script JSON."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List


PROP_RE = re.compile(r"(suitcase|gun|phone|letter|ring|sword|car|train|bag|key|箱|枪|手机|信|戒指|剑|车|列车|包|钥匙)")
THEME_STOPWORDS = {
    "the", "and", "with", "that", "this", "from", "into", "then", "they", "have",
    "一个", "一些", "没有", "然后", "正在", "自己", "我们", "你们", "他们", "她们", "但是"
}


def load_input(path: Path) -> Dict[str, object]:
    data = json.loads(path.read_text())
    if "scenes" not in data:
        raise ValueError("Input JSON must contain 'scenes'")
    return data


def extract_theme_cues(text: str, limit: int = 8) -> List[str]:
    tokens = re.findall(r"[A-Za-z]{4,}|[\u4e00-\u9fff]{2,6}", text.lower())
    counter = Counter(token for token in tokens if token not in THEME_STOPWORDS)
    return [item for item, _ in counter.most_common(limit)]


def canonicalize_character(name: str, known_names: List[str]) -> str:
    normalized = name.strip()
    for candidate in sorted(known_names, key=len, reverse=True):
        if candidate == normalized:
            continue
        if candidate.endswith(f" {normalized}") or normalized.endswith(f" {candidate}"):
            return candidate if len(candidate) >= len(normalized) else normalized
    return normalized


def build_bible(data: Dict[str, object]) -> Dict[str, object]:
    title = data.get("title", "Untitled")
    scenes = data.get("scenes", [])
    characters = Counter()
    locations: Dict[str, List[str]] = defaultdict(list)
    props = Counter()
    time_of_day = Counter()
    all_text_parts: List[str] = []
    continuity_risks: List[str] = []
    known_names: List[str] = []

    for scene in scenes:
        scene_id = scene["scene_id"]
        location = scene.get("location") or scene.get("heading") or "unknown"
        locations[location].append(scene_id)
        if scene.get("time_of_day"):
            time_of_day[scene["time_of_day"]] += 1

        for raw_character in scene.get("present_characters", []):
            character = canonicalize_character(raw_character, known_names)
            if character not in known_names:
                known_names.append(character)
            characters[character] += 1

        content = scene.get("content", "")
        all_text_parts.append(content)
        for match in PROP_RE.findall(content):
            props[match] += 1

        if len(scene.get("present_characters", [])) >= 5:
            continuity_risks.append(f"{scene_id}: crowded scene may challenge character continuity")
        if len(scene.get("dialogue_blocks", [])) >= 8:
            continuity_risks.append(f"{scene_id}: dialogue-heavy scene may need shot restraint")

    if len(locations) >= 4:
        continuity_risks.append("Multiple recurring locations may require stronger environment anchors")
    if len(time_of_day) >= 2:
        continuity_risks.append("Time-of-day changes across scenes require explicit lighting continuity")
    if not continuity_risks:
        continuity_risks.append("No major structural continuity risk detected; still lock character and prop anchors")

    full_text = "\n".join(all_text_parts)
    theme_cues = extract_theme_cues(full_text)

    return {
        "title": title,
        "premise_excerpt": full_text[:240].strip(),
        "scene_count": len(scenes),
        "characters": [
            {"name": name, "mentions": count, "scene_ids": [scene["scene_id"] for scene in scenes if name in scene.get("present_characters", [])]}
            for name, count in characters.most_common()
        ],
        "locations": [
            {"name": name, "scene_ids": scene_ids}
            for name, scene_ids in locations.items()
        ],
        "props": [name for name, _ in props.most_common(10)],
        "time_of_day": [name for name, _ in time_of_day.most_common()],
        "theme_cues": theme_cues,
        "continuity_risks": continuity_risks
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a story bible from normalized script JSON.")
    parser.add_argument("--input", required=True, help="Input normalized JSON path")
    parser.add_argument("--output", help="Output story bible JSON path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    data = load_input(Path(args.input))
    result = json.dumps(build_bible(data), ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(result + "\n")
    else:
        print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
