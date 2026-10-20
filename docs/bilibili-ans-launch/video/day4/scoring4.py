# -*- coding: utf-8 -*-
"""Day4 客观项评分（与前三期同口径）"""
import json, os, re, sys
V = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(V, "..", "day1")))
from scoring import has_var, has_constraint, has_format, has_prompt_part, has_exec_part  # noqa

def n(t): return len(re.sub(r"\s", "", t or ""))
def over400(t): return n(t) > 400
def asked(t): return bool(re.search(r"(请告诉我|你能提供|能否提供|需要你确认|请问你|麻烦你提供)", t or ""))
def suggest(t): return len(re.findall(r"建议[:：]", t or ""))

def score_one(text):
    c = n(text)
    return {
        "完成度": max(0, 25 - (0 if has_prompt_part(text) else 8) - (0 if has_exec_part(text) else 10) - (0 if c >= 150 else 7)),
        "结构化": (5 if has_var(text) else 0) + (5 if has_constraint(text) else 0) + (5 if has_format(text) else 0),
        "可执行性": (6 if has_prompt_part(text) else 0) + (8 if has_var(text) else 0) + (6 if has_exec_part(text) else 0) + (5 if c >= 150 else 0),
        "事实与服从": max(0, 15 - (5 if over400(text) else 0) - (5 if asked(text) else 0)),
    }

def main():
    R4 = json.load(open(os.path.join(V, "raw4.json"), encoding="utf-8"))
    S1 = json.load(open(os.path.join(V, "..", "day1", "scores.json"), encoding="utf-8"))
    S3 = json.load(open(os.path.join(V, "..", "day3", "scores3.json"), encoding="utf-8"))
    BL = json.load(open(os.path.join(V, "blind_4.json"), encoding="utf-8")).get("scores", {}) if os.path.exists(os.path.join(V, "blind_4.json")) else {}

    d1 = {r["label"]: r["total"] for r in S1["ranking"]}
    d3 = {r["label"]: r["total"] for r in S3["ranking"]}
    retests = [r for r in R4["results"] if r.get("stage") == "retest" and "content" in r]
    reviews = [r for r in R4["results"] if r.get("stage") == "review" and "content" in r]
    rows = []
    for r in retests:
        lab = r["label"]
        s = score_one(r["content"])
        b = BL.get(lab, {}).get("D4")
        s["盲评"] = 12 if b is None else max(0, min(20, int(b)))
        rows.append({"label": lab, "model": r["model"], **s, "total": sum(s.values()),
                      "day1": d1.get(lab, 0), "day3": d3.get(lab, 0), "day4": sum(s.values()),
                      "improved_chars4": max(0, n(r.get("prompt_sent", "")) - 120),
                      "chars": n(r["content"]), "over400": over400(r["content"]),
                      "suggest_count": suggest(r["content"]),
                      "pending_count": len(re.findall(r"待确认", r["content"])),
                      "blind_d1": BL.get(lab, {}).get("D1"), "blind_d3": BL.get(lab, {}).get("D3"),
                      "blind_d4": b, "reviewed_by": r.get("peer", "")})
    rows.sort(key=lambda x: -x["day1"])
    avg = lambda k: round(sum(r[k] for r in rows) / max(1, len(rows)), 1)
    out = {"ranking": rows, "rubric": S1["rubric"],
           "stats": {"avg_day1": avg("day1"), "avg_day3": avg("day3"), "avg_day4": avg("day4"),
                      "suggest_total": sum(r["suggest_count"] for r in rows),
                      "pending_total": sum(r["pending_count"] for r in rows)}, "raw_ref": "day4/raw4.json"}
    json.dump(out, open(os.path.join(V, "scores4.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("=== Day4（允许「建议值」）===")
    for r in rows:
        print("  %-20s D1 %3d → D3 %3d → D4 %3d ｜ 建议值 %2d 处 ｜ 待确认 %2d 处 ｜ 交付 %3d 字 ｜ 盲评 %s→%s→%s" % (
            r["label"], r["day1"], r["day3"], r["day4"], r["suggest_count"], r["pending_count"], r["chars"],
            r["blind_d1"], r["blind_d3"], r["blind_d4"]))
    print("  均值：Day1 %.1f → Day3 %.1f → Day4 %.1f ｜ 建议值合计 %d 处 ｜ 待确认合计 %d 处" % (
        out["stats"]["avg_day1"], out["stats"]["avg_day3"], out["stats"]["avg_day4"],
        out["stats"]["suggest_total"], out["stats"]["pending_total"]))

if __name__ == "__main__":
    main()
