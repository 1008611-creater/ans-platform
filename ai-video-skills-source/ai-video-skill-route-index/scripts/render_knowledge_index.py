import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "references" / "route-registry.json"


def table(rows, headers):
    output = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    output.extend("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join(output)


def main():
    output_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "AI视频Skill路由索引.md"
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    skills = {item["id"]: item for item in data["skills"]}
    total = len(skills)
    lines = [
        "# AI视频 Skill 路由索引",
        "",
        f"> 最后更新：{data['updated_at']}；基于当前本机 Skill 路由扫描，共 {total} 个登记条目。",
        "",
        "---",
        "",
        "## 目录总览",
        "",
    ]
    overview = []
    for directory in data["directories"]:
        overview.append([directory["id"], f"`{directory['name']}`", directory["purpose"], str(len(directory["skill_ids"]))])
    lines.extend([table(overview, ["编号", "目录", "用途", "文件数"]), "", f"**合计：{total} 个条目**"])

    for directory in data["directories"]:
        lines.extend(["", "---", "", f"## {directory['name']}（{directory['purpose']}）— {len(directory['skill_ids'])} 文件", ""])
        rows = []
        for skill_id in directory["skill_ids"]:
            skill = skills[skill_id]
            labels = {
                "official_chain": "正式主链",
                "approval_required": "需用户明确批准",
                "contract": "交接契约",
                "index": "索引工具",
            }
            status = labels.get(skill["route_status"], skill["route_status"])
            rows.append([f"`{skill_id}`", f"{skill['summary']}（{status}）"])
        lines.append(table(rows, ["文件", "核心主题"]))

    lines.extend(["", "---", "", "## 跨目录关联索引", "", "### 主题聚类", ""])
    for relation in data["relationships"]:
        members = " / ".join(f"`{item}`" for item in relation["members"])
        lines.append(f"- **{relation['topic']}**：{members} -> {relation['flow']}")

    lines.extend(["", "### 已知路由告警", ""])
    lines.append(table([[f"`{item['id']}`", item["message"]] for item in data["warnings"]], ["告警", "说明"]))

    lines.extend(["", "---", "", "## 统计", ""])
    stats = [[f"{directory['id']}_{directory['name']}", str(len(directory["skill_ids"]))] for directory in data["directories"]]
    stats.append(["正式主链 Skill 数", str(sum(item["route_status"] == "official_chain" for item in skills.values()))])
    stats.append(["需用户批准 Skill 数", str(len(data["approval_required_skills"]))])
    stats.append(["冠军契约 Skill 数", str(len(data["champion_contract"]))])
    stats.append(["使用证据记录数", str(sum(len(item["usage_records"]) for item in skills.values()))])
    stats.append(["全站总计", str(total)])
    lines.extend([table(stats, ["指标", "数值"]), ""])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
