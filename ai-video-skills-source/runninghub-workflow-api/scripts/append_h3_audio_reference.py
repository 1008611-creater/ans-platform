#!/usr/bin/env python3
"""Append an audio-reference stage to an exported MiniMax H3 Ref2VA image-reference workflow.

The input workflow is never changed.  The result keeps the existing image-reference
chain, inserts ``LoadAudio -> AudioReference`` after that chain, and routes the
combined references to both the H3 Target and H3 Encode nodes.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path


IMAGE_REFERENCE_TYPE = "RHMiniMaxH3Ref2VAImageReference"
AUDIO_REFERENCE_TYPE = "RHMiniMaxH3Ref2VAAudioReference"
TARGET_TYPE = "RHMiniMaxH3Ref2VATarget"
ENCODE_TYPE = "RHMiniMaxH3Ref2VAEncode"


def input_named(node: dict, name: str) -> dict:
    for item in node.get("inputs", []):
        if item.get("name") == name:
            return item
    raise ValueError(f"Node {node.get('id')} has no {name!r} input")


def output_at(node: dict, slot: int) -> dict:
    outputs = node.get("outputs", [])
    if slot >= len(outputs):
        raise ValueError(f"Node {node.get('id')} has no output slot {slot}")
    return outputs[slot]


def find_node(nodes: list[dict], node_type: str) -> dict:
    matches = [node for node in nodes if node.get("type") == node_type]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one {node_type}, found {len(matches)}")
    return matches[0]


def find_link(links: list[list], link_id: int) -> list:
    for link in links:
        if link and link[0] == link_id:
            return link
    raise ValueError(f"Missing link {link_id}")


def source_for_input(links: list[list], node: dict, input_name: str) -> tuple[int, int]:
    item = input_named(node, input_name)
    link_id = item.get("link")
    if link_id is None:
        raise ValueError(f"Node {node.get('id')} input {input_name!r} is not connected")
    link = find_link(links, link_id)
    return link[1], link[2]


def replace_output_links(node: dict, old_ids: set[int], new_ids: list[int]) -> None:
    for output in node.get("outputs", []):
        links = output.get("links")
        if isinstance(links, list) and old_ids.issubset(set(links)):
            output["links"] = [link for link in links if link not in old_ids] + new_ids
            return
    raise ValueError(f"Source node {node.get('id')} does not expose every expected outgoing reference link")


def locate_audio_template(template: dict) -> tuple[dict, dict]:
    nodes = template.get("nodes", [])
    links = template.get("links", [])
    audio_ref = find_node(nodes, AUDIO_REFERENCE_TYPE)
    audio_load_id, _ = source_for_input(links, audio_ref, "audio")
    audio_load = next((node for node in nodes if node.get("id") == audio_load_id), None)
    if not audio_load or audio_load.get("type") != "LoadAudio":
        raise ValueError("AudioReference in the template must be fed by LoadAudio")
    return audio_load, audio_ref


def validate_graph(workflow: dict, expected_audio_load: int, expected_audio_ref: int) -> None:
    nodes = workflow["nodes"]
    links = workflow["links"]
    node_ids = [node.get("id") for node in nodes]
    link_ids = [link[0] for link in links]
    if len(node_ids) != len(set(node_ids)) or len(link_ids) != len(set(link_ids)):
        raise ValueError("Workflow contains duplicate node or link IDs")
    link_map = {link[0]: link for link in links}
    node_map = {node["id"]: node for node in nodes}
    for link in links:
        if len(link) < 5 or link[1] not in node_map or link[3] not in node_map:
            raise ValueError(f"Invalid link {link}")
        output_at(node_map[link[1]], link[2])
    for node in nodes:
        for item in node.get("inputs", []):
            link_id = item.get("link")
            if link_id is not None:
                link = link_map.get(link_id)
                if not link or link[3] != node["id"]:
                    raise ValueError(f"Input link mismatch on node {node['id']}")
        for output in node.get("outputs", []):
            for link_id in output.get("links") or []:
                link = link_map.get(link_id)
                if not link or link[1] != node["id"]:
                    raise ValueError(f"Output link mismatch on node {node['id']}")
    audio_load = node_map[expected_audio_load]
    audio_ref = node_map[expected_audio_ref]
    if audio_load.get("type") != "LoadAudio" or audio_ref.get("type") != AUDIO_REFERENCE_TYPE:
        raise ValueError("Generated audio stage has an unexpected node type")
    audio_source, _ = source_for_input(links, audio_ref, "audio")
    if audio_source != expected_audio_load:
        raise ValueError("Generated AudioReference is not fed by generated LoadAudio")
    target = find_node(nodes, TARGET_TYPE)
    encode = find_node(nodes, ENCODE_TYPE)
    target_source, _ = source_for_input(links, target, "references")
    encode_source, _ = source_for_input(links, encode, "references")
    if target_source != expected_audio_ref or encode_source != expected_audio_ref:
        raise ValueError("Generated AudioReference does not feed both Target and Encode")


def append_audio_reference(workflow: dict, template: dict) -> tuple[int, int]:
    nodes = workflow["nodes"]
    links = workflow["links"]
    node_map = {node["id"]: node for node in nodes}
    target = find_node(nodes, TARGET_TYPE)
    encode = find_node(nodes, ENCODE_TYPE)
    target_input = input_named(target, "references")
    encode_input = input_named(encode, "references")
    old_target_link = target_input.get("link")
    old_encode_link = encode_input.get("link")
    if old_target_link is None or old_encode_link is None:
        raise ValueError("Both Target and Encode must already receive image references")
    target_source_id, target_source_slot = source_for_input(links, target, "references")
    encode_source_id, encode_source_slot = source_for_input(links, encode, "references")
    if target_source_id != encode_source_id or target_source_slot != encode_source_slot:
        raise ValueError("Target and Encode must share the same terminal image-reference output")
    source_ref = node_map.get(target_source_id)
    if not source_ref or source_ref.get("type") != IMAGE_REFERENCE_TYPE:
        raise ValueError("The terminal reference source must be an H3 ImageReference node")

    template_load, template_ref = locate_audio_template(template)
    next_node_id = max(node["id"] for node in nodes) + 1
    next_link_id = max(link[0] for link in links) + 1
    audio_load_id, audio_ref_id = next_node_id, next_node_id + 1
    audio_link, reference_link, target_link, encode_link = range(next_link_id, next_link_id + 4)

    audio_load = copy.deepcopy(template_load)
    audio_load["id"] = audio_load_id
    audio_load["order"] = max(node.get("order", 0) for node in nodes) + 1
    source_pos = source_ref.get("pos") or [600, 0]
    audio_load["pos"] = [source_pos[0] + 20, source_pos[1] + 360]
    audio_load["widgets_values"] = ["", None, None]
    output_at(audio_load, 0)["links"] = [audio_link]

    audio_ref = copy.deepcopy(template_ref)
    audio_ref["id"] = audio_ref_id
    audio_ref["order"] = audio_load["order"] + 1
    audio_ref["pos"] = [source_pos[0] + 430, source_pos[1] + 360]
    input_named(audio_ref, "audio")["link"] = audio_link
    input_named(audio_ref, "references")["link"] = reference_link
    output_at(audio_ref, 0)["links"] = [target_link, encode_link]

    replace_output_links(source_ref, {old_target_link, old_encode_link}, [reference_link])
    target_input["link"] = target_link
    encode_input["link"] = encode_link
    links[:] = [link for link in links if link[0] not in {old_target_link, old_encode_link}]
    links.extend(
        [
            [audio_link, audio_load_id, 0, audio_ref_id, 0, "AUDIO"],
            [reference_link, source_ref["id"], target_source_slot, audio_ref_id, 1, "MINIMAX_H3_REFERENCES"],
            [target_link, audio_ref_id, 0, target["id"], target.get("inputs", []).index(target_input), "MINIMAX_H3_REFERENCES"],
            [encode_link, audio_ref_id, 0, encode["id"], encode.get("inputs", []).index(encode_input), "MINIMAX_H3_REFERENCES"],
        ]
    )
    nodes.extend([audio_load, audio_ref])
    workflow["last_node_id"] = audio_ref_id
    workflow["last_link_id"] = encode_link
    validate_graph(workflow, audio_load_id, audio_ref_id)
    return audio_load_id, audio_ref_id


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", help="Existing H3 multi-image visual workflow JSON")
    parser.add_argument("--audio-template", required=True, help="H3 image-plus-audio visual workflow JSON used to copy the compatible audio nodes")
    parser.add_argument("--out", required=True, help="New workflow JSON path; the input is never overwritten")
    args = parser.parse_args()

    source = Path(args.workflow)
    raw = json.loads(source.read_text(encoding="utf-8-sig"))
    template = json.loads(Path(args.audio_template).read_text(encoding="utf-8-sig"))
    if not isinstance(raw, dict) or not isinstance(raw.get("nodes"), list) or not isinstance(raw.get("links"), list):
        raise ValueError("Expected a ComfyUI visual workflow export with nodes and links arrays")
    added = append_audio_reference(raw, template)
    note = ((raw.get("extra") or {}).get("workflow_note") or "").strip()
    raw.setdefault("extra", {})["workflow_note"] = (note + "\n" if note else "") + "Custom copy: appended an H3 audio-reference stage after the image-reference chain; publish as a new API after import."
    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"source": str(source), "out": str(destination), "added": {"audio_load": added[0], "audio_reference": added[1]}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
