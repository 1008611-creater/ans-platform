# -*- coding: utf-8 -*-
"""量化 Day2 机制：提示词被改胖了多少 → 交付端发生了什么"""
import json, os, re
V = r"E:\codex\ans\docs\bilibili-ans-launch\video"
R1 = json.load(open(os.path.join(V, "day1", "raw.json"), encoding="utf-8"))
R2 = json.load(open(os.path.join(V, "day2", "raw2.json"), encoding="utf-8"))
S1 = json.load(open(os.path.join(V, "day1", "scores.json"), encoding="utf-8"))
S2 = json.load(open(os.path.join(V, "day2", "scores2.json"), encoding="utf-8"))
BL = json.load(open(os.path.join(V, "day2", "blind_both.json"), encoding="utf-8"))["scores"]
def n(t): return len(re.sub(r"\s", "", t or ""))

WRAP = 120   # 重考指令包裹的字数（用于估算「改进版提示词」净长度）
rows = []
for r in S2["ranking"]:
    lab = r["label"]
    ret = next((x for x in R2["results"] if x.get("label") == lab and x.get("stage") == "retest" and "content" in x), None)
    d1 = next((x for x in S1["ranking"] if x["label"] == lab), {})
    improved = max(0, n(ret.get("prompt_sent", "")) - WRAP) if ret else 0
    b = BL.get(lab, {})
    rows.append({
        "label": lab, "day1": d1.get("total", 0), "day2": r["total"],
        "day1_chars": d1.get("note", "") and int(re.search(r"字数 中位 (\d+)", d1["note"]).group(1)) if re.search(r"字数 中位 (\d+)", d1.get("note", "")) else 0,
        "improved_chars": improved, "day2_chars": r.get("chars", 0),
        "blind_d1": b.get("D1"), "blind_d2": b.get("D2"),
        "obj_d1": d1.get("total", 0) - (b.get("D1") or 0), "obj_d2": r["total"] - (b.get("D2") or 0),
        "harsh": r.get("harsh", ""), "reviewed_by": r.get("reviewed_by", ""),
        "refused": bool(re.search(r"(无法原样|不能原样|无法在|需放宽|无法同时)", ret["content"] if ret else "")),
    })
rows.sort(key=lambda x: -x["day1"])
avg_imp = sum(r["improved_chars"] for r in rows) / max(1, len(rows))
avg_d1c = sum(r["day1_chars"] for r in rows) / max(1, len(rows))
avg_d2c = sum(r["day2_chars"] for r in rows) / max(1, len(rows))
s2 = dict(S2); s2["rows"] = rows
s2["stats"] = {"avg_improved_chars": round(avg_imp), "avg_day1_chars": round(avg_d1c),
                "avg_day2_chars": round(avg_d2c), "refused": sum(1 for r in rows if r["refused"]),
                "up": 0, "down": len(rows)}
json.dump(s2, open(os.path.join(V, "day2", "scores2.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("模型                Day1 → Day2 ｜ Day1字数 改进版提示词 交付字数 ｜ 盲评 D1→D2 ｜ 拒绝交付")
for r in rows:
    print("  %-20s %3d → %3d ｜ %5d %8d %8d ｜ %2s→%2s ｜ %s" % (
        r["label"], r["day1"], r["day2"], r["day1_chars"], r["improved_chars"], r["day2_chars"],
        str(r["blind_d1"]), str(r["blind_d2"]), "是" if r["refused"] else ""))
print("\n均值：Day1 输出 %d 字 → 改进版提示词 %d 字 → Day2 交付 %d 字 ｜ 拒绝交付 %d/5" % (
    round(avg_d1c), round(avg_imp), round(avg_d2c), s2["stats"]["refused"]))
