#!/usr/bin/env python3
"""Lint a valid prompt-routing contract against task methods and failure-recovery rules."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_contract_validator() -> Any:
    path = ROOT / "scripts" / "validate_prompt_routing_contract.py"
    spec = importlib.util.spec_from_file_location("prompt_contract_validator", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PromptLinter:
    def __init__(self, contract_path: Path) -> None:
        self.contract_path = contract_path
        self.cards = {card["id"]: card for card in load_json(ROOT / "assets" / "prompt_method_cards.v1.json")["cards"]}
        self.task_types = {item["id"]: item for item in load_json(ROOT / "assets" / "ai_video_task_method_map.v1.json")["task_types"]}
        self.profiles = {item["id"]: item for item in load_json(ROOT / "assets" / "model_channel_method_profiles.v1.json")["profiles"]}
        self.failures = {item["id"]: item for item in load_json(ROOT / "assets" / "prompt_failure_recovery.v1.json")["failures"]}
        self.errors: list[dict[str, str]] = []
        self.warnings: list[dict[str, str]] = []

    def issue(self, severity: str, code: str, field: str, detail_zh: str) -> None:
        target = self.errors if severity == "error" else self.warnings
        target.append({"code": code, "field": field, "detail_zh": detail_zh})

    def lint(self, contract: dict[str, Any]) -> dict[str, Any]:
        validator = load_contract_validator().ContractValidator(self.contract_path, check_files=True)
        validation = validator.validate(contract)
        if not validation["ok"]:
            self.errors.extend(validation["blockers"])
            return self.result(contract)

        scope = contract.get("scope", {})
        task_type_id = scope.get("task_type")
        task_type = self.task_types.get(task_type_id)
        if not task_type:
            self.issue("error", "task_type_unmapped", "scope.task_type", "任务类型必须来自 ai_video_task_method_map.v1，不能省略或猜测。")
            return self.result(contract)
        if contract.get("production_class") not in task_type["production_classes"]:
            self.issue("error", "task_type_route_mismatch", "scope.task_type", "任务类型与当前生产路线不兼容。")

        card_ids = contract.get("method_card_ids")
        if not isinstance(card_ids, list) or not card_ids:
            self.issue("error", "method_cards_missing", "method_card_ids", "必须选择任务对应的原子方法卡。")
            card_ids = []
        unknown_cards = [card_id for card_id in card_ids if card_id not in self.cards]
        if unknown_cards:
            self.issue("error", "method_card_unknown", "method_card_ids", f"存在未知方法卡：{', '.join(unknown_cards)}。")
        missing_cards = [card_id for card_id in task_type["required_method_cards"] if card_id not in card_ids]
        if missing_cards:
            self.issue("error", "method_cards_incomplete", "method_card_ids", f"当前任务缺少方法卡：{', '.join(missing_cards)}。")
        self.validate_method_evidence(contract, card_ids)

        roles = " ".join(str(item.get("artifact_role", "")).lower() for item in contract.get("authority_bundle", []))
        missing_roles = [token for token in task_type["required_authority_role_tokens"] if token not in roles]
        if missing_roles:
            self.issue("error", "task_authority_incomplete", "authority_bundle", f"当前任务缺少事实角色：{', '.join(missing_roles)}。")

        prompt_text = self.read_prompt(contract)
        required_sections = contract.get("locked_prompt", {}).get("required_sections", [])
        missing_sections = [section for section in required_sections if section not in prompt_text]
        if missing_sections:
            self.issue("error", "prompt_sections_missing", "locked_prompt.required_sections", f"Prompt 正文缺少合同声明的段落：{', '.join(missing_sections)}。")

        for group in task_type["required_prompt_terms"]:
            if not any(term in prompt_text for term in group):
                self.issue("error", "task_prompt_anchor_missing", "locked_prompt", f"当前任务缺少可观察锚点，至少需要其一：{', '.join(group)}。")

        if any(token in prompt_text for token in ("电影感", "高级", "真实")) and not any(token in prompt_text for token in ("机位", "景别", "焦段", "光源", "侧光", "窗光", "材质")):
            self.issue("warning", "abstract_style_without_evidence", "locked_prompt", "出现抽象质感词，但缺少机位、光线或材质等可见证据。")
        if any(token in prompt_text for token in ("完整合同", "聊天记录", "价格表", "密集 UI")) and not any(token in prompt_text for token in ("文字策略", "后期", "留白", "模糊")):
            self.issue("error", "long_text_risk", "locked_prompt", "长可读文字必须转为文字策略、留白、模糊纹理或后期职责。")

        compatibility = contract.get("compatibility", {})
        profile_id = compatibility.get("method_profile_id")
        if profile_id not in self.profiles:
            self.issue("error", "method_profile_unknown", "compatibility.method_profile_id", "必须选择模型/渠道方法边界档案，不能用渠道印象替代当前能力合同。")
        else:
            profile = self.profiles[profile_id]
            if profile.get("policy_state") != "method_only_research_candidate":
                self.issue("error", "method_profile_policy_invalid", "compatibility.method_profile_id", "方法 profile 只能描述方法边界，不能成为渠道能力或提交授权。")
            for source in profile.get("source_evidence", []):
                path_value, sha_value = source.get("path"), source.get("sha256")
                if not isinstance(path_value, str) or not Path(path_value).is_absolute() or not isinstance(sha_value, str) or len(sha_value) != 64:
                    self.issue("error", "method_profile_evidence_invalid", "compatibility.method_profile_id", "方法 profile 缺少精确来源证据。")

        failure_tags = contract.get("known_failure_tags", [])
        if not isinstance(failure_tags, list):
            self.issue("error", "failure_tags_invalid", "known_failure_tags", "已知失败标签必须是数组。")
            failure_tags = []
        for tag in failure_tags:
            if tag not in self.failures:
                self.issue("warning", "failure_tag_unknown", "known_failure_tags", f"失败标签未在修复库登记：{tag}。")
        return self.result(contract)

    def validate_method_evidence(self, contract: dict[str, Any], card_ids: list[str]) -> None:
        defaults = load_json(ROOT / "assets" / "prompt_method_cards.v1.json").get("card_defaults", {})
        if defaults.get("source_refs", [{}])[0].get("source_grade") != "C":
            return
        evidence_items = contract.get("method_validation_evidence", [])
        evidence_by_card = {item.get("card_id"): item for item in evidence_items if isinstance(item, dict)}
        for card_id in card_ids:
            evidence = evidence_by_card.get(card_id)
            if not isinstance(evidence, dict) or evidence.get("validation_state") != "locally_validated":
                self.issue("error", "grade_c_source_overreach", "method_validation_evidence", f"方法卡 {card_id} 来自 C 级教程，进入 ready 合同前必须绑定独立本地验证证据。")
                continue
            path_value, sha_value = evidence.get("path"), evidence.get("sha256")
            if not isinstance(path_value, str) or not Path(path_value).is_absolute() or not isinstance(sha_value, str) or len(sha_value) != 64:
                self.issue("error", "grade_c_validation_evidence_invalid", "method_validation_evidence", f"方法卡 {card_id} 的本地验证证据缺少精确绝对路径或 SHA256。")
                continue
            path = Path(path_value)
            if not path.is_file() or self.sha256(path) != sha_value.lower():
                self.issue("error", "grade_c_validation_evidence_invalid", "method_validation_evidence", f"方法卡 {card_id} 的本地验证证据不存在或 SHA256 不匹配。")

    @staticmethod
    def sha256(path: Path) -> str:
        import hashlib
        digest = hashlib.sha256()
        digest.update(path.read_bytes())
        return digest.hexdigest()

    def read_prompt(self, contract: dict[str, Any]) -> str:
        path = Path(contract["locked_prompt"]["path"])
        try:
            return path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return path.read_text(encoding="utf-8", errors="replace")

    def result(self, contract: dict[str, Any]) -> dict[str, Any]:
        recovery_cards = []
        for tag in contract.get("known_failure_tags", []) if isinstance(contract, dict) else []:
            failure = self.failures.get(tag)
            if failure:
                recovery_cards.append({"id": failure["id"], "name_zh": failure["name_zh"], "earliest_gate": failure["earliest_gate"], "required_recovery": failure["required_recovery"]})
        return {
            "schema_version": "prompt_lint_report.v1",
            "status": "PASS" if not self.errors else "FAIL",
            "ok": not self.errors,
            "contract": str(self.contract_path),
            "checked_paths": [str(self.contract_path)],
            "errors": self.errors,
            "warnings": self.warnings,
            "issues": self.errors + self.warnings,
            "recovery_cards": recovery_cards,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint a prompt-routing contract without generation or provider access.")
    parser.add_argument("--contract", required=True)
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures.")
    args = parser.parse_args()
    path = Path(args.contract)
    if not path.is_file():
        print(json.dumps({"schema_version": "prompt_lint_report.v1", "status": "FAIL", "ok": False, "checked_paths": [str(path)], "errors": [{"code": "contract_not_found", "field": "contract", "detail_zh": "合同文件不存在。"}]}, ensure_ascii=False, indent=2))
        return 1
    try:
        result = PromptLinter(path).lint(load_json(path))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"schema_version": "prompt_lint_report.v1", "status": "FAIL", "ok": False, "checked_paths": [str(path)], "errors": [{"code": "contract_unreadable", "field": "contract", "detail_zh": str(exc)}]}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] and (not args.strict or not result["warnings"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
