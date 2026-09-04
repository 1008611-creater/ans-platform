import json
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

REQUIRED_FILES = ("canon.json", "events.jsonl", "goals.md", "truth-bible.md", "outline.md")
REQUIRED_CANON = ("project", "project_progress", "facts", "characters", "relationships", "knowledge", "objects", "evidence", "timeline", "money", "open_issues")


def project_path(argv=None):
    args = argv if argv is not None else sys.argv[1:]
    return Path(args[0] if args else ".").resolve()


def load_project(root):
    try:
        canon = json.loads((root / "canon.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"canon.json: {exc}"]
    return canon, []


def chapters(root):
    folder = root / "chapters"
    return sorted(folder.glob("*.md")) if folder.is_dir() else []


def output(name, errors, warnings):
    print(json.dumps({"check": name, "errors": errors, "warnings": warnings}, ensure_ascii=False))
    return 1 if errors else 0


def run(name, root):
    canon, errors = load_project(root)
    warnings = []
    if canon is None:
        return output(name, errors, warnings)

    if name == "structure":
        for filename in REQUIRED_FILES:
            if not (root / filename).is_file():
                errors.append(f"missing required file: {filename}")
        for key in REQUIRED_CANON:
            if key not in canon:
                errors.append(f"missing canon field: {key}")
    elif name == "time":
        values = [str(item.get("at", "")) for item in canon.get("timeline", []) if isinstance(item, dict)]
        if any(not value for value in values):
            errors.append("timeline item missing at")
        if values != sorted(values):
            errors.append("timeline is not monotonic")
    elif name == "money":
        money = canon.get("money", {})
        try:
            opening = Decimal(str(money.get("opening_balance", 0)))
            inflows = sum((Decimal(str(item.get("amount", 0))) for item in money.get("inflows", [])), Decimal("0"))
            outflows = sum((Decimal(str(item.get("amount", 0))) for item in money.get("outflows", [])), Decimal("0"))
            closing = Decimal(str(money.get("closing_balance", 0)))
            if opening + inflows - outflows != closing:
                errors.append("money balance does not close")
        except (InvalidOperation, AttributeError):
            errors.append("money entries require numeric amount")
    elif name == "state":
        known = set(canon.get("characters", {}).keys())
        for object_id, item in canon.get("objects", {}).items():
            if not isinstance(item, dict):
                errors.append(f"object {object_id} is not an object")
                continue
            if not item.get("state"):
                errors.append(f"object {object_id} missing state")
            holder = item.get("holder")
            if holder and holder not in known:
                errors.append(f"object {object_id} holder is unknown: {holder}")
    elif name == "references":
        known = set(canon.get("characters", {}).keys())
        for relation in canon.get("relationships", []):
            if not isinstance(relation, dict) or relation.get("from") not in known or relation.get("to") not in known:
                errors.append("relationship has unknown endpoint")
        for character in canon.get("knowledge", {}):
            if character not in known:
                errors.append(f"knowledge owner is unknown: {character}")
        for evidence_id, item in canon.get("evidence", {}).items():
            if not isinstance(item, dict) or not item.get("source"):
                errors.append(f"evidence {evidence_id} missing source")
    elif name == "ids":
        seen = set()
        for group in ("timeline", "relationships"):
            for item in canon.get(group, []):
                item_id = item.get("id") if isinstance(item, dict) else None
                if item_id and item_id in seen:
                    errors.append(f"duplicate id: {item_id}")
                if item_id:
                    seen.add(item_id)
        for group in ("characters", "objects", "evidence"):
            for item_id in canon.get(group, {}):
                if item_id in seen:
                    errors.append(f"duplicate id: {item_id}")
                seen.add(item_id)
    elif name == "style":
        for chapter in chapters(root):
            text = chapter.read_text(encoding="utf-8")
            for phrase in ("他愣住了", "她愣住了", "命运的齿轮"):
                if text.count(phrase) >= 3:
                    warnings.append(f"{chapter.name}: repeated phrase {phrase}")
    elif name == "framework":
        project = canon.get("project", {})
        for field in ("title", "logline"):
            if not str(project.get(field, "")).strip() or str(project.get(field, "")).startswith("<"):
                errors.append(f"project.{field} is required")
        for issue in canon.get("open_issues", []):
            if isinstance(issue, dict) and issue.get("severity") in ("P0", "P1") and issue.get("status") != "resolved":
                errors.append(f"unresolved {issue.get('severity')} issue")
    elif name == "workflow":
        files = chapters(root)
        if not files:
            warnings.append("no chapter file to inspect")
        else:
            text = files[-1].read_text(encoding="utf-8")
            for marker in ("PLAN", "VALIDATE", "WRITE", "CRITIQUE", "COMMIT"):
                if f"STEP: {marker}" not in text:
                    errors.append(f"latest chapter missing STEP: {marker}")
    else:
        errors.append(f"unknown check: {name}")
    return output(name, errors, warnings)
