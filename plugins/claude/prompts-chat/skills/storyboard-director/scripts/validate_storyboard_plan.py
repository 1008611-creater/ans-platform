#!/usr/bin/env python3
"""Basic validation for structured storyboard plans before prompt rendering."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


REQUIRED_SHOT_FIELDS = [
    "narrative_purpose",
    "audience_focus",
    "subject",
    "action",
    "setting",
    "mood",
    "shot_size",
    "angle",
    "lens",
    "lighting",
    "camera_movement"
]

REQUIRED_EVAL_FIELDS = [
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

TIMING_REQUIRED_FIELDS = [
    "primary_action_chain",
    "available_seconds",
    "estimated_required_seconds",
    "timing_pressure",
    "readability_verdict",
    "adjustment",
]


def beat_span_seconds(beats: List[Dict[str, object]]) -> float:
    if not beats:
        return 0.0
    start = min(float(beat["start"]) for beat in beats)
    end = max(float(beat["end"]) for beat in beats)
    return end - start


def validate_shot(scene_id: str, shot: Dict[str, object]) -> List[str]:
    warnings: List[str] = []
    shot_id = shot.get("shot_id", "<missing shot_id>")

    for field in REQUIRED_SHOT_FIELDS:
        if not shot.get(field):
            warnings.append(f"{scene_id}/{shot_id}: missing field '{field}'")

    if not shot.get("style_rationale"):
        warnings.append(f"{scene_id}/{shot_id}: missing style_rationale")

    expression = shot.get("expression_plan")
    if not expression:
        warnings.append(f"{scene_id}/{shot_id}: missing expression_plan")
    else:
        for field in ("pre_action_expression", "during_action_expression", "expression_shift"):
            if not expression.get(field):
                warnings.append(f"{scene_id}/{shot_id}: expression_plan missing '{field}'")

    object_state = shot.get("object_state_control")
    if object_state:
        if not object_state.get("object"):
            warnings.append(f"{scene_id}/{shot_id}: object_state_control missing 'object'")
        if not object_state.get("required_state"):
            warnings.append(f"{scene_id}/{shot_id}: object_state_control missing 'required_state'")
        if not object_state.get("visible_markers"):
            warnings.append(f"{scene_id}/{shot_id}: object_state_control missing 'visible_markers'")
        if not object_state.get("forbidden_markers"):
            warnings.append(f"{scene_id}/{shot_id}: object_state_control missing 'forbidden_markers'")

    decision = shot.get("director_decision")
    if not decision:
        warnings.append(f"{scene_id}/{shot_id}: missing director_decision")
    else:
        for field in ("blocking_plan", "composition_goal", "focus_shift", "movement_motivation", "tempo"):
            if not decision.get(field):
                warnings.append(f"{scene_id}/{shot_id}: director_decision missing '{field}'")

    if not shot.get("continuity_anchors"):
        warnings.append(f"{scene_id}/{shot_id}: no continuity_anchors provided")

    if not shot.get("sound_design"):
        warnings.append(f"{scene_id}/{shot_id}: missing sound_design")
    else:
        sound = shot["sound_design"]
        if not any(sound.get(field) for field in ("ambience", "foley", "character_vocalization", "magic_or_stylized_sfx", "music", "brand_mnemonic")):
            warnings.append(f"{scene_id}/{shot_id}: sound_design exists but contains no meaningful cues")

    beats = shot.get("timecoded_beats", [])
    for beat in beats:
        if beat["end"] <= beat["start"]:
            warnings.append(f"{scene_id}/{shot_id}: invalid beat range {beat['start']}->{beat['end']}")

    if len(str(shot.get("subject", ""))) > 120:
        warnings.append(f"{scene_id}/{shot_id}: subject field is verbose; consider tightening")

    if len(str(shot.get("action", ""))) > 160:
        warnings.append(f"{scene_id}/{shot_id}: action field is verbose; consider tightening")

    display_labels = shot.get("display_labels", [])
    if display_labels and len(display_labels) > 2:
        warnings.append(f"{scene_id}/{shot_id}: display_labels should contain at most 2 items")

    if len(beats) > 4:
        warnings.append(f"{scene_id}/{shot_id}: too many timecoded beats for one shot; consider splitting the shot")

    critique = shot.get("critique_pass")
    if not critique:
        warnings.append(f"{scene_id}/{shot_id}: missing critique_pass")
    else:
        for field in ("primary_risk", "correction", "verified_choice"):
            if not critique.get(field):
                warnings.append(f"{scene_id}/{shot_id}: critique_pass missing '{field}'")

    timing = shot.get("action_timing_validation")
    if not timing:
        warnings.append(f"{scene_id}/{shot_id}: missing action_timing_validation")
    else:
        for field in TIMING_REQUIRED_FIELDS:
            if timing.get(field) in (None, ""):
                warnings.append(f"{scene_id}/{shot_id}: action_timing_validation missing '{field}'")

        numeric_fields = (
            "setup_seconds",
            "execution_seconds",
            "result_seconds",
            "reaction_seconds",
            "available_seconds",
            "estimated_required_seconds",
        )
        for field in numeric_fields:
            value = timing.get(field)
            if value is None:
                continue
            if not isinstance(value, (int, float)) or float(value) < 0:
                warnings.append(f"{scene_id}/{shot_id}: action_timing_validation '{field}' must be a non-negative number")

        available = timing.get("available_seconds")
        required = timing.get("estimated_required_seconds")
        if isinstance(available, (int, float)) and isinstance(required, (int, float)):
            if float(required) > float(available) + 0.35:
                warnings.append(
                    f"{scene_id}/{shot_id}: estimated action time {float(required):.2f}s exceeds available time {float(available):.2f}s"
                )

        part_sum = 0.0
        has_any_parts = False
        for field in ("setup_seconds", "execution_seconds", "result_seconds", "reaction_seconds"):
            value = timing.get(field)
            if isinstance(value, (int, float)):
                part_sum += float(value)
                has_any_parts = True
        if has_any_parts and isinstance(required, (int, float)) and abs(part_sum - float(required)) > 0.6:
            warnings.append(
                f"{scene_id}/{shot_id}: action_timing_validation parts sum to {part_sum:.2f}s but estimated_required_seconds is {float(required):.2f}s"
            )

        beat_span = beat_span_seconds(beats)
        if beat_span and isinstance(available, (int, float)) and abs(float(available) - beat_span) > 0.5:
            warnings.append(
                f"{scene_id}/{shot_id}: available_seconds {float(available):.2f}s does not match beat span {beat_span:.2f}s"
            )

        reaction_seconds = timing.get("reaction_seconds")
        result_seconds = timing.get("result_seconds")
        if isinstance(reaction_seconds, (int, float)) and float(reaction_seconds) > 0.0:
            if not isinstance(result_seconds, (int, float)) or float(result_seconds) < 0.3:
                warnings.append(
                    f"{scene_id}/{shot_id}: reaction is present but result_seconds is too small to make the cause readable"
                )

        if timing.get("secondary_action_chain"):
            setup_seconds = timing.get("setup_seconds")
            if not isinstance(setup_seconds, (int, float)) or float(setup_seconds) < 0.5:
                warnings.append(
                    f"{scene_id}/{shot_id}: secondary_action_chain exists but setup_seconds is very small; handoff may read as a jump"
                )

        if len(beats) >= 3 and isinstance(available, (int, float)) and float(available) < 4.0:
            warnings.append(
                f"{scene_id}/{shot_id}: {len(beats)} beats inside {float(available):.2f}s may be too compressed for readable action"
            )

        if shot.get("camera_movement") not in {"locked_off", "slow_push_in"}:
            if isinstance(available, (int, float)) and isinstance(required, (int, float)) and float(required) > float(available) - 0.2:
                warnings.append(
                    f"{scene_id}/{shot_id}: active camera movement plus tight action timing budget may reduce readability"
                )

    evaluation = shot.get("evaluation")
    if not evaluation:
        warnings.append(f"{scene_id}/{shot_id}: missing evaluation")
    else:
        score_values = []
        for field in REQUIRED_EVAL_FIELDS:
            value = evaluation.get(field)
            if value is None:
                warnings.append(f"{scene_id}/{shot_id}: evaluation missing '{field}'")
                continue
            if not isinstance(value, (int, float)) or value < 0 or value > 5:
                warnings.append(f"{scene_id}/{shot_id}: evaluation '{field}' must be a number between 0 and 5")
                continue
            score_values.append(float(value))
        if score_values:
            computed = sum(score_values) / len(score_values)
            overall = evaluation.get("overall_score")
            if overall is None:
                warnings.append(f"{scene_id}/{shot_id}: evaluation missing 'overall_score'")
            elif abs(float(overall) - computed) > 0.25:
                warnings.append(
                    f"{scene_id}/{shot_id}: overall_score {overall} is not aligned with category mean {computed:.2f}"
                )
            critical_fields = ("narrative_fidelity", "protagonist_priority", "camera_motivation", "generation_controllability")
            for field in critical_fields:
                value = evaluation.get(field)
                if isinstance(value, (int, float)) and float(value) < 4.0:
                    warnings.append(f"{scene_id}/{shot_id}: critical evaluation '{field}' is below 4.0 and should be revised")

    return warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate structured shot plan JSON.")
    parser.add_argument("--input", required=True, help="Path to shot plan JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    plan = json.loads(Path(args.input).read_text(encoding="utf-8"))
    warnings: List[str] = []

    project = plan.get("project", {})
    if project.get("style_mode") not in {
        "script_inferred_style",
        "user_locked_style",
        "hybrid_style"
    }:
        warnings.append("project: style_mode must be one of script_inferred_style, user_locked_style, hybrid_style")

    if project.get("prompt_language") not in {"zh", "en"}:
        warnings.append("project: prompt_language must be 'zh' or 'en'")

    output_mode = project.get("output_mode")
    if output_mode and output_mode not in {"storyboard_script", "prompt_only", "review"}:
        warnings.append("project: output_mode must be one of storyboard_script, prompt_only, review")

    for scene in plan.get("scenes", []):
        if not scene.get("scene_objective"):
            warnings.append(f"{scene.get('scene_id', '<missing scene_id>')}: missing scene_objective")
        if not scene.get("audience_must_understand"):
            warnings.append(f"{scene.get('scene_id', '<missing scene_id>')}: missing audience_must_understand")
        for shot in scene.get("shots", []):
            warnings.extend(validate_shot(scene.get("scene_id", "<missing scene_id>"), shot))

    if warnings:
        print("WARNINGS")
        for item in warnings:
            print(f"- {item}")
        return 1

    print("OK: shot plan passed basic validation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
