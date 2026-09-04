import os, json

bases = {
  "workbuddy": r"C:/Users/lsb/.workbuddy/skills",
  "codex": r"C:/Users/lsb/.codex/skills",
  "claude": r"C:/Users/lsb/.claude/skills",
}

def top_with_skill(base):
    out = []
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d)
        if os.path.isdir(p) and not d.startswith('.') and os.path.isfile(os.path.join(p, "SKILL.md")):
            md = os.path.join(p, "SKILL.md")
            name = d
            try:
                with open(md, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read(400)
                m = txt.split("\n")
                # crude name extraction
                nm = d
                for ln in m[:15]:
                    if ln.startswith("name:"):
                        nm = ln.split(":",1)[1].strip()
                        break
                out.append((d, nm))
            except Exception:
                out.append((d, d))
    return out

result = {}
for name, base in bases.items():
    if not os.path.isdir(base):
        result[name] = {"count": 0, "items": []}
        continue
    items = top_with_skill(base)
    result[name] = {"count": len(items), "items": items}

with open(r"C:/Users/lsb/.workbuddy/apps/prompts-chat/_inventory.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

for name, data in result.items():
    print(f"{name}: {data['count']} top-level skills")
