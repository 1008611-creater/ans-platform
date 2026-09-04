import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "references" / "route-registry.json"


def validate_champion_cards(path, official, errors):
    if not path.is_file():
        errors.append("missing project AGENTS.md for champion-card validation")
        return

    text = path.read_text(encoding="utf-8")
    heading = "### 冠军判断卡"
    start = text.find(heading)
    if start < 0:
        errors.append("project AGENTS.md lacks champion judgment cards")
        return
    end = text.find("\n## ", start + len(heading))
    cards = text[start:] if end < 0 else text[start:end]
    headers = ["不可替代的判断能力", "必经工作段", "合格出口", "典型误用"]
    missing_headers = [header for header in headers if header not in cards]
    if missing_headers:
        errors.append("champion-card columns missing: " + ", ".join(missing_headers))

    for skill_id in sorted(official):
        row_prefix = f"| `{skill_id}` |"
        row = next((line for line in cards.splitlines() if line.startswith(row_prefix)), None)
        if row is None:
            errors.append("champion card missing for: " + skill_id)
        elif row.count("|") < 6:
            errors.append("champion card is incomplete for: " + skill_id)


def validate_original_start_policy(path, skills, errors):
    if not path.is_file():
        return

    agents_text = path.read_text(encoding="utf-8")
    required_agents_markers = [
        "### 原创短剧启动反确认门",
        "不得先让用户确认一句核心问题",
        "知识卡筛选框 -> 编剧三套完整候选 -> 知识卡审计 -> 用户选择",
    ]
    missing_agents_markers = [marker for marker in required_agents_markers if marker not in agents_text]
    if missing_agents_markers:
        errors.append("original-start policy missing from project AGENTS.md")

    required_skill_markers = {
        "knowledge-card-skill": "原创启动筛选框",
        "screenwriter": "三套完整候选方案",
    }
    for skill_id, marker in required_skill_markers.items():
        skill_text = Path(skills[skill_id]["path"]).read_text(encoding="utf-8")
        if marker not in skill_text:
            errors.append(f"original-start policy missing from: {skill_id}")


def main():
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    errors = []
    warnings = [item["id"] for item in data["warnings"]]
    skills = {item["id"]: item for item in data["skills"]}
    listed = [skill_id for directory in data["directories"] for skill_id in directory["skill_ids"]]

    if len(listed) != len(set(listed)):
        errors.append("a skill appears in more than one directory")
    if set(listed) != set(skills):
        errors.append("directory entries and skill registry differ")

    for skill in skills.values():
        if not Path(skill["path"]).is_file():
            errors.append(f"missing skill path: {skill['id']}")

    official = {item["id"] for item in skills.values() if item["route_status"] == "official_chain"}
    direct = {item["id"] for item in skills.values() if item["direct_route"]}
    contractual = set(data["champion_contract"])
    approval_list = set(data["approval_required_skills"])
    approval_status = {item["id"] for item in skills.values() if item["route_status"] == "approval_required"}

    if official != direct:
        errors.append("official-chain and direct-route Skill sets differ")
    if official != contractual:
        errors.append("champion contract and official-chain Skill sets differ")
    if len(official) != 5:
        errors.append("official chain must contain exactly five Skills")
    if approval_list != approval_status:
        errors.append("approval-required Skill list and statuses differ")
    if len(approval_list) != 15:
        errors.append("approval-required Skill list must contain exactly fifteen Skills")
    for skill_id in sorted(approval_list):
        skill_text = Path(skills[skill_id]["path"]).read_text(encoding="utf-8")
        if "路由权限" not in skill_text or "明确批准" not in skill_text:
            errors.append("approval gate missing from: " + skill_id)

    router = Path(data["router_path"])
    if not router.is_file():
        errors.append("missing total router")
    else:
        router_text = router.read_text(encoding="utf-8")
        missing = sorted(skill_id for skill_id in official if f"`{skill_id}`" not in router_text)
        if missing:
            errors.append("official-chain IDs missing from route guard: " + ", ".join(missing))
        if "必须先获得用户对具体 Skill 的明确批准" not in router_text:
            errors.append("route guard lacks explicit approval requirement")

    project_agents = Path(data["project_agents_path"])
    validate_champion_cards(project_agents, official, errors)
    validate_original_start_policy(project_agents, skills, errors)

    result = {
        "errors": errors,
        "warnings": warnings,
        "skills": len(skills),
        "official_chain_skills": len(official),
        "approval_required_skills": len(approval_list),
    }
    print(json.dumps(result, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
