#!/usr/bin/env python3
"""Append one or more image-reference links to an exported MiniMax H3 Ref2VA workflow."""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path


REFERENCE_TYPE = "RHMiniMaxH3Ref2VAImageReference"


def by_id(nodes: list[dict], node_id: int) -> dict:
    for node in nodes:
        if node.get("id") == node_id:
            return node
    raise ValueError(f"Missing node {node_id}")


def input_named(node: dict, name: str) -> dict:
    for item in node.get("inputs", []):
        if item.get("name") == name:
            return item
    raise ValueError(f"Node {node.get('id')} has no {name!r} input")


def link_by_id(links: list[list], link_id: int) -> list:
    for link in links:
        if link and link[0] == link_id:
            return link
    raise ValueError(f"Missing link {link_id}")


def current_tail(nodes: list[dict]) -> dict:
    tails = [node for node in nodes if node.get("type") == REFERENCE_TYPE and input_named(node, "references").get("link") is None]
    if len(tails) != 1:
        raise ValueError(f"Expected exactly one unchained {REFERENCE_TYPE} tail, found {len(tails)}")
    return tails[0]


def append_once(workflow: dict) -> tuple[int, int]:
    nodes = workflow["nodes"]
    links = workflow["links"]
    tail_ref = current_tail(nodes)
    tail_image_link = input_named(tail_ref, "image").get("link")
    if tail_image_link is None:
        raise ValueError(f"Reference node {tail_ref['id']} has no image link")
    source_link = link_by_id(links, tail_image_link)
    tail_load = by_id(nodes, source_link[1])
    if tail_load.get("type") != "LoadImage":
        raise ValueError(f"Reference node {tail_ref['id']} is not fed by LoadImage")

    next_node_id = max(node["id"] for node in nodes) + 1
    next_link_id = max(link[0] for link in links) + 1
    new_load_id, new_ref_id = next_node_id, next_node_id + 1
    image_link_id, reference_link_id = next_link_id, next_link_id + 1

    new_load = copy.deepcopy(tail_load)
    new_load["id"] = new_load_id
    new_load["order"] = max(node.get("order", 0) for node in nodes) + 1
    new_load["pos"] = [tail_load["pos"][0], tail_load["pos"][1] + 340]
    new_load["outputs"][0]["links"] = [image_link_id]

    new_ref = copy.deepcopy(tail_ref)
    new_ref["id"] = new_ref_id
    new_ref["order"] = new_load["order"] + 1
    new_ref["pos"] = [tail_ref["pos"][0], tail_ref["pos"][1] + 340]
    input_named(new_ref, "image")["link"] = image_link_id
    input_named(new_ref, "references").pop("link", None)
    new_ref["outputs"][0]["links"] = [reference_link_id]

    input_named(tail_ref, "references")["link"] = reference_link_id
    nodes.extend([new_load, new_ref])
    links.extend(
        [
            [image_link_id, new_load_id, 0, new_ref_id, 0, "IMAGE"],
            [reference_link_id, new_ref_id, 0, tail_ref["id"], 1, "MINIMAX_H3_REFERENCES"],
        ]
    )
    workflow["last_node_id"] = new_ref_id
    workflow["last_link_id"] = reference_link_id
    return new_load_id, new_ref_id


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", help="Existing H3 multi-image visual workflow JSON")
    parser.add_argument("--out", required=True, help="New workflow JSON path; the input is never overwritten")
    parser.add_argument("--add-count", type=int, default=1, help="Number of image references to append")
    args = parser.parse_args()
    if args.add_count < 1:
        raise ValueError("--add-count must be positive")

    source = Path(args.workflow)
    raw = json.loads(source.read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict) or not isinstance(raw.get("nodes"), list) or not isinstance(raw.get("links"), list):
        raise ValueError("Expected a ComfyUI visual workflow export with nodes and links arrays")
    added = [append_once(raw) for _ in range(args.add_count)]
    note = ((raw.get("extra") or {}).get("workflow_note") or "").strip()
    raw.setdefault("extra", {})["workflow_note"] = (note + "\n" if note else "") + f"Custom copy: appended {args.add_count} H3 image-reference link(s); publish as a new API after import."
    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"source": str(source), "out": str(destination), "added": added, "total_image_references": 3 + args.add_count}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
