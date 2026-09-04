#!/usr/bin/env python3
"""Export the governed Codex Skill registry into an Obsidian dashboard and Canvas.

The Codex registry, overrides, family map, router, and evidence ledger remain the
source of truth.  The Obsidian files are deterministic generated views and must
not be edited as governance authority.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SCRIPT_PATH = Path(__file__).resolve()
SKILL_ROOT = SCRIPT_PATH.parent.parent
REFERENCES = SKILL_ROOT / "references"
DEFAULT_VAULT = Path.home() / "Documents" / "Obsidian Vault"
DEFAULT_OUTPUT_DIR = Path("00_给我看的") / "Codex Skill 路由"
DETAILS_DIR_NAME = "Skills"
BASE_FILE_NAME = "Skill 路由控制台.base"
CHANGELOG_FILE_NAME = "Skill 路由变更记录.md"

STATUS_ORDER = {
    "mandatory": 0,
    "user_designated": 1,
    "evidence_backed_champion": 2,
    "provisional_default": 3,
    "primary": 4,
    "supporting": 5,
    "explicit_only": 6,
    "candidate": 7,
    "unassessed": 8,
    "archived": 9,
    "unavailable_legacy": 10,
}

STATUS_LABELS = {
    "mandatory": "强制",
    "user_designated": "用户指定",
    "evidence_backed_champion": "证据冠军",
    "provisional_default": "暂定默认",
    "primary": "主路由",
    "supporting": "辅助",
    "explicit_only": "仅明确触发",
    "candidate": "候选",
    "unassessed": "待评估",
    "archived": "已归档",
    "unavailable_legacy": "旧路由不可用",
}

STATUS_COLORS = {
    "mandatory": "1",
    "user_designated": "6",
    "evidence_backed_champion": "4",
    "provisional_default": "5",
    "primary": "4",
    "supporting": "5",
    "explicit_only": "2",
    "candidate": "3",
    "unassessed": "3",
    "archived": "1",
    "unavailable_legacy": "1",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", type=Path, default=DEFAULT_VAULT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--registry", type=Path, default=REFERENCES / "skill-registry.json")
    parser.add_argument("--overrides", type=Path, default=REFERENCES / "skill-registry-overrides.json")
    parser.add_argument("--ledger", type=Path, default=REFERENCES / "skill-use-ledger.jsonl")
    parser.add_argument("--router", type=Path, default=REFERENCES / "skill-router.md")
    parser.add_argument("--families", type=Path, default=REFERENCES / "skill-families.md")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_ledger(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
        if not isinstance(value, dict):
            raise ValueError(f"Ledger row must be an object at {path}:{line_number}")
        rows.append(value)
    return rows


def source_hash(paths: Iterable[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths, key=lambda item: str(item).lower()):
        digest.update(str(path).encode("utf-8"))
        digest.update(b"\0")
        if path.name == "skill-registry.json":
            registry = read_json(path)
            registry.pop("generated_at", None)
            digest.update(
                json.dumps(registry, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            )
        else:
            digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def stable_id(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def safe_filename(value: str) -> str:
    normalized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "-", value).strip(" .")
    normalized = re.sub(r"\s+", " ", normalized)
    if not normalized:
        normalized = "skill"
    return f"{normalized[:100]}--{stable_id(value)[:8]}.md"


def skill_note_relative(output_dir: Path, item: dict[str, Any]) -> Path:
    return output_dir / DETAILS_DIR_NAME / safe_filename(str(item.get("name", "skill")))


def wikilink(relative_path: Path | str, label: str) -> str:
    target = Path(relative_path).as_posix()
    if target.lower().endswith(".md"):
        target = target[:-3]
    safe_label = label.replace("|", "／").replace("]", "）")
    return f"[[{target}|{safe_label}]]"


def iso_file_mtime(path: Path) -> str | None:
    if not path.is_file():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()


def markdown_fence(content: str) -> str:
    runs = [len(match.group(0)) for match in re.finditer(r"`+", content)]
    return "`" * max(4, (max(runs) + 1) if runs else 4)


def esc_cell(value: Any) -> str:
    return str(value if value is not None else "").replace("|", "\\|").replace("\n", " ")


def evidence_summary(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    rank = {"none": 0, "structural": 1, "integrated": 2, "real_delivery": 3}
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        name = str(row.get("skill", ""))
        if not name:
            continue
        bucket = result.setdefault(
            name,
            {"count": 0, "totals": [], "highest": "none", "outcomes": Counter()},
        )
        bucket["count"] += 1
        total = row.get("total")
        if isinstance(total, (int, float)):
            bucket["totals"].append(float(total))
        level = str(row.get("verification_level", "none"))
        if rank.get(level, 0) > rank.get(str(bucket["highest"]), 0):
            bucket["highest"] = level
        bucket["outcomes"][str(row.get("outcome", "unknown"))] += 1
    for bucket in result.values():
        totals = bucket.pop("totals")
        bucket["average"] = round(sum(totals) / len(totals), 1) if totals else None
        bucket["outcomes"] = dict(bucket["outcomes"])
    return result


def evidence_rows_by_skill(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        name = str(row.get("skill", ""))
        if name:
            result[name].append(row)
    for values in result.values():
        values.sort(key=lambda row: str(row.get("created_at", "")), reverse=True)
    return dict(result)


def skill_value_assessment(
    item: dict[str, Any],
    evidence_rows: list[dict[str, Any]],
    evidence: dict[str, Any] | None,
) -> dict[str, str]:
    """Explain a Skill's current value without pretending that missing evidence is negative evidence."""
    status = str(item.get("routing_status") or "unassessed")
    domain_role = str(item.get("domain_role") or "unassessed")
    count = len(evidence_rows)
    highest = str((evidence or {}).get("highest") or "none")
    average = (evidence or {}).get("average")
    outcomes = (evidence or {}).get("outcomes") or {}
    completed = int(outcomes.get("completed") or 0)
    blocked = int(outcomes.get("blocked") or 0)

    if highest == "real_delivery":
        value_summary = "已有真实交付证据，适合作为同类任务的优先路由候选。"
        evidence_gap = "继续观察跨项目复用和用户反馈，避免只凭单项目成功永久晋级。"
    elif highest == "integrated":
        value_summary = "已有端到端或生产路径集成证据，能降低返工风险，但尚未证明用户侧真实交付闭环。"
        evidence_gap = "需要用户确认、外部交付或真实业务复用，才能升级为交付价值。"
    elif highest == "structural":
        value_summary = "已在路由、文档或架构层提供帮助，但还缺少真实执行路径证据。"
        evidence_gap = "下一次真实任务中应记录直接产物、验证命令和用户反馈。"
    elif status in {"mandatory", "user_designated", "primary", "provisional_default", "supporting", "explicit_only"}:
        value_summary = "当前由规则、用户偏好或路由职责保留；没有证据不等于低价值。"
        evidence_gap = "需要至少一条真实任务证据来判断它是否应该晋级、缩窄或被替代。"
    else:
        value_summary = "当前主要是可用库存或候选能力，暂不应自动触发。"
        evidence_gap = "只有在用户明确点名或任务高度匹配时使用，并记录结果。"

    if count and average is not None:
        value_summary += f" 当前有 {count} 条证据，平均评分 {average}/10，完成 {completed} 次、阻断 {blocked} 次。"
    elif count:
        value_summary += f" 当前有 {count} 条证据。"

    if domain_role in {"entry", "default"}:
        best_use = "作为该能力域的入口/默认路由，负责把任务送到正确下游或完成常规产出。"
    elif domain_role in {"specialist_primary", "primary"}:
        best_use = "作为该家族的主要专项能力，处理明确匹配的专业任务。"
    elif domain_role == "supporting":
        best_use = "作为辅助能力，只在不同阶段补强主路由，不应和同类 Skill 堆叠。"
    elif domain_role in {"explicit_execution", "explicit_only"}:
        best_use = "只在用户明确授权或任务明确要求该外部执行能力时使用。"
    elif domain_role == "candidate":
        best_use = "作为候选能力保留，等待真实任务验证。"
    else:
        best_use = "按当前能力域合同使用，优先避免自动触发。"

    return {
        "value_summary": value_summary,
        "best_use": best_use,
        "evidence_gap": evidence_gap,
    }


def build_semantic_snapshot(
    skill_items: dict[str, dict[str, Any]],
    evidence: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Keep only user-meaningful routing fields; omit generated timestamps."""
    snapshot: dict[str, dict[str, Any]] = {}
    for name, item in sorted(skill_items.items()):
        skill_evidence = evidence.get(name, {})
        snapshot[name] = {
            "family": str(item.get("family") or "unclassified"),
            "routing_domain": str(item.get("routing_domain") or "unmapped"),
            "domain_role": str(item.get("domain_role") or "unassessed"),
            "routing_status": str(item.get("routing_status") or "unassessed"),
            "discovery_status": str(item.get("discovery_status") or "unknown"),
            "source_of_truth": str(item.get("source_of_truth_qualified_id") or ""),
            "duplicate_kind": str(item.get("duplicate_kind") or "none"),
            "evidence_count": int(skill_evidence.get("count") or 0),
            "highest_verification": str(skill_evidence.get("highest") or "none"),
            "average_score": skill_evidence.get("average"),
        }
    return snapshot


def semantic_changes(
    previous: dict[str, dict[str, Any]],
    current: dict[str, dict[str, Any]],
) -> list[str]:
    if not previous:
        return [f"建立初始语义快照，共 {len(current)} 个 Skill。"]
    changes: list[str] = []
    for name in sorted(current.keys() - previous.keys()):
        changes.append(f"新增 Skill：`{name}`。")
    for name in sorted(previous.keys() - current.keys()):
        changes.append(f"Skill 不再出现在当前视图：`{name}`。")
    labels = {
        "family": "家族",
        "routing_domain": "能力域",
        "domain_role": "域内角色",
        "routing_status": "路由状态",
        "discovery_status": "发现状态",
        "source_of_truth": "Source of Truth",
        "duplicate_kind": "重复类型",
        "evidence_count": "证据数量",
        "highest_verification": "最高验证等级",
        "average_score": "平均评分",
    }
    newly_introduced_fields = {
        field for field in labels if all(field not in value for value in previous.values())
    }
    if {"routing_domain", "domain_role"}.issubset(newly_introduced_fields):
        changes.append(f"为全部 {len(current)} 个 Skill 建立业务能力域和域内角色映射。")
    for name in sorted(current.keys() & previous.keys()):
        before = previous[name]
        after = current[name]
        for field, label in labels.items():
            if field in newly_introduced_fields:
                continue
            if before.get(field) != after.get(field):
                changes.append(
                    f"`{name}` 的{label}：`{before.get(field)}` → `{after.get(field)}`。"
                )
    return changes


def build_capability_snapshot(registry: dict[str, Any]) -> dict[str, Any]:
    snapshot: dict[str, Any] = {"__envelope__": registry.get("capability_envelope", {})}
    for domain in registry.get("routing_domains", []):
        domain_id = str(domain.get("id", ""))
        if domain_id:
            snapshot[domain_id] = {
                "label": domain.get("label"),
                "capability_contract": domain.get("capability_contract", {}),
            }
    return snapshot


def capability_changes(previous: dict[str, Any], current: dict[str, Any]) -> list[str]:
    if not previous:
        return [f"为 {len(current) - 1} 个业务能力域建立输入、输出、完成门和非产出边界。"]
    changes: list[str] = []
    if previous.get("__envelope__") != current.get("__envelope__"):
        changes.append("更新统一能力封装：Input Packet → Routing Decision → Capability Execution → Output Packet。")
    previous_domains = set(previous) - {"__envelope__"}
    current_domains = set(current) - {"__envelope__"}
    for domain_id in sorted(current_domains - previous_domains):
        changes.append(f"新增能力域封装合同：`{domain_id}`。")
    for domain_id in sorted(previous_domains - current_domains):
        changes.append(f"移除能力域封装合同：`{domain_id}`。")
    for domain_id in sorted(previous_domains & current_domains):
        if previous[domain_id] != current[domain_id]:
            label = current[domain_id].get("label") or domain_id
            changes.append(f"更新 **{label}** (`{domain_id}`) 的能力输入/输出合同。")
    return changes


def render_base(output_dir: Path) -> str:
    folder = (output_dir / DETAILS_DIR_NAME).as_posix()
    return "\n".join(
        [
            f'filters: \'file.inFolder("{folder}") && type == "codex-skill-detail"\'',
            "properties:",
            "  display_name_zh:",
            '    displayName: "中文名称"',
            "  skill_name:",
            '    displayName: "英文稳定 ID"',
            "  description_zh:",
            '    displayName: "中文职责"',
            "  chinese_trigger_mode:",
            '    displayName: "中文触发模式"',
            "  family:",
            '    displayName: "家族"',
            "  routing_domain:",
            '    displayName: "能力域"',
            "  domain_role:",
            '    displayName: "域内角色"',
            "  capability_output:",
            '    displayName: "可输出能力"',
            "  value_summary:",
            '    displayName: "价值一句话"',
            "  best_use:",
            '    displayName: "最佳使用"',
            "  evidence_gap:",
            '    displayName: "缺的证据"',
            "  routing_status:",
            '    displayName: "路由状态"',
            "  evidence_count:",
            '    displayName: "证据"',
            "  highest_verification:",
            '    displayName: "最高验证"',
            "  source_modified_at:",
            '    displayName: "源文件更新"',
            "views:",
            "  - type: table",
            '    name: "按能力域"',
            "    groupBy:",
            "      property: routing_domain",
            "      direction: ASC",
            "    order:",
            "      - display_name_zh",
            "      - description_zh",
            "      - file.name",
            "      - routing_domain",
            "      - domain_role",
            "      - value_summary",
            "      - best_use",
            "      - capability_output",
            "      - family",
            "      - routing_status",
            "      - evidence_count",
            "      - highest_verification",
            "      - source_modified_at",
            "  - type: table",
            '    name: "有真实证据"',
            "    filters: 'evidence_count > 0'",
            "    order:",
            "      - display_name_zh",
            "      - file.name",
            "      - routing_domain",
            "      - domain_role",
            "      - family",
            "      - value_summary",
            "      - evidence_gap",
            "      - evidence_count",
            "      - highest_verification",
            "      - average_score",
            "  - type: table",
            '    name: "需治理"',
            "    filters:",
            "      or:",
            "        - 'duplicate_kind != \"none\"'",
            "        - 'routing_status == \"candidate\"'",
            "        - 'routing_status == \"unassessed\"'",
            "    order:",
            "      - file.name",
            "      - routing_domain",
            "      - domain_role",
            "      - family",
            "      - evidence_gap",
            "      - routing_status",
            "      - duplicate_kind",
            "      - evidence_count",
            "",
        ]
    )


def render_changelog(history: list[dict[str, Any]], digest: str, generated_at: str) -> str:
    lines = [
        "---",
        "generated: true",
        "type: codex-skill-routing-changelog",
        f'generated_at: "{generated_at}"',
        f'source_state_hash: "{digest}"',
        "tags:",
        "  - codex/skills",
        "  - codex/routing",
        "  - generated",
        "---",
        "",
        "# Skill 路由变更记录",
        "",
        "> [!info] 只记录语义变化",
        "> 新增、消失、路由、家族、权威来源、重复关系和证据变化会进入这里；纯同步时间变化不会记录。",
        "",
    ]
    for event in reversed(history[-50:]):
        lines.extend([f"## {event.get('at', '未知时间')}", ""])
        for change in event.get("changes", []):
            lines.append(f"- {change}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_skill_note(
    item: dict[str, Any],
    domain: dict[str, Any],
    evidence_rows: list[dict[str, Any]],
    evidence: dict[str, Any] | None,
    digest: str,
    generated_at: str,
    registry_generated_at: str | None,
    dashboard_relative_path: Path,
    canvas_relative_path: Path,
) -> str:
    name = str(item.get("name", "unnamed-skill"))
    display_name_zh = str(item.get("display_name_zh") or name)
    description_zh = str(item.get("description_zh") or "暂无中文职责说明。")
    aliases_zh = [str(value) for value in item.get("aliases_zh", [])]
    entries = list(item.get("entries", []))
    latest_evidence_at = str(evidence_rows[0].get("created_at")) if evidence_rows else None
    source_times = []
    for entry in entries:
        path_value = entry.get("path")
        if path_value:
            modified = iso_file_mtime(Path(str(path_value)))
            if modified:
                source_times.append(modified)
    latest_source_at = max(source_times) if source_times else None
    average = evidence.get("average") if evidence else None
    highest = evidence.get("highest", "none") if evidence else "none"
    capability = domain.get("capability_contract", {})
    capability_input = "；".join(str(value) for value in capability.get("input", []))
    capability_output = "；".join(str(value) for value in capability.get("output", []))
    value = skill_value_assessment(item, evidence_rows, evidence)

    lines = [
        "---",
        "generated: true",
        "type: codex-skill-detail",
        f"skill_name: {json.dumps(name, ensure_ascii=False)}",
        f"display_name_zh: {json.dumps(display_name_zh, ensure_ascii=False)}",
        f"description_zh: {json.dumps(description_zh, ensure_ascii=False)}",
        f"chinese_trigger_mode: {json.dumps(str(item.get('chinese_trigger_mode') or 'display_only'), ensure_ascii=False)}",
        f"routing_status: {json.dumps(str(item.get('routing_status', 'unassessed')), ensure_ascii=False)}",
        f"family: {json.dumps(str(item.get('family') or 'unclassified'), ensure_ascii=False)}",
        f"routing_domain: {json.dumps(str(item.get('routing_domain') or 'unmapped'), ensure_ascii=False)}",
        f"domain_role: {json.dumps(str(item.get('domain_role') or 'unassessed'), ensure_ascii=False)}",
        f"capability_input: {json.dumps(capability_input, ensure_ascii=False)}",
        f"capability_output: {json.dumps(capability_output, ensure_ascii=False)}",
        f"value_summary: {json.dumps(value['value_summary'], ensure_ascii=False)}",
        f"best_use: {json.dumps(value['best_use'], ensure_ascii=False)}",
        f"evidence_gap: {json.dumps(value['evidence_gap'], ensure_ascii=False)}",
        f"capability_completion_gate: {json.dumps(str(capability.get('completion_gate') or ''), ensure_ascii=False)}",
        f"discovery_status: {json.dumps(str(item.get('discovery_status') or 'unknown'), ensure_ascii=False)}",
        f"duplicate_kind: {json.dumps(str(item.get('duplicate_kind') or 'none'), ensure_ascii=False)}",
        f"source_of_truth: {json.dumps(str(item.get('source_of_truth_qualified_id') or ''), ensure_ascii=False)}",
        f"evidence_count: {len(evidence_rows)}",
        f"highest_verification: {json.dumps(str(highest), ensure_ascii=False)}",
        f"average_score: {json.dumps(average, ensure_ascii=False)}",
        f"source_modified_at: {json.dumps(latest_source_at, ensure_ascii=False)}",
        f"latest_evidence_at: {json.dumps(latest_evidence_at, ensure_ascii=False)}",
        f'generated_at: "{generated_at}"',
        f'source_state_hash: "{digest}"',
        "tags:",
        "  - codex/skills/detail",
        "  - generated",
        "---",
        "",
        f"# {display_name_zh}",
        "",
        "> [!warning] 自动生成详情卡",
        "> 路由状态和 Skill 正文来自 Codex 权威源。不要在本页直接维护规则；下一次同步会覆盖本页。",
        "",
        f"{wikilink(dashboard_relative_path, '返回 Skill 路由总览')} · {wikilink(canvas_relative_path, '打开思维导图')}",
        "",
        "## 这个 Skill 的价值",
        "",
        f"- **价值：** {value['value_summary']}",
        f"- **最适合：** {value['best_use']}",
        f"- **还缺：** {value['evidence_gap']}",
        f"- **中文职责：** {description_zh}",
        f"- **中文别名：** {'、'.join(aliases_zh) if aliases_zh else '无'}",
        "",
        "## 当前路由",
        "",
        "| 字段 | 当前值 |",
        "|---|---|",
        f"| 中文名称 | **{esc_cell(display_name_zh)}** |",
        f"| 英文稳定 ID | `{esc_cell(name)}` |",
        f"| 中文触发模式 | `{esc_cell(item.get('chinese_trigger_mode'))}` |",
        f"| 家族 | `{esc_cell(item.get('family') or 'unclassified')}` |",
        f"| 业务能力域 | `{esc_cell(item.get('routing_domain') or 'unmapped')}` |",
        f"| 域内角色 | `{esc_cell(item.get('domain_role') or 'unassessed')}` |",
        f"| 路由状态 | **{STATUS_LABELS.get(str(item.get('routing_status')), str(item.get('routing_status')))}** (`{esc_cell(item.get('routing_status'))}`) |",
        f"| 发现状态 | `{esc_cell(item.get('discovery_status'))}` |",
        f"| 分类状态 | `{esc_cell(item.get('classification_status'))}` |",
        f"| Source of Truth | `{esc_cell(item.get('source_of_truth_qualified_id'))}` |",
        f"| 重复类型 | `{esc_cell(item.get('duplicate_kind'))}` |",
        f"| 证据记录 | **{len(evidence_rows)}** |",
        f"| 最高验证等级 | `{esc_cell(highest)}` |",
        f"| 平均评分 | {average if average is not None else '—'} |",
        "",
        "## 能力封装：输入 → 输出",
        "",
        f"> [!abstract] {esc_cell(domain.get('label') or item.get('routing_domain') or '未映射能力域')}",
        f"> **转换逻辑：** {str(capability.get('transform') or '尚未定义。')}",
        "",
        "### 接收输入",
        "",
    ]
    if capability.get("input"):
        lines.extend(f"- {value}" for value in capability["input"])
    else:
        lines.append("- 尚未定义输入合同。")
    lines.extend(["", "### 合法输出", ""])
    if capability.get("output"):
        lines.extend(f"- {value}" for value in capability["output"])
    else:
        lines.append("- 尚未定义输出合同。")
    lines.extend(
        [
        "",
        "### 完成门",
        "",
        str(capability.get("completion_gate") or "尚未定义完成门。"),
        "",
        "### 不能冒充输出",
        "",
        ]
    )
    if capability.get("non_output"):
        lines.extend(f"- {value}" for value in capability["non_output"])
    else:
        lines.append("- 尚未定义非产出边界。")
    lines.extend([
        "",
        "## 更新时间",
        "",
        "| 时间类型 | 时间 | 说明 |",
        "|---|---|---|",
        f"| Skill 源文件最近修改 | `{latest_source_at or '无可读源文件'}` | 来自当前实现文件的 mtime |",
        f"| 最近真实证据 | `{latest_evidence_at or '尚无真实证据'}` | 来自 append-only 证据账本 |",
        f"| 注册表快照 | `{registry_generated_at or '未知'}` | 当前 Codex 注册表生成时间 |",
        f"| Obsidian 同步 | `{generated_at}` | 本详情卡生成时间 |",
        "",
        "## 治理说明",
        "",
        str(item.get("notes") or "当前没有额外治理备注。"),
        "",
        "## 当前实现",
        "",
    ])

    if entries:
        lines.extend(
            [
                "| Qualified ID | 来源 | Owner | 状态 | 文件行数 | 文件修改时间 | 源路径 |",
                "|---|---|---|---|---:|---|---|",
            ]
        )
        for entry in entries:
            path_value = str(entry.get("path") or "")
            modified = iso_file_mtime(Path(path_value)) if path_value else None
            lines.append(
                f"| `{esc_cell(entry.get('qualified_id'))}` | `{esc_cell(entry.get('source'))}` | "
                f"`{esc_cell(entry.get('owner'))}` | `{esc_cell(entry.get('status'))}` | "
                f"{esc_cell(entry.get('lines'))} | `{modified or '不可读'}` | `{esc_cell(path_value)}` |"
            )
    else:
        lines.append("没有当前可发现实现；该条目来自归档或旧路由治理记录。")

    descriptions = []
    for entry in entries:
        description = str(entry.get("description") or "").strip()
        if description and description not in descriptions:
            descriptions.append(description)
    lines.extend(["", "## 触发描述", ""])
    if descriptions:
        for description in descriptions:
            lines.append(f"- {description}")
    else:
        lines.append("暂无可读触发描述。")

    lines.extend(["", "## 真实使用证据", ""])
    if evidence_rows:
        lines.extend(["| 时间 | 项目 | 任务 | 结果 | 验证等级 | 分数 | 用户反馈 |", "|---|---|---|---|---|---:|---|"])
        for row in evidence_rows:
            lines.append(
                f"| `{esc_cell(row.get('created_at'))}` | {esc_cell(row.get('project'))} | "
                f"{esc_cell(row.get('task'))} | `{esc_cell(row.get('outcome'))}` | "
                f"`{esc_cell(row.get('verification_level'))}` | {esc_cell(row.get('total'))} | "
                f"`{esc_cell(row.get('user_feedback'))}` |"
            )
        lines.extend(["", "### 证据结论", ""])
        for row in evidence_rows:
            lines.append(f"- **{esc_cell(row.get('project'))} / {esc_cell(row.get('task'))}**：{esc_cell(row.get('notes'))}")
    else:
        lines.append("尚无符合当前证据合同的真实使用记录；这不等于低价值。")

    lines.extend(["", "## 完整 Skill 内容", ""])
    if entries:
        for entry in entries:
            qualified_id = str(entry.get("qualified_id") or name)
            path_value = str(entry.get("path") or "")
            lines.extend([f"### {qualified_id}", "", f"源路径：`{path_value or '不可用'}`", ""])
            source_path = Path(path_value) if path_value else None
            if source_path and source_path.is_file():
                content = source_path.read_text(encoding="utf-8", errors="replace")
                fence = markdown_fence(content)
                lines.extend([f"{fence}markdown", content.rstrip(), fence, ""])
            else:
                lines.extend(["源文件当前不可读。", ""])
    else:
        lines.append("该归档/旧路由没有当前可读的 SKILL.md。")

    return "\n".join(lines).rstrip() + "\n"


def archived_entries(overrides: dict[str, Any], active_names: set[str]) -> list[dict[str, Any]]:
    archived: list[dict[str, Any]] = []
    for name, entry in overrides.get("skills", {}).items():
        if not isinstance(entry, dict):
            continue
        status = entry.get("status")
        if status not in {"archived", "unavailable_legacy"}:
            continue
        archived.append(
            {
                "name": name,
                "family": entry.get("family", "unclassified"),
                "routing_status": status,
                "notes": entry.get("notes", ""),
                "active": name in active_names,
            }
        )
    return sorted(archived, key=lambda item: (item["family"], item["name"]))


def render_markdown(
    registry: dict[str, Any],
    overrides: dict[str, Any],
    evidence: dict[str, dict[str, Any]],
    digest: str,
    generated_at: str,
    note_links: dict[str, Path],
) -> str:
    skills = list(registry.get("skills", []))
    skill_by_name = {str(item.get("name", "")): item for item in skills}
    display_by_name = {
        name: str(item.get("display_name_zh") or name) for name, item in skill_by_name.items()
    }
    active_names = {str(item.get("name", "")) for item in skills}
    archived = archived_entries(overrides, active_names)
    summary = registry.get("summary", {})
    by_status = Counter(str(item.get("routing_status", "unassessed")) for item in skills)
    by_family: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in skills:
        by_family[str(item.get("family") or "unclassified")].append(item)
        by_domain[str(item.get("routing_domain") or "unmapped")].append(item)
    routing_domains = sorted(registry.get("routing_domains", []), key=lambda item: int(item.get("order", 999)))
    control_planes = sorted(registry.get("control_planes", []), key=lambda item: int(item.get("order", 999)))
    capability_envelope = registry.get("capability_envelope", {})
    duplicates = [item for item in skills if item.get("duplicate_kind") not in {None, "none"}]
    candidates = [
        item
        for item in skills
        if item.get("routing_status") in {"candidate", "unassessed"}
        and int(item.get("evidence_count") or 0) == 0
    ]
    evidence_skills = sorted(
        ((name, value) for name, value in evidence.items()),
        key=lambda item: (-int(item[1]["count"]), item[0]),
    )

    lines = [
        "---",
        "generated: true",
        "type: codex-skill-routing-dashboard",
        f'generated_at: "{generated_at}"',
        f'source_state_hash: "{digest}"',
        "tags:",
        "  - codex/skills",
        "  - codex/routing",
        "  - generated",
        "---",
        "",
        "# Codex Skill 路由总览",
        "",
        "> [!warning] 自动生成视图",
        "> 本页和同目录 Canvas 由 Codex Skill 注册表、覆盖规则、家族图和真实使用证据账本生成。请不要在这里维护路由真相；治理修改应回到 `skill-governance`。",
        "",
        "[[Codex Skill 路由思维导图.canvas|打开 Skill 路由思维导图]] · [[Skill 路由控制台.base|打开可筛选控制台]] · [[Skill 路由变更记录|查看路由变更]]",
        "",
        "## 当前快照",
        "",
        f"- 活跃入口：**{summary.get('entry_count', len(skills))}**",
        f"- 唯一原始名称：**{summary.get('unique_raw_names', len(active_names))}**",
        f"- 路由家族：**{len(by_family)}**",
        f"- 顶层业务能力域：**{len(routing_domains)}**",
        f"- 横向控制面：**{len(control_planes)}**",
        f"- 同名分叉组：**{summary.get('divergent_duplicate_groups', len(duplicates))}**",
        f"- 真实证据记录：**{sum(item['count'] for item in evidence.values())}**",
        f"- 已有证据的 Skill：**{len(evidence)}**",
        f"- 零证据候选/待评估：**{len(candidates)}**",
        f"- 已归档或旧路由不可用：**{len(archived)}**",
        f"- 源状态哈希：`{digest[:16]}`",
        "",
        "## Skill 能力封装",
        "",
        "```text",
        "Input Packet → Routing Decision → Capability Execution → Output Packet",
        "```",
        "",
        "路由不是最终产物。每次调用都必须把输入规范化，选择最小能力组合，并返回可核验的输出包。",
        "",
        "### 标准输入包",
        "",
        "| 字段 | 必需 | 含义 |",
        "|---|---|---|",
    ]
    for field in capability_envelope.get("input_packet", []):
        lines.append(
            f"| `{esc_cell(field.get('field'))}` | {'是' if field.get('required') else '按需'} | {esc_cell(field.get('meaning'))} |"
        )
    lines.extend(["", "### 标准输出包", "", "| 字段 | 必需 | 含义 |", "|---|---|---|"])
    for field in capability_envelope.get("output_packet", []):
        lines.append(
            f"| `{esc_cell(field.get('field'))}` | {'是' if field.get('required') else '按需'} | {esc_cell(field.get('meaning'))} |"
        )
    lines.extend(["", "### 封装不变量", ""])
    for invariant in capability_envelope.get("invariants", []):
        lines.append(f"- {invariant}")
    lines.extend(
        [
            "",
            "## 12 个业务能力域",
            "",
            "| 能力域 | Skill 数量 | 重叠压力 | 入口策略 | 入口路由 | 默认路线 | 选择规则 |",
            "|---|---:|---|---|---|---|---|",
        ]
    )
    for domain in routing_domains:
        domain_id = str(domain.get("id", "unmapped"))
        entries = "、".join(
            wikilink(note_links.get(name, name), display_by_name.get(name, name)) for name in domain.get("entry_routes", [])
        )
        defaults = "、".join(
            wikilink(note_links.get(name, name), display_by_name.get(name, name)) for name in domain.get("default_routes", [])
        )
        lines.append(
            f"| **{esc_cell(domain.get('label'))}** (`{domain_id}`) | {len(by_domain.get(domain_id, []))} | "
            f"`{esc_cell(domain.get('overlap_pressure'))}` | `{esc_cell(domain.get('entry_mode'))}` | "
            f"{entries or '—'} | {defaults or '—'} | {esc_cell(domain.get('selection_rule'))} |"
        )

    lines.extend(
        [
            "",
            "## 11 域能力输入 → 输出",
            "",
            "| 能力域 | 接收输入 | 转换逻辑 | 合法输出 | 完成门 |",
            "|---|---|---|---|---|",
        ]
    )
    for domain in routing_domains:
        capability = domain.get("capability_contract", {})
        inputs = "；".join(str(value) for value in capability.get("input", []))
        outputs = "；".join(str(value) for value in capability.get("output", []))
        lines.append(
            f"| **{esc_cell(domain.get('label'))}** | {esc_cell(inputs)} | {esc_cell(capability.get('transform'))} | "
            f"{esc_cell(outputs)} | {esc_cell(capability.get('completion_gate'))} |"
        )

    lines.extend(
        [
        "",
        "## 8 个横向控制面",
        "",
        "| 顺序 | 控制面 | 必须回答的问题 |",
        "|---:|---|---|",
        ]
    )
    for plane in control_planes:
        lines.append(
            f"| {esc_cell(plane.get('order'))} | **{esc_cell(plane.get('label'))}** (`{esc_cell(plane.get('id'))}`) | "
            f"{esc_cell(plane.get('gate'))} |"
        )

    lines.extend([
        "",
        "## 路由状态分布",
        "",
        "| 状态 | 数量 | 含义 |",
        "|---|---:|---|",
    ])
    definitions = registry.get("status_definitions", {})
    for status, count in sorted(by_status.items(), key=lambda item: STATUS_ORDER.get(item[0], 99)):
        lines.append(f"| {STATUS_LABELS.get(status, status)} (`{status}`) | {count} | {esc_cell(definitions.get(status, ''))} |")

    lines.extend(["", "## 真实使用证据", "", "| Skill | 记录数 | 最高验证 | 平均分 | 结果 |", "|---|---:|---|---:|---|"])
    if evidence_skills:
        for name, value in evidence_skills:
            outcomes = ", ".join(f"{key}:{count}" for key, count in sorted(value["outcomes"].items()))
            average = value["average"] if value["average"] is not None else "—"
            skill_label = wikilink(note_links.get(name, name), display_by_name.get(name, name))
            lines.append(f"| {skill_label} | {value['count']} | `{value['highest']}` | {average} | {esc_cell(outcomes)} |")
    else:
        lines.append("| — | 0 | — | — | — |")

    lines.extend(["", "## 同名分叉", "", "| 名称 | 家族 | 路由状态 | 入口 |", "|---|---|---|---|"])
    for item in sorted(duplicates, key=lambda value: str(value.get("name", ""))):
        item_name = str(item.get("name", ""))
        entries = "; ".join(
            f"`{entry.get('qualified_id')}` · {entry.get('source')}"
            for entry in item.get("entries", [])
        )
        lines.append(
            f"| {wikilink(note_links.get(item_name, item_name), display_by_name.get(item_name, item_name))} | `{esc_cell(item.get('family'))}` | "
            f"`{esc_cell(item.get('routing_status'))}` | {entries} |"
        )

    lines.extend(["", "## 零证据候选台", "", "这些 Skill 不是低价值结论，只是尚未获得真实使用证据，不能自动晋级。", "", "| Skill | 家族 | 当前状态 |", "|---|---|---|"])
    for item in sorted(candidates, key=lambda value: (str(value.get("family", "")), str(value.get("name", "")))):
        item_name = str(item.get("name", ""))
        lines.append(f"| {wikilink(note_links.get(item_name, item_name), display_by_name.get(item_name, item_name))} | `{esc_cell(item.get('family'))}` | `{esc_cell(item.get('routing_status'))}` |")

    lines.extend(["", "## 已归档与旧路由", "", "| Skill | 家族 | 状态 | 备注 |", "|---|---|---|---|"])
    for item in archived:
        item_name = str(item["name"])
        lines.append(
            f"| {wikilink(note_links.get(item_name, item_name), display_by_name.get(item_name, item_name))} | `{esc_cell(item['family'])}` | "
            f"`{esc_cell(item['routing_status'])}` | {esc_cell(item['notes'])} |"
        )

    lines.extend(["", "## 全量家族路由", ""])
    for family in sorted(by_family):
        family_skills = sorted(
            by_family[family],
            key=lambda item: (STATUS_ORDER.get(str(item.get("routing_status")), 99), str(item.get("name", ""))),
        )
        lines.extend(
            [
                f"### {family}",
                "",
                "| Skill | 路由状态 | 证据 | 来源 | 备注 |",
                "|---|---|---:|---|---|",
            ]
        )
        for item in family_skills:
            item_name = str(item.get("name", ""))
            entries = item.get("entries", [])
            sources = ", ".join(sorted({str(entry.get("source", "")) for entry in entries}))
            evidence_count = int(item.get("evidence_count") or 0)
            lines.append(
                f"| {wikilink(note_links.get(item_name, item_name), display_by_name.get(item_name, item_name))} | `{esc_cell(item.get('routing_status'))}` | "
                f"{evidence_count} | {esc_cell(sources)} | {esc_cell(item.get('notes', ''))} |"
            )
        lines.append("")

    lines.extend(
        [
            "## 同步说明",
            "",
            "- 权威源：Codex `skill-governance` 注册表、覆盖规则、家族路由与证据账本。",
            "- Obsidian：只读展示层；文件由同步脚本原子重建。",
            "- 同步策略：源状态哈希不变时不重写，避免无意义的 Obsidian/Git 变更。",
            "- 更新范围：新增、归档、状态、家族、重复组和证据计数。",
            "",
        ]
    )
    return "\n".join(lines)


def node(key: str, *, x: int, y: int, width: int, height: int, text: str, color: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {
        "id": stable_id(f"node:{key}"),
        "type": "text",
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "text": text,
    }
    if color:
        value["color"] = color
    return value


def edge(key: str, source: str, target: str, *, from_side: str, to_side: str, label: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {
        "id": stable_id(f"edge:{key}"),
        "fromNode": stable_id(f"node:{source}"),
        "fromSide": from_side,
        "toNode": stable_id(f"node:{target}"),
        "toSide": to_side,
        "toEnd": "arrow",
    }
    if label:
        value["label"] = label
    return value


def render_canvas(
    registry: dict[str, Any],
    overrides: dict[str, Any],
    evidence: dict[str, dict[str, Any]],
    digest: str,
    generated_at: str,
    dashboard_relative_path: str,
    note_links: dict[str, Path],
) -> str:
    skills = list(registry.get("skills", []))
    skill_by_name = {str(item.get("name", "")): item for item in skills}
    display_by_name = {
        name: str(item.get("display_name_zh") or name) for name, item in skill_by_name.items()
    }
    active_names = {str(item.get("name", "")) for item in skills}
    archived = archived_entries(overrides, active_names)
    summary = registry.get("summary", {})
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in skills:
        by_domain[str(item.get("routing_domain") or "unmapped")].append(item)
    routing_domains = sorted(registry.get("routing_domains", []), key=lambda item: int(item.get("order", 999)))
    control_planes = sorted(registry.get("control_planes", []), key=lambda item: int(item.get("order", 999)))
    duplicates = [item for item in skills if item.get("duplicate_kind") not in {None, "none"}]
    candidates = [item for item in skills if item.get("routing_status") in {"candidate", "unassessed"} and int(item.get("evidence_count") or 0) == 0]

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    center_key = "center"
    nodes.append(
        node(
            center_key,
            x=-260,
            y=-150,
            width=520,
            height=300,
            color="6",
            text=(
                "# Codex Skill 路由\n\n"
                f"**{summary.get('entry_count', len(skills))}** 个活跃入口 · "
                f"**{len(routing_domains)}** 个能力域 · **{len(control_planes)}** 个控制面\n\n"
                f"证据记录 **{sum(item['count'] for item in evidence.values())}** · "
                f"同名分叉 **{summary.get('divergent_duplicate_groups', len(duplicates))}**\n\n"
                f"`{generated_at}`\n`{digest[:16]}`"
            ),
        )
    )

    dashboard_key = "dashboard"
    dashboard_node = {
        "id": stable_id(f"node:{dashboard_key}"),
        "type": "file",
        "x": -210,
        "y": 230,
        "width": 420,
        "height": 260,
        "file": dashboard_relative_path,
    }
    nodes.append(dashboard_node)
    edges.append(edge("center-dashboard", center_key, dashboard_key, from_side="bottom", to_side="top", label="全量表"))

    evidence_key = "evidence"
    evidence_lines = []
    for name, value in sorted(evidence.items(), key=lambda item: (-int(item[1]["count"]), item[0]))[:12]:
        evidence_lines.append(f"- {wikilink(note_links.get(name, name), display_by_name.get(name, name))} · {value['count']} · {value['highest']} · {value['average'] or '—'}")
    nodes.append(
        node(
            evidence_key,
            x=-260,
            y=-660,
            width=520,
            height=max(240, 100 + len(evidence_lines) * 28),
            color="4",
            text="# 真实使用证据\n\n" + ("\n".join(evidence_lines) if evidence_lines else "暂无"),
        )
    )
    edges.append(edge("center-evidence", center_key, evidence_key, from_side="top", to_side="bottom", label="真实反馈"))

    duplicate_key = "duplicates"
    duplicate_lines = [
        f"- {wikilink(note_links.get(str(item.get('name', '')), str(item.get('name', ''))), display_by_name.get(str(item.get('name', '')), str(item.get('name', ''))))} · {len(item.get('entries', []))} 个来源"
        for item in sorted(duplicates, key=lambda value: str(value.get("name", "")))
    ]
    nodes.append(
        node(
            duplicate_key,
            x=420,
            y=-560,
            width=390,
            height=max(210, 100 + len(duplicate_lines) * 30),
            color="2",
            text="# 同名分叉\n\n" + ("\n".join(duplicate_lines) if duplicate_lines else "无"),
        )
    )
    edges.append(edge("center-duplicates", center_key, duplicate_key, from_side="right", to_side="left", label="需选择来源"))

    candidate_key = "candidates"
    candidate_lines = [
        f"- {wikilink(note_links.get(str(item.get('name', '')), str(item.get('name', ''))), display_by_name.get(str(item.get('name', '')), str(item.get('name', ''))))}"
        for item in sorted(candidates, key=lambda value: str(value.get("name", "")))
    ]
    nodes.append(
        node(
            candidate_key,
            x=420,
            y=-80,
            width=390,
            height=max(230, 100 + len(candidate_lines) * 27),
            color="3",
            text="# 零证据候选台\n\n" + ("\n".join(candidate_lines) if candidate_lines else "无"),
        )
    )
    edges.append(edge("center-candidates", center_key, candidate_key, from_side="right", to_side="left", label="等待真实任务"))

    archived_key = "archived"
    archived_lines = [
        f"- {wikilink(note_links.get(str(item['name']), str(item['name'])), str(item['name']))} · {STATUS_LABELS.get(item['routing_status'], item['routing_status'])}"
        for item in archived
    ]
    nodes.append(
        node(
            archived_key,
            x=420,
            y=500,
            width=390,
            height=max(230, 100 + len(archived_lines) * 27),
            color="1",
            text="# 已归档 / 不可用\n\n" + ("\n".join(archived_lines) if archived_lines else "无"),
        )
    )
    edges.append(edge("center-archived", center_key, archived_key, from_side="right", to_side="left", label="可逆退出"))

    control_key = "control-planes"
    control_lines = [f"{item.get('order')}. **{item.get('label')}**" for item in control_planes]
    nodes.append(
        node(
            control_key,
            x=-260,
            y=580,
            width=520,
            height=max(300, 90 + len(control_lines) * 32),
            color="5",
            text="# 8 个横向控制面\n\n" + "\n".join(control_lines),
        )
    )
    edges.append(edge("center-controls", center_key, control_key, from_side="bottom", to_side="top", label="逐层过门"))

    left_domains = routing_domains[::2]
    right_domains = routing_domains[1::2]

    def add_domain_column(domains: list[dict[str, Any]], x: int, side: str) -> None:
        y = -900
        for domain in domains:
            domain_id = str(domain.get("id", "unmapped"))
            domain_key = f"domain:{domain_id}"
            domain_skills = by_domain.get(domain_id, [])
            entry_lines = [
                wikilink(note_links.get(name, name), display_by_name.get(name, name)) for name in domain.get("entry_routes", [])
            ]
            default_lines = [
                wikilink(note_links.get(name, name), display_by_name.get(name, name)) for name in domain.get("default_routes", [])
            ]
            capability = domain.get("capability_contract", {})
            input_summary = "；".join(str(value) for value in capability.get("input", [])[:2])
            output_summary = "；".join(str(value) for value in capability.get("output", [])[:2])
            text = (
                f"# {domain.get('order')}. {domain.get('label')}\n\n"
                f"**{len(domain_skills)}** 个 Skill · `{domain.get('entry_mode')}` · 重叠 `{domain.get('overlap_pressure')}`\n\n"
                f"入口：{'、'.join(entry_lines)}\n\n"
                f"默认：{'、'.join(default_lines)}\n\n"
                f"输入：{input_summary}\n\n"
                f"输出：{output_summary}"
            )
            height = max(330, 265 + (len(entry_lines) + len(default_lines)) * 25)
            nodes.append(
                node(
                    domain_key,
                    x=x,
                    y=y,
                    width=470,
                    height=height,
                    color=str(((int(domain.get("order", 1)) - 1) % 6) + 1),
                    text=text,
                )
            )
            edges.append(
                edge(
                    f"center-{domain_key}",
                    center_key,
                    domain_key,
                    from_side=side,
                    to_side="right" if side == "left" else "left",
                )
            )
            y += height + 90

    add_domain_column(left_domains, -1050, "left")
    add_domain_column(right_domains, 980, "right")

    canvas = {"nodes": nodes, "edges": edges}
    return json.dumps(canvas, ensure_ascii=False, indent=2) + "\n"


def validate_canvas(raw: str) -> None:
    canvas = json.loads(raw)
    nodes = canvas.get("nodes", [])
    edges = canvas.get("edges", [])
    all_ids = [item.get("id") for item in nodes + edges]
    if None in all_ids or len(all_ids) != len(set(all_ids)):
        raise ValueError("Canvas IDs must be present and unique")
    node_ids = {item["id"] for item in nodes}
    for item in nodes:
        if item.get("type") not in {"text", "file", "link", "group"}:
            raise ValueError(f"Invalid node type: {item.get('type')}")
        for key in ("x", "y", "width", "height"):
            if key not in item:
                raise ValueError(f"Node {item['id']} missing {key}")
        if item["type"] == "text" and "text" not in item:
            raise ValueError(f"Text node {item['id']} missing text")
        if item["type"] == "file" and "file" not in item:
            raise ValueError(f"File node {item['id']} missing file")
    for item in edges:
        if item.get("fromNode") not in node_ids or item.get("toNode") not in node_ids:
            raise ValueError(f"Dangling Canvas edge: {item.get('id')}")


def main() -> int:
    args = parse_args()
    sources = [
        args.registry,
        args.overrides,
        REFERENCES / "skill-localization.zh-CN.json",
        args.ledger,
        args.router,
        args.families,
        SCRIPT_PATH,
    ]
    missing = [str(path) for path in sources if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing source files: " + ", ".join(missing))
    if not args.vault.is_dir() or not (args.vault / ".obsidian").exists():
        raise FileNotFoundError(f"Not an Obsidian vault: {args.vault}")

    registry = read_json(args.registry)
    overrides = read_json(args.overrides)
    ledger_rows = read_ledger(args.ledger)
    evidence = evidence_summary(ledger_rows)
    evidence_rows = evidence_rows_by_skill(ledger_rows)
    digest = source_hash(sources)
    generated_at = datetime.now(timezone.utc).isoformat()

    output_root = args.vault / args.output_dir
    dashboard_path = output_root / "Codex Skill 路由总览.md"
    canvas_path = output_root / "Codex Skill 路由思维导图.canvas"
    base_path = output_root / BASE_FILE_NAME
    changelog_path = output_root / CHANGELOG_FILE_NAME
    details_root = output_root / DETAILS_DIR_NAME
    state_path = output_root / ".codex-skill-route-sync.json"
    dashboard_relative_path = args.output_dir / dashboard_path.name
    canvas_relative_path = args.output_dir / canvas_path.name
    dashboard_relative = dashboard_relative_path.as_posix()

    registry_skills = list(registry.get("skills", []))
    domain_by_id = {
        str(domain.get("id", "")): domain
        for domain in registry.get("routing_domains", [])
        if str(domain.get("id", ""))
    }
    skill_items: dict[str, dict[str, Any]] = {
        str(item.get("name", "")): item for item in registry_skills if str(item.get("name", ""))
    }
    for archived in archived_entries(overrides, set(skill_items)):
        skill_items.setdefault(
            str(archived["name"]),
            {
                "name": archived["name"],
                "family": archived["family"],
                "routing_status": archived["routing_status"],
                "discovery_status": "archived",
                "classification_status": "classified",
                "source_of_truth_qualified_id": archived["name"],
                "duplicate_kind": "none",
                "notes": archived["notes"],
                "entries": [],
            },
        )
    note_links = {
        name: skill_note_relative(args.output_dir, item)
        for name, item in skill_items.items()
    }
    expected_detail_files = {
        str((details_root / note_links[name].name).resolve()) for name in note_links
    }

    prior_state: dict[str, Any] = {}
    if state_path.exists():
        try:
            prior_state = read_json(state_path)
        except (json.JSONDecodeError, OSError):
            prior_state = {}
    semantic_snapshot = build_semantic_snapshot(skill_items, evidence)
    capability_snapshot = build_capability_snapshot(registry)
    if (
        not args.force
        and prior_state.get("schema_version") == 2
        and prior_state.get("source_state_hash") == digest
        and dashboard_path.exists()
        and canvas_path.exists()
        and base_path.exists()
        and changelog_path.exists()
        and expected_detail_files
        and all(Path(path).is_file() for path in expected_detail_files)
    ):
        print(json.dumps({"status": "unchanged", "source_state_hash": digest, "output_dir": str(output_root)}, ensure_ascii=False))
        return 0

    markdown = render_markdown(registry, overrides, evidence, digest, generated_at, note_links)
    canvas = render_canvas(registry, overrides, evidence, digest, generated_at, dashboard_relative, note_links)
    base = render_base(args.output_dir)
    history = prior_state.get("change_history", [])
    if not isinstance(history, list):
        history = []
    for event in history:
        event_changes = event.get("changes", []) if isinstance(event, dict) else []
        if (
            isinstance(event_changes, list)
            and len(event_changes) >= len(skill_items)
            and all(
                "`None`" in change and ("能力域" in change or "域内角色" in change)
                for change in event_changes
            )
        ):
            event["changes"] = [f"为全部 {len(skill_items)} 个 Skill 建立业务能力域和域内角色映射。"]
    changes = semantic_changes(prior_state.get("semantic_snapshot", {}), semantic_snapshot)
    changes.extend(capability_changes(prior_state.get("capability_snapshot", {}), capability_snapshot))
    if changes:
        history.append({"at": generated_at, "changes": changes})
    history = history[-50:]
    changelog = render_changelog(history, digest, generated_at)
    validate_canvas(canvas)
    json.loads(canvas)

    atomic_write(dashboard_path, markdown)
    atomic_write(canvas_path, canvas)
    atomic_write(base_path, base)
    atomic_write(changelog_path, changelog)
    details_root.mkdir(parents=True, exist_ok=True)
    written_detail_files: list[str] = []
    for name, item in sorted(skill_items.items()):
        detail_path = details_root / note_links[name].name
        detail = render_skill_note(
            item,
            domain_by_id.get(str(item.get("routing_domain") or ""), {}),
            evidence_rows.get(name, []),
            evidence.get(name),
            digest,
            generated_at,
            registry.get("generated_at"),
            dashboard_relative_path,
            canvas_relative_path,
        )
        atomic_write(detail_path, detail)
        written_detail_files.append(str(detail_path.resolve()))

    previous_detail_files = prior_state.get("detail_files", [])
    if isinstance(previous_detail_files, list):
        expected = {Path(path).resolve() for path in written_detail_files}
        details_root_resolved = details_root.resolve()
        for raw_path in previous_detail_files:
            stale = Path(str(raw_path)).resolve()
            if stale in expected or stale.parent != details_root_resolved:
                continue
            if stale.is_file():
                stale.unlink()

    state = {
        "schema_version": 2,
        "generated_at": generated_at,
        "source_state_hash": digest,
        "registry_generated_at": registry.get("generated_at"),
        "output_files": [dashboard_path.name, canvas_path.name, base_path.name, changelog_path.name],
        "detail_files": written_detail_files,
        "detail_count": len(written_detail_files),
        "source_files": [str(path) for path in sources],
        "semantic_snapshot": semantic_snapshot,
        "capability_snapshot": capability_snapshot,
        "change_history": history,
    }
    atomic_write(state_path, json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "updated",
                "source_state_hash": digest,
                "output_dir": str(output_root),
                "dashboard": str(dashboard_path),
                "canvas": str(canvas_path),
                "base": str(base_path),
                "changelog": str(changelog_path),
                "skill_count": len(registry.get("skills", [])),
                "detail_count": len(written_detail_files),
                "evidence_count": len(ledger_rows),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
