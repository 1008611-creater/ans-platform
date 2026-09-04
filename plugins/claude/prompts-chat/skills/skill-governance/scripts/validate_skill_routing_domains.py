#!/usr/bin/env python3
"""Validate the 12-domain Skill routing contract against the generated registry."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


SCRIPT_PATH = Path(__file__).resolve()
REFERENCES = SCRIPT_PATH.parent.parent / "references"
DEFAULT_CONTRACT = REFERENCES / "skill-routing-domains.json"
DEFAULT_REGISTRY = REFERENCES / "skill-registry.json"
ALLOWED_ENTRY_MODES = {"router", "source_direct", "artifact_direct", "platform_direct", "intent_direct"}
ALLOWED_OVERLAP_PRESSURE = {"low", "medium", "high"}
ALLOWED_ROLES = {
    "entry",
    "default",
    "supporting",
    "explicit_execution",
    "explicit_only",
    "candidate",
    "specialist_primary",
    "prerequisite",
    "inactive",
    "unassessed",
}
ROUTE_FIELDS = (
    "entry_routes",
    "default_routes",
    "supporting_routes",
    "explicit_execution_routes",
    "candidate_routes",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> int:
    args = parse_args()
    contract = read_json(args.contract)
    registry = read_json(args.registry)
    domains = contract.get("domains", [])
    planes = contract.get("control_planes", [])
    skills = registry.get("skills", [])

    require(contract.get("schema_version") == 2, "Routing contract schema_version must be 2")
    require(registry.get("schema_version") == 4, "Registry schema_version must be 4")
    require(len(domains) == 12, f"Expected 12 routing domains, found {len(domains)}")
    require(len(planes) == 8, f"Expected 8 control planes, found {len(planes)}")
    envelope = contract.get("capability_envelope", {})
    require(registry.get("capability_envelope") == envelope, "Registry capability envelope is stale")
    input_fields = [str(item.get("field", "")) for item in envelope.get("input_packet", [])]
    output_fields = [str(item.get("field", "")) for item in envelope.get("output_packet", [])]
    require(
        input_fields == ["project_authority", "objective", "target_artifact", "current_state", "constraints", "authorizations"],
        "Capability input packet fields are incomplete or out of order",
    )
    require(
        output_fields == ["artifact", "decision", "state_change", "evidence", "remaining_gate", "provenance"],
        "Capability output packet fields are incomplete or out of order",
    )
    require(len(envelope.get("routing_decision", [])) >= 5, "Capability routing decision contract is incomplete")
    require(len(envelope.get("invariants", [])) >= 5, "Capability envelope invariants are incomplete")

    domain_ids = [str(item.get("id", "")) for item in domains]
    plane_ids = [str(item.get("id", "")) for item in planes]
    require(all(domain_ids) and len(domain_ids) == len(set(domain_ids)), "Routing domain ids must be non-empty and unique")
    require(all(plane_ids) and len(plane_ids) == len(set(plane_ids)), "Control plane ids must be non-empty and unique")
    require(sorted(int(item.get("order", 0)) for item in domains) == list(range(1, 13)), "Routing domain order must be 1..12")
    require(sorted(int(item.get("order", 0)) for item in planes) == list(range(1, 9)), "Control plane order must be 1..8")

    family_to_domain: dict[str, str] = {}
    for domain in domains:
        domain_id = str(domain["id"])
        require(domain.get("entry_mode") in ALLOWED_ENTRY_MODES, f"Invalid entry_mode for {domain_id}")
        require(domain.get("overlap_pressure") in ALLOWED_OVERLAP_PRESSURE, f"Invalid overlap_pressure for {domain_id}")
        require(bool(str(domain.get("selection_rule", "")).strip()), f"Domain has no selection_rule: {domain_id}")
        require(isinstance(domain.get("known_conflicts"), list), f"Domain known_conflicts must be a list: {domain_id}")
        capability = domain.get("capability_contract", {})
        require(bool(capability.get("input")), f"Domain capability input is empty: {domain_id}")
        require(bool(str(capability.get("transform", "")).strip()), f"Domain capability transform is empty: {domain_id}")
        require(bool(capability.get("output")), f"Domain capability output is empty: {domain_id}")
        require(bool(str(capability.get("completion_gate", "")).strip()), f"Domain completion gate is empty: {domain_id}")
        require(bool(capability.get("non_output")), f"Domain non-output boundary is empty: {domain_id}")
        require(bool(domain.get("entry_routes")), f"Domain has no deliberate entry route: {domain_id}")
        require(bool(domain.get("default_routes")), f"Domain has no deliberate default route: {domain_id}")
        for family in domain.get("families", []):
            require(family not in family_to_domain, f"Family maps to multiple domains: {family}")
            family_to_domain[str(family)] = domain_id

    skill_by_name = {str(item.get("name", "")): item for item in skills}
    require(len(skill_by_name) == len(skills), "Registry Skill names must be unique")
    chinese_names = [str(item.get("display_name_zh", "")) for item in skills]
    require(len(chinese_names) == len(set(chinese_names)), "Chinese Skill display names must be unique")
    registry_families = {str(item.get("family") or "") for item in skills}
    require("" not in registry_families, "Registry contains a Skill without a family")
    missing_families = sorted(registry_families - set(family_to_domain))
    stale_families = sorted(set(family_to_domain) - registry_families)
    require(not missing_families, f"Registry families missing from domain contract: {missing_families}")
    require(not stale_families, f"Domain contract contains stale families: {stale_families}")

    for skill in skills:
        name = str(skill["name"])
        expected_domain = family_to_domain[str(skill["family"])]
        require(skill.get("routing_domain") == expected_domain, f"Wrong routing_domain for {name}")
        require(skill.get("domain_role") in ALLOWED_ROLES, f"Invalid domain_role for {name}: {skill.get('domain_role')}")
        require(bool(str(skill.get("display_name_zh", "")).strip()), f"Missing Chinese display name for {name}")
        require(bool(str(skill.get("description_zh", "")).strip()), f"Missing Chinese description for {name}")
        require(bool(skill.get("aliases_zh")), f"Missing Chinese aliases for {name}")
        require(
            skill.get("chinese_trigger_mode") in {"governed", "display_only"},
            f"Invalid Chinese trigger mode for {name}",
        )
        if skill.get("routing_status") in {"explicit_only", "candidate", "unassessed", "archived", "unavailable_legacy"}:
            require(skill.get("chinese_trigger_mode") == "display_only", f"Unsafe Chinese auto-trigger mode for {name}")

    for domain in domains:
        domain_id = str(domain["id"])
        for field in ROUTE_FIELDS:
            values = domain.get(field, [])
            require(isinstance(values, list), f"{domain_id}.{field} must be a list")
            require(len(values) == len(set(values)), f"{domain_id}.{field} contains duplicate route names")
            for name in values:
                require(name in skill_by_name, f"Unknown Skill in {domain_id}.{field}: {name}")
                require(
                    skill_by_name[name].get("routing_domain") == domain_id,
                    f"Cross-domain route reference in {domain_id}.{field}: {name}",
                )

    role_counts = Counter(str(item["domain_role"]) for item in skills)
    domain_counts = Counter(str(item["routing_domain"]) for item in skills)
    require(sum(domain_counts.values()) == len(skills), "Not every Skill was counted in a routing domain")
    require(registry.get("summary", {}).get("unmapped_domain_skills") == 0, "Registry reports unmapped domain Skills")

    print(
        json.dumps(
            {
                "status": "ok",
                "skill_count": len(skills),
                "domain_count": len(domains),
                "control_plane_count": len(planes),
                "capability_contract_count": len(domains),
                "family_count": len(registry_families),
                "localized_skill_count": sum(bool(item.get("display_name_zh")) for item in skills),
                "domain_counts": dict(sorted(domain_counts.items())),
                "role_counts": dict(sorted(role_counts.items())),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
