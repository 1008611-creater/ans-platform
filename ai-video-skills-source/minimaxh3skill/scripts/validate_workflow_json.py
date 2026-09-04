#!/usr/bin/env python3
"""Validate a RunningHub H3 image-reference workflow before any upload or run."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def fail(code: str, message: str) -> dict:
    return {"ok": False, "errors": [{"code": code, "message": message}]}


def validate(path: Path, expected_slots: int, aspect_ratio: str, width: int, height: int, duration: int) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return fail("H3_WORKFLOW_JSON_INVALID", str(exc))
    if not isinstance(payload, dict):
        return fail("H3_WORKFLOW_JSON_INVALID", "workflow JSON must be an object")

    nodes = {str(k): v for k, v in payload.items() if isinstance(v, dict) and "class_type" in v}
    loads = [node for node in nodes.values() if node.get("class_type") == "LoadImage"]
    if len(loads) != expected_slots:
        return fail("H3_REFERENCE_SLOT_COUNT_MISMATCH", f"expected {expected_slots} LoadImage nodes, got {len(loads)}")

    values = [str((node.get("inputs") or {}).get("image", "")) for node in loads]
    unresolved = [value for value in values if not value or "__UPLOAD_SLOT_" in value or value.startswith("DRY_RUN_UPLOAD:")]
    if unresolved:
        return fail("H3_REFERENCE_UPLOAD_PLACEHOLDER_UNRESOLVED", "all LoadImage slots must contain upload receipt filenames")
    if len(set(values)) != len(values):
        return fail("H3_REFERENCE_SLOT_DUPLICATE", "LoadImage slots contain duplicate filenames")
    if any(re.search(r"eyewear|fashion|sample|example|46634d92|0619e598|732d2d7e", value, re.I) for value in values):
        return fail("H3_SAMPLE_ASSET_REMAINS", "template/sample asset filename remains in the workflow")

    targets = [node for node in nodes.values() if node.get("class_type") == "RHMiniMaxH3Ref2VATarget"]
    if len(targets) != 1:
        return fail("H3_TARGET_NODE_CONTRACT_INVALID", f"expected exactly one Target node, got {len(targets)}")
    target = targets[0].get("inputs") or {}
    expected = {"aspect_ratio": aspect_ratio, "width": width, "height": height, "duration_seconds": duration}
    mismatches = {key: {"expected": value, "actual": target.get(key)} for key, value in expected.items() if target.get(key) != value}
    if mismatches:
        return fail("H3_TARGET_NODE_CONTRACT_INVALID", json.dumps(mismatches, ensure_ascii=False))

    prompts = []
    for node in nodes.values():
        inputs = node.get("inputs") or {}
        prompt = inputs.get("prompt")
        if isinstance(prompt, str) and prompt.strip():
            prompts.append(prompt)
    if not prompts:
        return fail("H3_PROMPT_MISSING", "workflow has no non-empty prompt")
    prompt_text = "\n".join(prompts)
    if "16:9" in prompt_text or "832x480" in prompt_text or "832×480" in prompt_text:
        return fail("H3_PROMPT_TARGET_MISMATCH", "prompt still contains the horizontal target")
    if aspect_ratio not in prompt_text or str(width) not in prompt_text or str(height) not in prompt_text:
        return fail("H3_PROMPT_TARGET_MISSING", "prompt must state the same aspect ratio and dimensions as Target")

    return {
        "ok": True,
        "workflow": str(path),
        "load_image_count": len(loads),
        "distinct_load_images": len(set(values)),
        "target": expected,
        "prompt_count": len(prompts),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("workflow_json")
    parser.add_argument("--expected-slots", type=int, required=True)
    parser.add_argument("--aspect-ratio", default="9:16")
    parser.add_argument("--width", type=int, default=480)
    parser.add_argument("--height", type=int, default=832)
    parser.add_argument("--duration", type=int, default=5)
    args = parser.parse_args()
    result = validate(Path(args.workflow_json), args.expected_slots, args.aspect_ratio, args.width, args.height, args.duration)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 2


if __name__ == "__main__":
    sys.exit(main())
