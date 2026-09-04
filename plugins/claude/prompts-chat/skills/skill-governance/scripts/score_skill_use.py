#!/usr/bin/env python3
"""Create a standard skill-use score record."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


FIELDS = ("trigger", "rework", "context", "evidence", "noise")
VALID_VERIFICATION_LEVELS = ("none", "structural", "integrated", "real_delivery")
VALID_OUTCOMES = ("completed", "partial", "blocked")
VALID_FEEDBACK = ("pending", "positive", "negative", "mixed", "not_requested")
VALID_EXTERNAL_EFFECTS = ("none", "local_only", "external_read", "external_write")
VALID_ROUTE_ROLES = ("primary", "supporting", "explicit_only", "mandatory", "candidate")
FORBIDDEN_EVIDENCE_REF = re.compile(r"(?:https?://|task[_ -]?id|api[_ -]?key|token|password|cookie)", re.IGNORECASE)


def score_value(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("score must be 0, 1, or 2") from exc
    if parsed < 0 or parsed > 2:
        raise argparse.ArgumentTypeError("score must be 0, 1, or 2")
    return parsed


def recommendation(total: int) -> str:
    if total >= 9:
        return "keep/promote"
    if total >= 7:
        return "keep-monitor"
    if total >= 5:
        return "patch-or-restrict"
    return "demote-or-quarantine"


def build_record(args: argparse.Namespace) -> dict:
    scores = {field: getattr(args, field) for field in FIELDS}
    total = sum(scores.values())
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "project": args.project,
        "skill": args.skill,
        "task": args.task,
        "scores": scores,
        "total": total,
        "recommendation": args.recommendation or recommendation(total),
        "notes": args.notes,
        "route_role": args.route_role,
        "outcome": args.outcome,
        "verification_level": args.verification_level,
        "user_feedback": args.user_feedback,
        "external_effects": args.external_effects,
        "evidence_refs": args.evidence_ref,
    }


def as_markdown(record: dict) -> str:
    scores = record["scores"]
    lines = [
        "# Skill Use Score",
        "",
        f"- created_at: {record['created_at']}",
        f"- project: {record['project']}",
        f"- skill: {record['skill']}",
        f"- task: {record['task']}",
        f"- trigger_accuracy: {scores['trigger']}/2",
        f"- rework_reduction: {scores['rework']}/2",
        f"- context_efficiency: {scores['context']}/2",
        f"- evidence_quality: {scores['evidence']}/2",
        f"- noise_control: {scores['noise']}/2",
        f"- total: {record['total']}/10",
        f"- recommendation: {record['recommendation']}",
        f"- route_role: {record['route_role']}",
        f"- outcome: {record['outcome']}",
        f"- verification_level: {record['verification_level']}",
        f"- user_feedback: {record['user_feedback']}",
        f"- external_effects: {record['external_effects']}",
    ]
    if record["notes"]:
        lines.append(f"- notes: {record['notes']}")
    if record["evidence_refs"]:
        lines.append(f"- evidence_refs: {', '.join(record['evidence_refs'])}")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Project key or name.")
    parser.add_argument("--skill", required=True, help="Skill name.")
    parser.add_argument("--task", required=True, help="Task or scenario name.")
    for field in FIELDS:
        parser.add_argument(f"--{field}", type=score_value, default=1, help="Score 0-2.")
    parser.add_argument("--notes", default="", help="Short outcome note.")
    parser.add_argument("--recommendation", default="", help="Override recommendation.")
    parser.add_argument("--route-role", choices=VALID_ROUTE_ROLES, default="supporting")
    parser.add_argument("--outcome", choices=VALID_OUTCOMES, default="completed")
    parser.add_argument("--verification-level", choices=VALID_VERIFICATION_LEVELS, default="structural")
    parser.add_argument("--user-feedback", choices=VALID_FEEDBACK, default="pending")
    parser.add_argument("--external-effects", choices=VALID_EXTERNAL_EFFECTS, default="local_only")
    parser.add_argument("--evidence-ref", action="append", default=[], help="Durable local evidence reference; URLs, task ids, and secrets are rejected.")
    parser.add_argument("--ledger", default="", help="Append the JSON record to this local JSONL evidence ledger.")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for value in args.evidence_ref:
        if FORBIDDEN_EVIDENCE_REF.search(value):
            raise SystemExit("evidence references must be durable local references without URLs, task ids, or secrets")
    record = build_record(args)
    if args.ledger:
        ledger_path = Path(args.ledger).expanduser()
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        with ledger_path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
    if args.format == "json":
        print(json.dumps(record, ensure_ascii=False, indent=2))
    else:
        print(as_markdown(record))


if __name__ == "__main__":
    main()
