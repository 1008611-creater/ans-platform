from __future__ import annotations

import re
import sys
from pathlib import Path


REQUIRED_MARKERS = (
    "no_promotion",
    "project",
    "domain",
    "global",
    "machine_gate",
    "RC-WEB-UI",
    "RC-AI-VIDEO",
    "RC-TRANSIENT",
    "structural | integrated | real_delivery",
    "未授权且未执行的副作用",
    "不得因沉淀自动启动付费生成",
    "3–5 次真实第二遍修复",
    "建立观察机制不等于完成 3–5 次真实观察",
)

FORBIDDEN_ASSIGNMENTS = (
    r"(?i)password\s*[:=]\s*\S+",
    r"(?i)api[_-]?key\s*[:=]\s*\S+",
    r"(?i)authorization\s*[:=]\s*bearer\s+\S+",
    r"(?i)ssh[_-]?private[_-]?key\s*[:=]\s*\S+",
)

SCENARIO_EXPECTATIONS = {
    "RC-WEB-UI": (
        "promotion_decision=machine_gate",
        "权威 owner 是当前项目网站 Skill",
        "不得修改 AI 视频全局 Skill",
        "不得自动部署生产",
    ),
    "RC-AI-VIDEO": (
        "promotion_decision=domain",
        "权威 owner 是对应 AI 视频专业 Skill",
        "不得因沉淀自动重新付费生成",
        "不得晋级全局默认",
    ),
    "RC-TRANSIENT": (
        "promotion_decision=no_promotion",
        "权威 owner 为空",
        "不得创建永久 Skill 规则、重启服务或切换 Provider",
    ),
}

SCENARIO_ROUTES = {
    "RC-WEB-UI": {
        "promotion_decision": "machine_gate",
        "authority_owner": "current_project_website_skill",
        "side_effects_allowed": False,
    },
    "RC-AI-VIDEO": {
        "promotion_decision": "domain",
        "authority_owner": "ai_video_specialist_skill",
        "side_effects_allowed": False,
    },
    "RC-TRANSIENT": {
        "promotion_decision": "no_promotion",
        "authority_owner": None,
        "side_effects_allowed": False,
    },
}


def section(text: str, heading: str) -> str:
    match = re.search(
        rf"^### {re.escape(heading)}\s*$([\s\S]*?)(?=^### |\Z)",
        text,
        flags=re.MULTILINE,
    )
    return match.group(1) if match else ""


def validate(reference: Path, skill: Path) -> list[str]:
    errors: list[str] = []
    reference_text = reference.read_text(encoding="utf-8")
    skill_text = skill.read_text(encoding="utf-8")

    for marker in REQUIRED_MARKERS:
        if marker not in reference_text:
            errors.append(f"reference missing marker: {marker}")

    if "references/repair-compounding-promotion.md" not in skill_text:
        errors.append("SKILL.md does not route to the canonical reference")

    for trigger in ("第二遍修好的经验", "不要只留在聊天里", "下次不要再犯"):
        if trigger not in skill_text:
            errors.append(f"SKILL.md frontmatter/body missing trigger: {trigger}")

    for pattern in FORBIDDEN_ASSIGNMENTS:
        if re.search(pattern, reference_text) or re.search(pattern, skill_text):
            errors.append(f"possible credential assignment matched: {pattern}")

    if reference_text.count("## 2. 可复制提示词") != 1:
        errors.append("canonical prompt section must appear exactly once")

    for scenario, expectations in SCENARIO_EXPECTATIONS.items():
        scenario_text = section(reference_text, scenario)
        if not scenario_text:
            errors.append(f"scenario section missing: {scenario}")
            continue
        for expectation in expectations:
            if expectation not in scenario_text:
                errors.append(f"{scenario} missing expectation: {expectation}")

    return errors


def main() -> int:
    skill_root = Path(__file__).resolve().parents[1]
    reference = skill_root / "references" / "repair-compounding-promotion.md"
    skill = skill_root / "SKILL.md"
    errors = validate(reference, skill)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Repair compounding contract is valid.")
    for scenario, route in SCENARIO_ROUTES.items():
        print(
            f"{scenario}: decision={route['promotion_decision']} "
            f"owner={route['authority_owner']} "
            f"side_effects_allowed={route['side_effects_allowed']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
