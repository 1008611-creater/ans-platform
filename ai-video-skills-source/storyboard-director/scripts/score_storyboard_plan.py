#!/usr/bin/env python3
"""Summarize storyboard evaluation scores for a storyboard plan."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple


SCORE_FIELDS = [
    "narrative_fidelity",
    "protagonist_priority",
    "blocking_clarity",
    "composition_logic",
    "camera_motivation",
    "rhythm_control",
    "action_timing_readability",
    "expression_readability",
    "object_state_control",
    "generation_controllability",
]


def average(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def shot_score(shot: Dict[str, object]) -> Tuple[float | None, List[str]]:
    evaluation = shot.get("evaluation", {})
    missing: List[str] = []
    values: List[float] = []
    for field in SCORE_FIELDS:
        value = evaluation.get(field)
        if not isinstance(value, (int, float)):
            missing.append(field)
            continue
        values.append(float(value))
    if missing:
        return None, missing
    return average(values), []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score a structured storyboard plan JSON.")
    parser.add_argument("--input", required=True, help="Path to storyboard plan JSON")
    parser.add_argument("--fail-below", type=float, default=4.0, help="Exit non-zero if project average falls below this score")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    plan = json.loads(Path(args.input).read_text(encoding="utf-8"))

    project_scores: List[float] = []
    exit_code = 0

    for scene in plan.get("scenes", []):
        print(f"{scene.get('scene_id', '<missing scene_id>')} | {scene.get('summary', '')}")
        scene_scores: List[float] = []
        for shot in scene.get("shots", []):
            score, missing = shot_score(shot)
            shot_id = shot.get("shot_id", "<missing shot_id>")
            if score is None:
                print(f"  - {shot_id}: missing evaluation fields: {', '.join(missing)}")
                exit_code = 1
                continue
            scene_scores.append(score)
            verdict = shot.get("evaluation", {}).get("verdict", "")
            print(f"  - {shot_id}: {score:.2f}/5 {verdict}".rstrip())
        if scene_scores:
            scene_avg = average(scene_scores)
            project_scores.extend(scene_scores)
            print(f"  Scene average: {scene_avg:.2f}/5")
        print("")

    if project_scores:
        project_avg = average(project_scores)
        print(f"Project average: {project_avg:.2f}/5")
        if project_avg < args.fail_below:
            print(f"FAIL: project average is below {args.fail_below:.2f}")
            exit_code = 1
    else:
        print("No scorable shots found")
        exit_code = 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
