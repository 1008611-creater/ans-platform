#!/usr/bin/env python3
"""Offline tests for the method-card prompt linter."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
LINTER_PATH = ROOT / "scripts" / "lint_prompt_routing_contract.py"
BASE_TEST_PATH = ROOT / "scripts" / "test_validate_prompt_routing_contract.py"
LINTER_SPEC = importlib.util.spec_from_file_location("prompt_linter", LINTER_PATH)
BASE_SPEC = importlib.util.spec_from_file_location("prompt_contract_fixtures", BASE_TEST_PATH)
assert LINTER_SPEC and LINTER_SPEC.loader and BASE_SPEC and BASE_SPEC.loader
LINTER = importlib.util.module_from_spec(LINTER_SPEC)
BASE = importlib.util.module_from_spec(BASE_SPEC)
LINTER_SPEC.loader.exec_module(LINTER)
BASE_SPEC.loader.exec_module(BASE)


def write_prompt(contract: dict, root: Path, text: str) -> None:
    path = root / "locked-prompt.md"
    path.write_text(text, encoding="utf-8")
    contract["locked_prompt"]["path"] = str(path.resolve())
    contract["locked_prompt"]["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()


def redraw_contract(root: Path) -> dict:
    contract = BASE.base_contract(root)
    contract["scope"]["task_type"] = "redraw_dialogue_handoff"
    contract["method_card_ids"] = ["space_master", "camera_relationship", "hand_prop_handoff", "text_policy"]
    contract["known_failure_tags"] = ["hand_action_mismatch"]
    contract["compatibility"]["method_profile_id"] = "seedance2_narrative"
    write_prompt(contract, root, "【基础设定】\n机位为近景，景别锁定人物和文件。\n【动作与时间调度】女方把文件递给男方，男方用手接过。\n【文字策略】文件文字作为模糊纹理，字幕由后期添加。\n【负面约束】\n无乱码。")
    validation_evidence = []
    for card_id in contract["method_card_ids"]:
        path = root / f"{card_id}-validation.json"
        path.write_text("local-validation", encoding="utf-8")
        validation_evidence.append({"card_id": card_id, "validation_state": "locally_validated", "path": str(path.resolve()), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    contract["method_validation_evidence"] = validation_evidence
    return contract


class PromptLinterTests(unittest.TestCase):
    def lint(self, contract: dict, root: Path) -> dict:
        path = root / "contract.json"
        path.write_text(json.dumps(contract, ensure_ascii=False), encoding="utf-8")
        return LINTER.PromptLinter(path).lint(contract)

    def test_valid_redraw_handoff_passes(self) -> None:
        with TemporaryDirectory() as temporary:
            result = self.lint(redraw_contract(Path(temporary)), Path(temporary))
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["recovery_cards"][0]["id"], "hand_action_mismatch")

    def test_missing_method_card_fails(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = redraw_contract(root)
            contract["method_card_ids"].remove("text_policy")
            result = self.lint(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("method_cards_incomplete", {item["code"] for item in result["errors"]})

    def test_grade_c_card_without_local_evidence_fails(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = redraw_contract(root)
            contract["method_validation_evidence"] = []
            result = self.lint(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("grade_c_source_overreach", {item["code"] for item in result["errors"]})

    def test_first_person_requires_visible_anchor(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = redraw_contract(root)
            contract["scope"]["task_type"] = "first_person_interaction"
            contract["method_card_ids"] = ["camera_relationship", "hand_prop_handoff"]
            contract["method_validation_evidence"] = [item for item in contract["method_validation_evidence"] if item["card_id"] in contract["method_card_ids"]]
            result = self.lint(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("task_prompt_anchor_missing", {item["code"] for item in result["errors"]})

    def test_missing_declared_section_fails(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = redraw_contract(root)
            contract["locked_prompt"]["required_sections"].append("声音")
            result = self.lint(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("prompt_sections_missing", {item["code"] for item in result["errors"]})

    def test_long_text_without_policy_fails(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            contract = redraw_contract(root)
            write_prompt(contract, root, "【基础设定】机位近景，景别稳定。完整合同位于文件上。\n【动作与时间调度】女方递给男方。\n【负面约束】")
            result = self.lint(contract, root)
            self.assertFalse(result["ok"])
            self.assertIn("long_text_risk", {item["code"] for item in result["errors"]})


if __name__ == "__main__":
    unittest.main(verbosity=2)
