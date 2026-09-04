#!/usr/bin/env python3
"""Validate append-only prompt performance events without changing production state."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
VALID_LEVELS = {"synthetic", "qa_evidence", "user_feedback"}
VALID_STAGES = {"prepared", "provider_submitted", "downloaded", "qa_passed", "qa_failed", "user_feedback_recorded"}
VALID_KINDS = {"hypothesis", "executed_observation", "comparison", "invalidated"}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def validate_event(event: Any, check_files: bool = True) -> dict[str, Any]:
    errors: list[dict[str, str]] = []

    def error(code: str, field: str, detail_zh: str) -> None:
        errors.append({"code": code, "field": field, "detail_zh": detail_zh})

    def binding(value: Any, field: str) -> None:
        if not isinstance(value, dict):
            error("event_binding_missing", field, "事件缺少精确路径和 SHA256 绑定。")
            return
        path_value, sha_value = value.get("path"), value.get("sha256")
        if not isinstance(path_value, str) or not Path(path_value).is_absolute() or any(token in path_value.lower() for token in ("latest", "current", "newest")):
            error("event_binding_ambiguous", f"{field}.path", "事件路径必须为非歧义绝对路径。")
            return
        if not isinstance(sha_value, str) or not SHA256_RE.fullmatch(sha_value):
            error("event_binding_missing", f"{field}.sha256", "事件必须记录有效 SHA256。")
            return
        if check_files:
            path = Path(path_value)
            if not path.is_file() or file_sha256(path).lower() != sha_value.lower():
                error("event_binding_mismatch", field, "事件路径不存在或 SHA256 不匹配。")

    if not isinstance(event, dict):
        error("invalid_event", "root", "表现事件必须是 JSON 对象。")
        return {"schema_version": "prompt_performance_event_report.v1", "status": "FAIL", "ok": False, "checked_paths": [], "errors": errors, "issues": errors}
    if event.get("schema_version") != "prompt_performance_event.v1":
        error("invalid_event", "schema_version", "必须使用 prompt_performance_event.v1。")
    for key in ("event_id", "recorded_at"):
        if not isinstance(event.get(key), str) or not event[key].strip() or "__" in event[key]:
            error("invalid_event", key, "事件必须包含稳定标识和记录时间。")
    event_kind = event.get("event_kind")
    if event_kind not in VALID_KINDS:
        error("invalid_event", "event_kind", "事件类型必须是 hypothesis、executed_observation、comparison 或 invalidated。")
    binding(event.get("prompt_contract"), "prompt_contract")
    if not isinstance(event.get("method_card_ids"), list) or not event["method_card_ids"]:
        error("invalid_event", "method_card_ids", "表现事件必须记录实际使用的方法卡。")
    execution = event.get("execution_observation", {})
    if execution.get("stage") not in VALID_STAGES:
        error("invalid_event", "execution_observation.stage", "执行观察必须使用受支持的阶段。")
    evaluation = event.get("evaluation", {})
    level = evaluation.get("evidence_level")
    if level not in VALID_LEVELS:
        error("invalid_event", "evaluation.evidence_level", "证据等级必须是 synthetic、qa_evidence 或 user_feedback。")
    if level == "qa_evidence":
        binding(evaluation.get("qa_evidence"), "evaluation.qa_evidence")
    if level == "user_feedback":
        binding(evaluation.get("user_feedback"), "evaluation.user_feedback")
    if event_kind == "hypothesis":
        if execution.get("stage") != "prepared" or event.get("execution_evidence") is not None:
            error("hypothesis_claims_execution", "execution_evidence", "hypothesis 只能记录未执行假设，不能伪装为真实执行。")
    if event_kind in {"executed_observation", "comparison"}:
        if level == "synthetic":
            error("real_result_without_evidence", "evaluation.evidence_level", "真实结果观察不能使用 synthetic 证据等级。")
        binding(event.get("execution_evidence"), "execution_evidence")
        outputs = event.get("observed_output_bundle")
        evaluations = event.get("evaluation_bundle")
        if not isinstance(outputs, list) or not outputs:
            error("real_result_without_evidence", "observed_output_bundle", "真实结果必须绑定已观察输出证据。")
        else:
            for index, item in enumerate(outputs):
                binding(item, f"observed_output_bundle[{index}]")
        if not isinstance(evaluations, list) or not evaluations:
            error("real_result_without_evidence", "evaluation_bundle", "真实结果必须绑定 QA 或用户反馈证据。")
        else:
            for index, item in enumerate(evaluations):
                binding(item, f"evaluation_bundle[{index}]")
    if event_kind == "comparison":
        comparison = event.get("comparison", {})
        if not isinstance(comparison.get("baseline_event_ids"), list) or not comparison["baseline_event_ids"]:
            error("comparison_without_baseline", "comparison.baseline_event_ids", "同输入比较必须列出基线事件。")
        binding(comparison.get("same_input_proof"), "comparison.same_input_proof")
    compounding = event.get("compounding", {})
    if compounding.get("promotion_eligible") is True:
        if event_kind not in {"executed_observation", "comparison"}:
            error("promotion_without_real_evidence", "compounding.promotion_eligible", "只有带真实观察证据的执行或比较事件可成为候选。")
        if level == "synthetic":
            error("promotion_without_real_evidence", "compounding.promotion_eligible", "合成测试事件不能进入方法升级候选。")
        if evaluation.get("qa_status") not in {"passed", "failed"} and not evaluation.get("user_feedback"):
            error("promotion_without_real_evidence", "evaluation", "方法升级候选必须绑定真实 QA 或用户反馈。")
    return {"schema_version": "prompt_performance_event_report.v1", "status": "PASS" if not errors else "FAIL", "ok": not errors, "checked_paths": [event.get("prompt_contract", {}).get("path", "")] if isinstance(event, dict) else [], "errors": errors, "issues": errors}


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate one prompt performance event offline.")
    parser.add_argument("--event", required=True)
    args = parser.parse_args()
    path = Path(args.event)
    try:
        event = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"schema_version": "prompt_performance_event_report.v1", "status": "FAIL", "ok": False, "checked_paths": [str(path)], "errors": [{"code": "event_unreadable", "field": "event", "detail_zh": str(exc)}]}, ensure_ascii=False, indent=2))
        return 1
    result = validate_event(event)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
