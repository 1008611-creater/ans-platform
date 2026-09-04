#!/usr/bin/env python3
"""Rank Xianyu AI demand opportunities from a JSON file."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


FIELDS = ("heat", "pain", "asset_fit", "reuse", "price_power", "risk")


def score(item: dict) -> int:
    scores = item.get("scores", {})
    return (
        int(scores.get("heat", 0))
        + int(scores.get("pain", 0))
        + int(scores.get("asset_fit", 0))
        + int(scores.get("reuse", 0))
        + int(scores.get("price_power", 0))
        - int(scores.get("risk", 0))
    )


def priority(total: int) -> str:
    if total >= 18:
        return "publish_now"
    if total >= 15:
        return "test_listing"
    if total >= 12:
        return "bundle_or_content"
    return "archive"


def load_items(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    return data.get("opportunities", [])


def to_markdown(items: list[dict]) -> str:
    lines = [
        "| Rank | Score | Priority | Opportunity | First Title | Price |",
        "| --- | ---: | --- | --- | --- | --- |",
    ]
    for index, item in enumerate(items, 1):
        total = item["total_score"]
        price = item.get("price_ladder", "")
        if isinstance(price, list):
            price = " / ".join(str(x) for x in price)
        lines.append(
            "| {rank} | {score} | {priority} | {name} | {title} | {price} |".format(
                rank=index,
                score=total,
                priority=priority(total),
                name=str(item.get("name", "")).replace("|", "/"),
                title=str(item.get("first_title", "")).replace("|", "/"),
                price=str(price).replace("|", "/"),
            )
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown")
    args = parser.parse_args()

    items = load_items(args.input)
    for item in items:
        item["total_score"] = score(item)
        item["priority"] = priority(item["total_score"])
    items.sort(key=lambda item: item["total_score"], reverse=True)

    if args.format == "json":
        text = json.dumps({"opportunities": items}, ensure_ascii=False, indent=2)
    else:
        text = to_markdown(items)

    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
