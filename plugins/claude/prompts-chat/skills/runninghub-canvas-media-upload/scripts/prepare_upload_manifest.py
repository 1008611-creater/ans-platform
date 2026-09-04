#!/usr/bin/env python3
"""Validate a RunningHub canvas node-to-media mapping without uploading files."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
AUDIO_SUFFIXES = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}


def detect_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in IMAGE_SUFFIXES:
        return "image"
    if suffix in VIDEO_SUFFIXES:
        return "video"
    if suffix in AUDIO_SUFFIXES:
        return "audio"
    return "unknown"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare a verified local manifest for RunningHub canvas uploads."
    )
    parser.add_argument("--workflow-id", required=True)
    parser.add_argument("--mapping-file", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    raw = json.loads(args.mapping_file.read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise SystemExit("mapping file must be a non-empty JSON array")

    node_ids: set[str] = set()
    media: list[dict[str, object]] = []
    errors: list[str] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            errors.append(f"entry {index} is not an object")
            continue
        node_id = str(item.get("node_id", "")).strip()
        role = str(item.get("role", "")).strip()
        raw_path = str(item.get("path", "")).strip()
        if not node_id or not role or not raw_path:
            errors.append(f"entry {index} needs node_id, role, and path")
            continue
        if node_id in node_ids:
            errors.append(f"duplicate node_id: {node_id}")
            continue
        node_ids.add(node_id)
        path = Path(raw_path)
        if not path.is_file():
            errors.append(f"missing file for node {node_id}: {path}")
            continue
        detected_kind = detect_kind(path)
        expected_kind = str(item.get("expected_kind", detected_kind)).strip()
        if expected_kind not in {"image", "video", "audio"}:
            errors.append(f"invalid expected_kind for node {node_id}: {expected_kind}")
            continue
        if detected_kind != expected_kind:
            errors.append(
                f"kind mismatch for node {node_id}: expected {expected_kind}, got {detected_kind}"
            )
            continue
        media.append(
            {
                "node_id": node_id,
                "role": role,
                "expected_kind": expected_kind,
                "local_path": str(path.resolve()),
                "file_name": path.name,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "canvas_status": "prepared_unbound",
            }
        )

    if errors:
        raise SystemExit("\n".join(errors))

    output = {
        "workflow_id": str(args.workflow_id),
        "media_count": len(media),
        "media": media,
        "next_action": "Bind each prepared entry to its exact visible canvas node and record its displayed filename.",
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
