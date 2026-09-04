#!/usr/bin/env python3
"""Summarize validated JSONL prompt performance events without making promotion decisions."""

from __future__ import annotations

import argparse
import importlib.util
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("validate_prompt_performance_event.py")
SPEC = importlib.util.spec_from_file_location("performance_event_validator", SCRIPT)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize an append-only prompt performance JSONL ledger.")
    parser.add_argument("--ledger", required=True)
    args = parser.parse_args()
    path = Path(args.ledger)
    invalid: list[dict[str, Any]] = []
    cards: dict[str, Counter] = defaultdict(Counter)
    failures: Counter = Counter()
    promotion_candidates: list[str] = []
    excluded_events: list[dict[str, Any]] = []
    total = 0
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        total += 1
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            invalid.append({"line": line_number, "errors": [{"code": "event_unreadable", "detail_zh": str(exc)}]})
            continue
        result = VALIDATOR.validate_event(event)
        if not result["ok"]:
            invalid.append({"line": line_number, "errors": result["errors"]})
            continue
        if event.get("event_kind") not in {"executed_observation", "comparison"}:
            excluded_events.append({"line": line_number, "event_id": event.get("event_id"), "reason": "not_executed_observation_or_comparison"})
            continue
        qa_status = event.get("evaluation", {}).get("qa_status", "not_run")
        for card_id in event["method_card_ids"]:
            cards[card_id]["events"] += 1
            cards[card_id][f"qa_{qa_status}"] += 1
        failures.update(event.get("evaluation", {}).get("failure_tags", []))
        if event.get("compounding", {}).get("promotion_eligible") is True:
            promotion_candidates.append(event["event_id"])
    result = {
        "schema_version": "prompt_performance_summary.v1",
        "status": "PASS" if not invalid else "FAIL",
        "ok": not invalid,
        "checked_paths": [str(path)],
        "total_events": total,
        "invalid_events": invalid,
        "excluded_events": excluded_events,
        "method_cards": {key: dict(value) for key, value in sorted(cards.items())},
        "failure_tags": dict(failures.most_common()),
        "promotion_candidates": promotion_candidates,
        "policy": "Summary identifies evidence-backed candidates only. It does not promote any Skill or release."
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
