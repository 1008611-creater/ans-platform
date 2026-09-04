#!/usr/bin/env python3
"""Normalize a screenplay-like text file into structured scene JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List


SCENE_HEADING_RE = re.compile(
    r"^(?:INT|EXT|INT/EXT|EXT/INT|INT\.?/EXT\.?|EXT\.?/INT\.?|内景|外景|内/外景|外/内景)\b",
    re.IGNORECASE,
)
SPEAKER_RE = re.compile(r"^([A-Z][A-Z0-9 '\-()]{1,40}|[\u4e00-\u9fff]{1,12})[:：]\s*(.+)$")
ACTION_CHARACTER_RE = re.compile(r"\b([A-Z][A-Z]+(?: [A-Z][A-Z]+){0,2})\b")
TIME_HINTS = ["DAY", "NIGHT", "MORNING", "EVENING", "NOON", "凌晨", "清晨", "白天", "夜", "夜晚", "黄昏"]


def parse_heading(line: str) -> Dict[str, str]:
    stripped = line.strip()
    prefix_removed = re.sub(
        r"^(?:INT|EXT|INT/EXT|EXT/INT|INT\.?/EXT\.?|EXT\.?/INT\.?|内景|外景|内/外景|外/内景)\.?\s*",
        "",
        stripped,
        flags=re.IGNORECASE,
    ).strip(" -.")
    parts = [part.strip(" -.") for part in re.split(r"\s*-\s*", prefix_removed) if part.strip()]
    location = parts[0] if parts else prefix_removed
    time_of_day = ""
    for hint in TIME_HINTS:
        if hint.lower() in line.lower():
            time_of_day = hint.lower()
            break
    return {"heading": line.strip(), "location": location, "time_of_day": time_of_day}


def flush_scene(scenes: List[Dict[str, object]], scene: Dict[str, object] | None) -> None:
    if not scene:
        return
    scene["content"] = "\n".join(scene["content"]).strip()
    scenes.append(scene)


def normalize(text: str, title: str) -> Dict[str, object]:
    lines = [line.rstrip() for line in text.splitlines()]
    scenes: List[Dict[str, object]] = []
    scene: Dict[str, object] | None = None

    def ensure_scene() -> Dict[str, object]:
        nonlocal scene
        if scene is None:
            scene = {
                "scene_id": f"S{len(scenes) + 1}",
                "heading": "UNSPECIFIED SCENE",
                "location": "",
                "time_of_day": "",
                "content": [],
                "action_blocks": [],
                "dialogue_blocks": [],
                "present_characters": []
            }
        return scene

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        if SCENE_HEADING_RE.match(line):
            flush_scene(scenes, scene)
            heading = parse_heading(line)
            scene = {
                "scene_id": f"S{len(scenes) + 1}",
                "heading": heading["heading"],
                "location": heading["location"],
                "time_of_day": heading["time_of_day"],
                "content": [],
                "action_blocks": [],
                "dialogue_blocks": [],
                "present_characters": []
            }
            continue

        scene_ref = ensure_scene()
        scene_ref["content"].append(line)
        speaker_match = SPEAKER_RE.match(line)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            dialogue = speaker_match.group(2).strip()
            scene_ref["dialogue_blocks"].append({"speaker": speaker, "text": dialogue})
            if speaker not in scene_ref["present_characters"]:
                scene_ref["present_characters"].append(speaker)
        else:
            scene_ref["action_blocks"].append(line)
            for match in ACTION_CHARACTER_RE.findall(line):
                candidate = match.strip()
                if candidate in {"INT", "EXT", "DAY", "NIGHT"}:
                    continue
                if candidate not in scene_ref["present_characters"]:
                    scene_ref["present_characters"].append(candidate)

    flush_scene(scenes, scene)

    return {
        "title": title,
        "scene_count": len(scenes),
        "scenes": scenes
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize screenplay-like text into scene JSON.")
    parser.add_argument("--input", required=True, help="Input script path")
    parser.add_argument("--output", help="Output JSON path")
    parser.add_argument("--title", help="Optional title override")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    text = input_path.read_text()
    title = args.title or input_path.stem.replace("_", " ").replace("-", " ").title()
    output = json.dumps(normalize(text, title), ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(output + "\n")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
