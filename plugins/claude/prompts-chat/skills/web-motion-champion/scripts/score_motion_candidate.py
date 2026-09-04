#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

HARD_GATES = (
    "purpose_defined",
    "official_or_authorized_source",
    "license_recorded",
    "stack_compatible",
    "mobile_fallback",
    "reduced_motion_fallback",
    "cta_unobstructed",
    "cleanup_defined",
    "usable_without_motion",
)

WEIGHTS = {
    "goal_fit": 25,
    "brand_integration": 20,
    "interaction_accessibility": 15,
    "performance_fallback": 15,
    "maintainability": 10,
    "responsive_quality": 10,
    "source_license": 5,
}


def load(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser(description="Score a website motion candidate.")
    parser.add_argument("candidate", type=Path)
    args = parser.parse_args()
    data = load(args.candidate)
    gates = data.get("hard_gates", {})
    missing = [name for name in HARD_GATES if gates.get(name) is not True]

    scores = data.get("scores", {})
    invalid = [name for name in WEIGHTS if not isinstance(scores.get(name), (int, float)) or not 0 <= scores[name] <= 5]
    if invalid:
        print(json.dumps({"status": "invalid", "invalid_scores": invalid}, ensure_ascii=False, indent=2))
        return 2

    total = round(sum((scores[name] / 5) * weight for name, weight in WEIGHTS.items()), 1)
    if missing:
        status = "reject"
    elif total >= 80:
        status = "accept"
    elif total >= 65:
        status = "revise"
    else:
        status = "reject"

    print(json.dumps({
        "status": status,
        "score": total,
        "failed_hard_gates": missing,
        "source": data.get("source"),
        "effect_name": data.get("effect_name"),
    }, ensure_ascii=False, indent=2))
    return 0 if status == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
