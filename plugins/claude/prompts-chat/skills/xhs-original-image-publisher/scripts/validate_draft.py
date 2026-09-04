#!/usr/bin/env python3
"""Validate a Xiaohongshu original-image draft without accessing accounts or secrets."""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_draft.py <draft-directory>")

    draft = Path(sys.argv[1]).expanduser().resolve()
    post = draft / "xhs-post.md"
    source = draft / "source"
    if not post.is_file():
        fail("missing xhs-post.md")
    if not source.is_dir():
        fail("missing source directory")

    text = post.read_text(encoding="utf-8")
    title_match = re.search(r"## 标题\s+`?([^`\n]+)`?", text)
    if not title_match:
        fail("missing title under '## 标题'")
    title = title_match.group(1).strip()
    if len(title) > 20:
        fail(f"title exceeds 20 characters: {len(title)}")

    listed = re.findall(r"`source/([^`]+)`", text)
    if not listed:
        fail("no source images listed in xhs-post.md")
    if not 1 <= len(listed) <= 18:
        fail(f"image count must be 1-18, got {len(listed)}")
    if len(set(listed)) != len(listed):
        fail("duplicate image path in declared image order")

    hashes: set[str] = set()
    for name in listed:
        image = source / name
        if not image.is_file():
            fail(f"missing declared image: {name}")
        value = sha256(image)
        if value in hashes:
            fail(f"duplicate image content: {name}")
        hashes.add(value)

    print(f"PASS: title={title!r}; images={len(listed)}; unique_sha256={len(hashes)}")


if __name__ == "__main__":
    main()
