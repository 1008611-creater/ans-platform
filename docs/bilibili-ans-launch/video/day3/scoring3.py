# -*- coding: utf-8 -*-
"""Day3 客观项评分（与 Day1/Day2 完全同口径），盲评由 judge_all.py 同台补齐"""
import json, os, re, sys
V = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(V, "..", "day1")))
from scoring import has_var, has_constraint, has_format, has_prompt_part, has_exec_part  # noqa

def n(t): return len(re.sub(r"\s", "", t or ""))
def over400(t): return n(t) > 400
def asked(t): return bool(re.search(r"(请告诉我|你能提供|能否提供|需要你确认|请问你|麻烦你提供)", t or ""))

def score_one(text):
    c = n(text)
    return {
        "完成度": max(0, 25 - (0 if has_prompt_part(text) else 8) - (0 if has_exec_part(text) else 10) - (0 if c >= 150 else 7)),
        "结构化": (5 if has_var(text) else 0) + (5 if has_constraint(text) else 0) + (5 if has_format(text) else 0),
        "可执行性": (6 if has_prompt_part(text) else 0) + (8 if has_var(text) else 0) + (6 if has_exec_part(text) else 0) + (5 if c >= 150 else 0),
        "事实与服从": max(0, 15 - (5 if over400(text) else 0) - (5 if asked(text) else 0)),
    }

def main():
    R3 = json.load(open(os.path.join(V, "raw3.json"), encoding="utf-8"))
    S1 = json.load(open(os.path.join(V, "..", "day1", "scores.json"), encoding="utf-8"))
    S2 = json.load(open(os.path.join(V, "..", "day2", "scores2.json"), encoding="utf-8"))
    BL = {}
    bp = os.path.join(V, "blind_all.json")
    if os.path.exists(bp): BL = json.load(open(bp, encoding="utf-8")).get("scores", {})

    d1 = {r["label"]: r for r in S1["ranking"]}
    d2 = {r["label"]: r for r in S2["ranking"]}
    retests = [r for r in R3["results"] if r.get("stage") == "retest" and "content" in r]
    reviews = [r for r in R3["results"] if r.get("stage") == "review" and "content" in r]
    rows = []
    for r in retests:
        lab = r["label"]
        s = score_one(r["content"])
        b = BL.get(lab, {}).get("D3")
        s["盲评"] = 12 if b is None else max(0, min(20, int(b)))
        total = sum(s.values())
        rev = next((x["content"] for x in reviews if x["label"] == lab), "")
        improved = max(0, n(r.get("prompt_sent", "")) - 120)
        rows.append({"label": lab, "model": r["model"], **s, "total": total,
                      "day1": d1.get(lab, {}).get("total", 0), "day2": d2.get(lab, {}).get("total", 0),
                      "day3": total, "improved_chars3": improved, "chars": n(r["content"]),
                      "over400": over400(r["content"]),
                      "blind_d1": BL.get(lab, {}).get("D1"), "blind_d2": BL.get(lab, {}).get("D2"), "blind_d3": b,
                      "reviewed_by": r.get("peer", ""), "review_excerpt": rev[:160]})
    rows.sort(key=lambda x: -x["day1"])
    avg = lambda k: round(sum(r[k] for r in rows) / max(1, len(rows)))
    out = {"rubric": S1["rubric"], "need": S1["need"], "ranking": rows,
           "stats": {"avg_day1": avg("day1"), "avg_day2": avg("day2"), "avg_day3": avg("day3"),
                      "avg_improved3": avg("improved_chars3"), "over400_3": sum(1 for r in rows if r["over400"])},
           "raw_ref": "day3/raw3.json"}
    json.dump(out, open(os.path.join(V, "scores3.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("=== Day3（把约束交给评审）===")
    for r in rows:
        print("  %-20s D1 %3d → D2 %3d → D3 %3d ｜ 改进版提示词 %4d 字 ｜ 交付 %4d 字 ｜ 盲评 %s→%s→%s" % (
            r["label"], r["day1"], r["day2"], r["day3"], r["improved_chars3"], r["chars"],
            r["blind_d1"], r["blind_d2"], r["blind_d3"]))
    print("  均值：Day1 %d → Day2 %d → Day3 %d ｜ Day3 改进版提示词均值 %d 字 ｜ 超字数 %d/5" % (
        out["stats"]["avg_day1"], out["stats"]["avg_day2"], out["stats"]["avg_day3"],
        out["stats"]["avg_improved3"], out["stats"]["over400_3"]))

if __name__ == "__main__":
    main()
