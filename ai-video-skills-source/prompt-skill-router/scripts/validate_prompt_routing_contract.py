#!/usr/bin/env python3
"""Offline validator for prompt_routing_contract.v1."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
ABSOLUTE_WINDOWS_RE = re.compile(r"^[A-Za-z]:[\\/]")
AMBIGUOUS_PATH_PARTS = {"latest", "current", "newest", "browser-history", "canvas-history"}
VALID_STATUSES = {"blocked", "prompt_candidate", "prompt_locked", "ready_for_video_task_spec"}
VALID_PRODUCTION_CLASSES = {
    "redraw",
    "script_only",
    "commerce_reference",
    "original_narrative",
    "confirmed_image_i2v",
}
VALID_AUTHORITY_STATES = {"accepted", "confirmed", "verified"}
ROUTE_FAMILY_MARKERS = {
    "redraw": ("mx-shortdrama",),
    "script_only": ("mx-shortdrama-script-only-production",),
    "commerce_reference": ("realistic-commerce-video-replication", "commerce-video-redraw-router"),
    "original_narrative": ("ai-film-champion-method",),
    "confirmed_image_i2v": ("sd2-video-generation",),
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_absolute_path(value: Any) -> bool:
    return isinstance(value, str) and (Path(value).is_absolute() or bool(ABSOLUTE_WINDOWS_RE.match(value)))


def is_ambiguous_path(value: Any) -> bool:
    if not isinstance(value, str):
        return True
    normalized = value.replace("/", "\\").lower()
    parts = {part for part in normalized.split("\\") if part}
    return "*" in value or "?" in value or bool(parts & AMBIGUOUS_PATH_PARTS)


def is_placeholder(value: Any) -> bool:
    return not isinstance(value, str) or not value.strip() or "__" in value


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


class ContractValidator:
    def __init__(self, contract_path: Path, check_files: bool) -> None:
        self.contract_path = contract_path
        self.check_files = check_files
        self.errors: list[dict[str, str]] = []

    def error(self, code: str, field: str, detail_zh: str) -> None:
        self.errors.append({"code": code, "field": field, "detail_zh": detail_zh})

    def require_string(self, value: Any, field: str, code: str, detail_zh: str) -> bool:
        if is_placeholder(value):
            self.error(code, field, detail_zh)
            return False
        return True

    def validate_file_binding(self, path_value: Any, sha_value: Any, field: str, code: str) -> bool:
        if not is_absolute_path(path_value) or is_ambiguous_path(path_value):
            self.error("ambiguous_artifact_lineage", f"{field}.path", "路径必须是非歧义的绝对路径，不能使用 latest、current、通配符或浏览器历史别名。")
            return False
        if not isinstance(sha_value, str) or not SHA256_RE.fullmatch(sha_value):
            self.error(code, f"{field}.sha256", "缺少有效的 SHA256，不能作为权威或锁定输入。")
            return False
        if not self.check_files:
            return True
        path = Path(path_value)
        if not path.is_file():
            self.error(code, f"{field}.path", "精确路径不存在或不是文件。")
            return False
        if sha256_file(path).lower() != sha_value.lower():
            self.error("sha256_mismatch", field, "文件内容与记录的 SHA256 不一致。")
            return False
        return True

    def validate_layer(self, layers: Any, layer_name: str) -> None:
        layer = layers.get(layer_name) if isinstance(layers, dict) else None
        if not isinstance(layer, dict):
            self.error("missing_layer", f"layers.{layer_name}", "缺少方法、执行或质量层。")
            return
        for key in ("skill", "responsibility", "input_boundary", "output_boundary"):
            self.require_string(layer.get(key), f"layers.{layer_name}.{key}", "invalid_layer", "层记录必须说明 Skill、职责、输入边界和输出边界。")

    def validate(self, contract: Any) -> dict[str, Any]:
        if not isinstance(contract, dict):
            self.error("invalid_contract", "root", "合同根节点必须是 JSON 对象。")
            return self.result(None)

        status = contract.get("compile_status")
        if contract.get("schema_version") != "prompt_routing_contract.v1":
            self.error("invalid_schema", "schema_version", "必须使用 prompt_routing_contract.v1。")
        self.require_string(contract.get("contract_id"), "contract_id", "invalid_contract", "合同必须有稳定的 contract_id。")
        if status not in VALID_STATUSES:
            self.error("invalid_compile_status", "compile_status", "编译状态必须是 blocked、prompt_candidate、prompt_locked 或 ready_for_video_task_spec。")
        production_class = contract.get("production_class")
        if production_class not in VALID_PRODUCTION_CLASSES:
            self.error("invalid_production_class", "production_class", "生产分类必须使用受支持的 AI 视频路线。")

        downstream = contract.get("downstream")
        if not isinstance(downstream, dict):
            self.error("invalid_downstream_boundary", "downstream", "必须声明下游 video_task_spec 和提交边界。")
        else:
            if downstream.get("video_task_spec_required") is not True:
                self.error("invalid_downstream_boundary", "downstream.video_task_spec_required", "提示词编译后必须由下游 video_task_spec 负责真实执行合同。")
            if downstream.get("provider_submit_allowed") is not False:
                self.error("compiler_cannot_authorize_submission", "downstream.provider_submit_allowed", "提示词编译器不能授权渠道真实提交。")

        if status == "blocked":
            blockers = contract.get("blockers")
            if not isinstance(blockers, list) or not blockers:
                self.error("blocked_without_reason", "blockers", "blocked 合同必须记录最早阻塞原因。")
            return self.result(status)

        source_route = contract.get("source_route")
        if not isinstance(source_route, dict):
            self.error("missing_authoritative_source", "source_route", "必须声明当前专业事实路线。")
        else:
            self.require_string(source_route.get("skill"), "source_route.skill", "missing_authoritative_source", "必须声明专业路线 Skill。")
            self.require_string(source_route.get("authority_contract"), "source_route.authority_contract", "missing_authoritative_source", "必须声明专业路线权威合同。")
            self.validate_file_binding(source_route.get("path"), source_route.get("sha256"), "source_route", "missing_authoritative_source")

        authority_bundle = contract.get("authority_bundle")
        if not isinstance(authority_bundle, list) or not authority_bundle:
            self.error("missing_authoritative_source", "authority_bundle", "提示词编译必须绑定至少一个当前专业路线权威产物。")
            authority_bundle = []
        authority_hashes: list[str] = []
        for index, artifact in enumerate(authority_bundle):
            field = f"authority_bundle[{index}]"
            if not isinstance(artifact, dict):
                self.error("missing_authoritative_source", field, "权威产物必须是对象。")
                continue
            self.require_string(artifact.get("artifact_role"), f"{field}.artifact_role", "missing_authoritative_source", "权威产物必须有角色。")
            self.require_string(artifact.get("source_route"), f"{field}.source_route", "missing_authoritative_source", "权威产物必须标明来源路线。")
            if artifact.get("authority_state") not in VALID_AUTHORITY_STATES:
                self.error("missing_authoritative_source", f"{field}.authority_state", "权威产物状态必须是 accepted、confirmed 或 verified。")
            if self.validate_file_binding(artifact.get("path"), artifact.get("sha256"), field, "missing_authoritative_source"):
                authority_hashes.append(artifact["sha256"].lower())

        self.validate_route_family(production_class, source_route, authority_bundle)

        layers = contract.get("layers")
        for name in ("method", "execution", "qa"):
            self.validate_layer(layers, name)
        if isinstance(layers, dict):
            responsibilities = [layers.get(name, {}).get("responsibility") for name in ("method", "execution", "qa")]
            if all(isinstance(value, str) and value for value in responsibilities) and len(set(responsibilities)) != 3:
                self.error("overlapping_layers", "layers", "方法、执行、质量层必须有不同职责。")

        if status in {"prompt_locked", "ready_for_video_task_spec"}:
            self.validate_locked_prompt(contract.get("locked_prompt"), authority_hashes)

        if status == "ready_for_video_task_spec":
            self.validate_references(contract.get("references"))
            self.validate_compatibility(contract.get("compatibility"), contract.get("references"))

        return self.result(status)

    def validate_route_family(self, production_class: Any, source_route: Any, authority_bundle: list[Any]) -> None:
        if production_class not in ROUTE_FAMILY_MARKERS or not isinstance(source_route, dict):
            return
        markers = ROUTE_FAMILY_MARKERS[production_class]
        source_skill = str(source_route.get("skill", "")).lower()
        if not any(marker in source_skill for marker in markers):
            self.error("source_route_mismatch", "source_route.skill", "生产分类与专业事实路线不匹配，不能跨路线借用事实。")
            return
        artifact_routes = [str(item.get("source_route", "")).lower() for item in authority_bundle if isinstance(item, dict)]
        if not artifact_routes or not all(any(marker in artifact_route for marker in markers) for artifact_route in artifact_routes):
            self.error("source_route_mismatch", "authority_bundle", "权威产物必须全部来自所选生产路线的事实家族。")
        if production_class == "redraw":
            roles = {str(item.get("artifact_role", "")).lower() for item in authority_bundle if isinstance(item, dict)}
            if not any("step02" in role for role in roles) or not any("step04" in role for role in roles):
                self.error("missing_authoritative_source", "authority_bundle", "转绘提示词至少需要 accepted Step02 和 accepted Step04 的事实绑定。")

    def validate_locked_prompt(self, locked_prompt: Any, authority_hashes: list[str]) -> None:
        if not isinstance(locked_prompt, dict):
            self.error("prompt_not_locked", "locked_prompt", "锁定提示词对象缺失。")
            return
        self.validate_file_binding(locked_prompt.get("path"), locked_prompt.get("sha256"), "locked_prompt", "prompt_not_locked")
        self.require_string(locked_prompt.get("format"), "locked_prompt.format", "prompt_not_locked", "锁定提示词必须记录格式。")
        sections = locked_prompt.get("required_sections")
        if not isinstance(sections, list) or not sections or any(is_placeholder(item) for item in sections):
            self.error("prompt_not_locked", "locked_prompt.required_sections", "锁定提示词必须声明所需段落。")
        bindings = locked_prompt.get("source_binding_hashes")
        if not isinstance(bindings, list) or not bindings or any(not isinstance(item, str) or not SHA256_RE.fullmatch(item) for item in bindings):
            self.error("prompt_not_locked", "locked_prompt.source_binding_hashes", "锁定提示词必须绑定权威来源 SHA256。")
        elif not set(authority_hashes).issubset({item.lower() for item in bindings}):
            self.error("prompt_not_locked", "locked_prompt.source_binding_hashes", "锁定提示词没有绑定全部权威来源 SHA256。")

    def validate_references(self, references: Any) -> None:
        if not isinstance(references, list):
            self.error("reference_unconfirmed", "references", "视频任务交接必须提供参考图列表。")
            return
        for index, reference in enumerate(references):
            field = f"references[{index}]"
            if not isinstance(reference, dict):
                self.error("reference_unconfirmed", field, "参考图必须是对象。")
                continue
            self.require_string(reference.get("ref_key"), f"{field}.ref_key", "reference_unconfirmed", "参考图必须有稳定 ref_key。")
            self.validate_file_binding(reference.get("path"), reference.get("sha256"), field, "reference_unconfirmed")
            self.require_string(reference.get("chinese_duty"), f"{field}.chinese_duty", "reference_unconfirmed", "参考图必须有中文职责。")
            if reference.get("user_confirmation") != "confirmed" or reference.get("upload_eligible") is not True:
                self.error("reference_unconfirmed", field, "视频上传参考图必须已确认且 upload_eligible=true。")
            if reference.get("local_edit_applied") is True or reference.get("artifact_class") in {"candidate", "diagnostic", "evidence_only", "rejected"}:
                self.error("reference_local_edit_or_evidence_only", field, "候选、证据用、拒绝或本地改图参考不能进入上传列表。")

    def validate_compatibility(self, compatibility: Any, references: Any) -> None:
        if not isinstance(compatibility, dict):
            self.error("channel_incompatible", "compatibility", "视频任务交接必须提供渠道兼容性结论。")
            return
        self.validate_file_binding(compatibility.get("evidence_path"), compatibility.get("evidence_sha256"), "compatibility", "channel_incompatible")
        selected_channel = compatibility.get("selected_channel")
        allowed_channels = compatibility.get("allowed_channels")
        self.require_string(selected_channel, "compatibility.selected_channel", "channel_incompatible", "必须选择一个上游允许的渠道。")
        if not isinstance(allowed_channels, list) or not allowed_channels or any(is_placeholder(item) for item in allowed_channels):
            self.error("channel_incompatible", "compatibility.allowed_channels", "必须记录上游允许的渠道集合。")
        elif selected_channel not in allowed_channels:
            self.error("channel_incompatible", "compatibility.selected_channel", "选择渠道不在上游允许集合中。")
        if compatibility.get("channel_state") != "available":
            self.error("channel_disabled" if compatibility.get("channel_state") == "disabled" else "channel_incompatible", "compatibility.channel_state", "渠道必须处于 available 状态。")
        if isinstance(selected_channel, str) and selected_channel.lower() in {"tensor-art", "tensor.art", "echoon"}:
            self.error("channel_disabled", "compatibility.selected_channel", "Tensor.Art 和 Echoon 在当前策略下不可用。")
        if compatibility.get("passed") is not True:
            self.error("channel_incompatible", "compatibility.passed", "没有通过兼容性检查的渠道不能进入视频任务交接。")
        for key in ("model", "aspect_ratio", "resolution"):
            self.require_string(compatibility.get(key), f"compatibility.{key}", "channel_incompatible", "兼容性结论必须锁定模型、比例和分辨率。")
        if not isinstance(compatibility.get("duration_seconds"), (int, float)) or compatibility["duration_seconds"] <= 0:
            self.error("channel_incompatible", "compatibility.duration_seconds", "兼容性结论必须记录正数时长。")
        required_reference_count = compatibility.get("required_reference_count")
        if not isinstance(required_reference_count, int) or required_reference_count < 0:
            self.error("channel_incompatible", "compatibility.required_reference_count", "必须记录所需参考图数量。")
        elif isinstance(references, list) and len(references) != required_reference_count:
            self.error("channel_incompatible", "references", "实际参考图数量与锁定兼容性要求不一致。")

    def result(self, status: Any) -> dict[str, Any]:
        return {
            "ok": not self.errors,
            "contract": str(self.contract_path),
            "compile_status": status,
            "blockers": self.errors,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate prompt_routing_contract.v1 without executing providers.")
    parser.add_argument("--contract", required=True, help="Absolute contract JSON path")
    parser.add_argument("--no-file-check", action="store_true", help="Validate shape only; intended for template checks")
    args = parser.parse_args()

    contract_path = Path(args.contract)
    if not contract_path.is_file():
        print(json.dumps({"ok": False, "contract": str(contract_path), "blockers": [{"code": "contract_not_found", "field": "contract", "detail_zh": "合同文件不存在。"}]}, ensure_ascii=False, indent=2))
        return 1
    try:
        contract = load_json(contract_path)
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"ok": False, "contract": str(contract_path), "blockers": [{"code": "contract_unreadable", "field": "contract", "detail_zh": str(exc)}]}, ensure_ascii=False, indent=2))
        return 1

    result = ContractValidator(contract_path, check_files=not args.no_file_check).validate(contract)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
