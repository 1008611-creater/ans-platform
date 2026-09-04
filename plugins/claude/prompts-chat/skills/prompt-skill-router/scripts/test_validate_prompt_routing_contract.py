#!/usr/bin/env python3
"""Offline positive and negative tests for the prompt routing contract validator."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("validate_prompt_routing_contract.py")
SPEC = importlib.util.spec_from_file_location("prompt_contract_validator", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def write_file(root: Path, name: str, content: str) -> tuple[str, str]:
    path = root / name
    path.write_text(content, encoding="utf-8")
    return str(path.resolve()), hashlib.sha256(path.read_bytes()).hexdigest()


def base_contract(root: Path, status: str = "ready_for_video_task_spec") -> dict:
    route_path, route_sha = write_file(root, "route-contract.json", "route-contract")
    fact_one_path, fact_one_sha = write_file(root, "shot-facts.json", "shot-facts")
    fact_two_path, fact_two_sha = write_file(root, "reference-plan.json", "reference-plan")
    prompt_path, prompt_sha = write_file(root, "locked-prompt.md", "【基础设定】\n具体动作\n【负面约束】\n无乱码")
    reference_path, reference_sha = write_file(root, "first-frame.png", "synthetic-first-frame")
    capability_path, capability_sha = write_file(root, "capability.json", "capability-evidence")
    return {
        "schema_version": "prompt_routing_contract.v1",
        "contract_id": "synthetic-contract-001",
        "compile_status": status,
        "production_class": "redraw",
        "source_route": {
            "skill": "mx-shortdrama-00-router",
            "authority_contract": "step04_compiled_contract",
            "path": route_path,
            "sha256": route_sha,
        },
        "scope": {"series_id": "test", "episode_id": "EP001", "shot_id": "S001", "video_group_id": "VG001", "requested_output": "video_task_spec_handoff"},
        "authority_bundle": [
            {"artifact_role": "accepted_step02", "path": fact_one_path, "sha256": fact_one_sha, "authority_state": "accepted", "source_route": "mx-shortdrama-02-source-timeline"},
            {"artifact_role": "accepted_step04", "path": fact_two_path, "sha256": fact_two_sha, "authority_state": "accepted", "source_route": "mx-shortdrama-04-asset-prompts"},
        ],
        "layers": {
            "method": {"skill": "ai-video-fundamentals-skill", "responsibility": "compile accepted facts into prompt sections", "input_boundary": "accepted facts", "output_boundary": "locked prompt"},
            "execution": {"skill": "ai-video-channel-router", "responsibility": "author downstream task specification", "input_boundary": "locked contract", "output_boundary": "video task spec", "allowed_channels": ["artflash"]},
            "qa": {"skill": "prompt-skill-router", "responsibility": "validate prompt lineage and completeness", "input_boundary": "contract evidence", "output_boundary": "handoff decision"},
        },
        "references": [
            {"ref_key": "first_frame", "path": reference_path, "sha256": reference_sha, "chinese_duty": "本视频组的真实首帧与人物、构图锚点", "user_confirmation": "confirmed", "upload_eligible": True, "local_edit_applied": False, "artifact_class": "verified"}
        ],
        "locked_prompt": {"path": prompt_path, "sha256": prompt_sha, "format": "narrative_video_v1", "required_sections": ["基础设定", "动作与时间调度", "负面约束"], "source_binding_hashes": [fact_one_sha, fact_two_sha]},
        "compatibility": {"evidence_path": capability_path, "evidence_sha256": capability_sha, "selected_channel": "artflash", "allowed_channels": ["artflash"], "channel_state": "available", "model": "Seedance 2.0", "duration_seconds": 9, "aspect_ratio": "9:16", "resolution": "720p", "required_reference_count": 1, "audio_requirement": "none", "passed": True},
        "downstream": {"video_task_spec_required": True, "provider_submit_allowed": False},
        "blockers": [],
        "next_action": "由专业路线基于本合同编写 video_task_spec。",
    }


def configure_route_family(contract: dict, production_class: str) -> None:
    route_skills = {
        "redraw": "mx-shortdrama-00-router",
        "script_only": "mx-shortdrama-script-only-production",
        "commerce_reference": "realistic-commerce-video-replication",
        "original_narrative": "ai-film-champion-method",
        "confirmed_image_i2v": "sd2-video-generation",
    }
    authority_roles = {
        "redraw": ["accepted_step02", "accepted_step04"],
        "script_only": ["n03_designed_shot_facts", "n04_asset_plan"],
        "commerce_reference": ["confirmed_product_identity", "accepted_conversion_shot"],
        "original_narrative": ["approved_story_beat", "approved_continuity_plan"],
        "confirmed_image_i2v": ["confirmed_image", "image_to_video_scope"],
    }
    skill = route_skills[production_class]
    contract["production_class"] = production_class
    contract["source_route"]["skill"] = skill
    for index, artifact in enumerate(contract["authority_bundle"]):
        artifact["artifact_role"] = authority_roles[production_class][index]
        artifact["source_route"] = skill


class PromptRoutingContractTests(unittest.TestCase):
    def validate(self, contract: dict, root: Path) -> dict:
        path = root / "contract.json"
        path.write_text(json.dumps(contract, ensure_ascii=False, indent=2), encoding="utf-8")
        return MODULE.ContractValidator(path, check_files=True).validate(contract)

    def test_ready_video_contract_passes_and_cli_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            result = self.validate(contract, root)
            self.assertTrue(result["ok"], result)
            path = root / "contract.json"
            path.write_text(json.dumps(contract, ensure_ascii=False), encoding="utf-8")
            executable = os.environ.get("PROMPT_ROUTER_TEST_PYTHON", sys.executable)
            cli = subprocess.run([executable, str(SCRIPT_PATH), "--contract", str(path)], capture_output=True, text=True, check=False)
            self.assertEqual(cli.returncode, 0, cli.stdout + cli.stderr)

    def test_locked_asset_prompt_passes_without_video_compatibility(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root, "prompt_locked")
            contract["scope"]["requested_output"] = "first_frame"
            contract["references"] = []
            contract["compatibility"] = {}
            result = self.validate(contract, root)
            self.assertTrue(result["ok"], result)

    def test_each_production_class_accepts_its_own_authority_family(self) -> None:
        for production_class in ("redraw", "script_only", "commerce_reference", "original_narrative", "confirmed_image_i2v"):
            with self.subTest(production_class=production_class), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                contract = base_contract(root)
                configure_route_family(contract, production_class)
                result = self.validate(contract, root)
                self.assertTrue(result["ok"], result)

    def test_cross_route_authority_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            configure_route_family(contract, "script_only")
            contract["authority_bundle"][0]["source_route"] = "mx-shortdrama-02-source-timeline"
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("source_route_mismatch", {item["code"] for item in result["blockers"]})

    def test_unconfirmed_reference_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["references"][0]["user_confirmation"] = "pending"
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("reference_unconfirmed", {item["code"] for item in result["blockers"]})

    def test_ambiguous_latest_path_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["authority_bundle"][0]["path"] = str(root / "latest" / "facts.json")
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("ambiguous_artifact_lineage", {item["code"] for item in result["blockers"]})

    def test_sha_mismatch_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["locked_prompt"]["sha256"] = "0" * 64
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("sha256_mismatch", {item["code"] for item in result["blockers"]})

    def test_candidate_authority_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["authority_bundle"][0]["authority_state"] = "candidate"
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("missing_authoritative_source", {item["code"] for item in result["blockers"]})

    def test_unlocked_prompt_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["locked_prompt"]["required_sections"] = []
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("prompt_not_locked", {item["code"] for item in result["blockers"]})

    def test_disabled_channel_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["compatibility"]["selected_channel"] = "echoon"
            contract["compatibility"]["allowed_channels"] = ["echoon"]
            contract["compatibility"]["channel_state"] = "disabled"
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("channel_disabled", {item["code"] for item in result["blockers"]})

    def test_compiler_cannot_authorize_submission(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["downstream"]["provider_submit_allowed"] = True
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("compiler_cannot_authorize_submission", {item["code"] for item in result["blockers"]})

    def test_local_edit_reference_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = base_contract(root)
            contract["references"][0]["local_edit_applied"] = True
            result = self.validate(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("reference_local_edit_or_evidence_only", {item["code"] for item in result["blockers"]})


if __name__ == "__main__":
    unittest.main(verbosity=2)
