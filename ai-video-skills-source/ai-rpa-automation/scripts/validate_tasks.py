#!/usr/bin/env python3
"""Validate JSONL/JSON/CSV automation tasks without opening a browser."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_tasks(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".jsonl":
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else [data]
    if path.suffix.lower() == ".csv":
        rows = list(csv.DictReader(path.open("r", encoding="utf-8-sig", newline="")))
        for row in rows:
            row["parameters"] = json.loads(row.get("parameters", "{}"))
            row["reference_images"] = [x for x in row.get("reference_images", "").split("|") if x]
            row["requires_confirmation"] = row.get("requires_confirmation", "true").lower() != "false"
        return rows
    raise ValueError(f"不支持的任务文件格式: {path.suffix}")


def validate(tasks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    seen: set[str] = set()
    normalized: list[dict[str, Any]] = []
    errors: list[str] = []
    for index, task in enumerate(tasks, start=1):
        task_id = str(task.get("task_id", "")).strip()
        if not task_id:
            errors.append(f"第{index}行缺少 task_id")
            continue
        if task_id in seen:
            errors.append(f"重复 task_id: {task_id}")
            continue
        seen.add(task_id)
        if not str(task.get("prompt_zh", "")).strip() and not str(task.get("prompt_en", "")).strip():
            errors.append(f"{task_id}: prompt_zh/prompt_en 至少填写一个")
        refs = task.get("reference_images", []) or []
        ref_meta = []
        for ref in refs:
            p = Path(ref)
            if not p.is_file():
                errors.append(f"{task_id}: 参考图不存在: {ref}")
                continue
            ref_meta.append({"path": str(p), "sha256": sha256_file(p)})
        normalized.append({**task, "task_id": task_id, "reference_images": ref_meta, "status": "validated"})
    return normalized, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    tasks = read_tasks(args.input_file)
    normalized, errors = validate(tasks)
    output = {"input": str(args.input_file), "total": len(tasks), "valid": len(normalized), "errors": errors, "tasks": normalized}
    out = args.out or args.input_file.with_name(args.input_file.stem + ".normalized.json")
    out.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(out), "total": len(tasks), "valid": len(normalized), "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
