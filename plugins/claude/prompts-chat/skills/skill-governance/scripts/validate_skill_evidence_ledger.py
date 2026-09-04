#!/usr/bin/env python3
"""Validate the append-only local Skill evidence ledger."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


REQUIRED = {
    "created_at", "project", "skill", "task", "scores", "total", "recommendation", "notes",
    "route_role", "outcome", "verification_level", "user_feedback", "external_effects", "evidence_refs",
}
SCORE_FIELDS = {"trigger", "rework", "context", "evidence", "noise"}
FORBIDDEN = re.compile(r"(?:https?://|task[_ -]?id|api[_ -]?key|token|password|cookie)", re.IGNORECASE)
ENUMS = {
    "route_role": {"primary", "supporting", "explicit_only", "mandatory", "candidate"},
    "outcome": {"completed", "partial", "blocked"},
    "verification_level": {"none", "structural", "integrated", "real_delivery"},
    "user_feedback": {"pending", "positive", "negative", "mixed", "not_requested"},
    "external_effects": {"none", "local_only", "external_read", "external_write"},
}


def validate_record(record: object, line_number: int) -> list[str]:
    if not isinstance(record, dict):
        return [f"line {line_number}: record must be an object"]
    errors = [f"line {line_number}: missing {key}" for key in sorted(REQUIRED - record.keys())]
    if errors:
        return errors
    for key in ("created_at", "project", "skill", "task", "recommendation"):
        if not isinstance(record[key], str) or not record[key].strip():
            errors.append(f"line {line_number}: {key} must be a non-empty string")
    if not isinstance(record["notes"], str):
        errors.append(f"line {line_number}: notes must be a string")
    for key, allowed in ENUMS.items():
        if record[key] not in allowed:
            errors.append(f"line {line_number}: {key} must be one of {sorted(allowed)}")
    if set(record["scores"]) != SCORE_FIELDS:
        errors.append(f"line {line_number}: scores must contain exactly {sorted(SCORE_FIELDS)}")
    elif any(not isinstance(value, int) or value < 0 or value > 2 for value in record["scores"].values()):
        errors.append(f"line {line_number}: scores must be integers from 0 to 2")
    elif record["total"] != sum(record["scores"].values()):
        errors.append(f"line {line_number}: total does not match scores")
    if not isinstance(record["evidence_refs"], list) or any(not isinstance(value, str) or FORBIDDEN.search(value) for value in record["evidence_refs"]):
        errors.append(f"line {line_number}: evidence_refs must be local references without URLs, task ids, or secrets")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path)
    args = parser.parse_args()
    if not args.ledger.exists():
        raise SystemExit(f"ledger not found: {args.ledger}")
    errors: list[str] = []
    for number, line in enumerate(args.ledger.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {number}: invalid JSON ({exc.msg})")
            continue
        errors.extend(validate_record(record, number))
    if errors:
        raise SystemExit("\n".join(errors))
    print(json.dumps({"status": "ok", "ledger": str(args.ledger)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
