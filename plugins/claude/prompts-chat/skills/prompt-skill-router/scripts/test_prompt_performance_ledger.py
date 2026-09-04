#!/usr/bin/env python3
"""Offline tests for prompt performance-event validation and aggregation."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "scripts" / "validate_prompt_performance_event.py"
SUMMARY_PATH = ROOT / "scripts" / "summarize_prompt_performance.py"
SPEC = importlib.util.spec_from_file_location("performance_validator", VALIDATOR_PATH)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def binding(root: Path, name: str, content: str) -> dict[str, str]:
    path = root / name
    path.write_text(content, encoding="utf-8")
    return {"path": str(path.resolve()), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def event(root: Path) -> dict:
    return {
        "schema_version": "prompt_performance_event.v1",
        "event_id": "event-001",
        "recorded_at": "2026-07-11T20:00:00+08:00",
        "event_kind": "hypothesis",
        "route": {"production_class": "redraw", "task_type": "redraw_dialogue_handoff"},
        "prompt_contract": binding(root, "contract.json", "synthetic-contract"),
        "method_card_ids": ["hand_prop_handoff", "text_policy"],
        "method_profile_id": "seedance2_narrative",
        "execution_observation": {"channel": "", "model": "", "provider_task_id": None, "stage": "prepared"},
        "execution_evidence": None,
        "input_bundle": [],
        "observed_output_bundle": [],
        "evaluation_bundle": [],
        "evaluation": {"evidence_level": "synthetic", "qa_status": "not_run", "qa_evidence": None, "user_feedback": None, "failure_tags": ["hand_action_mismatch"], "adopted": False},
        "compounding": {"promotion_eligible": False, "candidate_note": "synthetic only"},
        "comparison": {"baseline_event_ids": [], "same_input_proof": None},
        "source_grade_summary": {"tutorial_sources_remain_grade_c": True}
    }


class PromptPerformanceLedgerTests(unittest.TestCase):
    def test_synthetic_event_is_valid_but_not_promotable(self) -> None:
        with TemporaryDirectory() as temporary:
            result = VALIDATOR.validate_event(event(Path(temporary)))
            self.assertTrue(result["ok"], result)

    def test_synthetic_event_cannot_be_promotion_candidate(self) -> None:
        with TemporaryDirectory() as temporary:
            item = event(Path(temporary))
            item["compounding"]["promotion_eligible"] = True
            result = VALIDATOR.validate_event(item)
            self.assertFalse(result["ok"])
            self.assertIn("promotion_without_real_evidence", {error["code"] for error in result["errors"]})

    def test_summary_groups_valid_events(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            item = event(root)
            item["event_kind"] = "executed_observation"
            item["execution_observation"]["stage"] = "qa_passed"
            item["execution_evidence"] = binding(root, "execution.json", "execution-evidence")
            item["observed_output_bundle"] = [binding(root, "output.json", "observed-output")]
            item["evaluation_bundle"] = [binding(root, "qa.json", "qa-evidence")]
            item["evaluation"]["evidence_level"] = "qa_evidence"
            item["evaluation"]["qa_status"] = "passed"
            item["evaluation"]["qa_evidence"] = item["evaluation_bundle"][0]
            ledger = root / "ledger.jsonl"
            ledger.write_text(json.dumps(item, ensure_ascii=False) + "\n", encoding="utf-8")
            executable = os.environ.get("PROMPT_ROUTER_TEST_PYTHON", sys.executable)
            completed = subprocess.run([executable, str(SUMMARY_PATH), "--ledger", str(ledger)], capture_output=True, text=True, check=False)
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
            summary = json.loads(completed.stdout)
            self.assertEqual(summary["method_cards"]["hand_prop_handoff"]["events"], 1)
            self.assertEqual(summary["failure_tags"]["hand_action_mismatch"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
