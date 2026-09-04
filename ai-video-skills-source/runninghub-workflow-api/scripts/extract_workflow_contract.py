#!/usr/bin/env python3
"""Extract editable node fields from a RunningHub/ComfyUI visual workflow export."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def editable_fields(workflow: dict) -> list[dict]:
    fields: list[dict] = []
    for node in workflow.get("nodes", []):
        if not isinstance(node, dict) or node.get("id") is None:
            continue
        for item in node.get("inputs", []):
            if not isinstance(item, dict):
                continue
            widget = item.get("widget")
            if not isinstance(widget, dict):
                continue
            field_name = widget.get("name") or item.get("name")
            if not field_name:
                continue
            fields.append(
                {
                    "nodeId": str(node["id"]),
                    "nodeType": node.get("type"),
                    "fieldName": str(field_name),
                    "fieldType": item.get("type"),
                    "linked": item.get("link") is not None,
                    "evidence": "workflow_export",
                }
            )
    return sorted(fields, key=lambda value: (int(value["nodeId"]) if value["nodeId"].isdigit() else value["nodeId"], value["fieldName"]))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", help="ComfyUI visual workflow JSON export")
    parser.add_argument("--out", help="Write the extracted JSON contract to this file")
    args = parser.parse_args()

    path = Path(args.workflow)
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict) or not isinstance(raw.get("nodes"), list):
        raise ValueError("Expected a ComfyUI visual workflow JSON object with a nodes array")
    contract = {
        "source": path.name,
        "contract_status": "workflow_export_only",
        "inputs": editable_fields(raw),
        "next_step": "Confirm the published RunningHub API page exposes the required fields before registering them as verified.",
    }
    output = json.dumps(contract, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(output + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
