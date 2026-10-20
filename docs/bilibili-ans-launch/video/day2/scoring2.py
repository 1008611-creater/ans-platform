# -*- coding: utf-8 -*-
"""Day2 评分：用与 Day1 完全相同的口径给「改进版重考」打分，并对比涨跌"""
import json, os, re, sys
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
D1DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "day1")
sys.path.insert(0, os.path.abspath(D1DIR))
from scoring import has_var, has_constraint, has_format, has_prompt_part, has_exec_part, judge_blind, KEY, JUDGE  # noqa
import requests

V = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(V, "scores2.json")
D1 = json.load(open(os.path.join(V, "..", "day1", "scores.json"), encoding="utf-8"))
R2 = json.load(open(os.path.join(V, "raw2.json"), encoding="utf-8"))

def chars(t): return len(re.sub(r"\s", "", t or ""))

def over400(t): return chars(t) > 400
def asked(t): return bool(re.search(r"(请告诉我|你能提供|能否提供|需要你确认|请问你|麻烦你提供)", t or ""))

def score_one(text):
    n = chars(text)
    s = {}
    s["完成度"] = max(0, 25 - (0 if has_prompt_part(text) else 8) - (0 if has_exec_part(text) else 10) - (0 if n >= 150 else 7))
    s["结构化"] = (5 if has_var(text) else 0) + (5 if has_constraint(text) else 0) + (5 if has_format(text) else 0)
    s["可执行性"] = (6 if has_prompt_part(text) else 0) + (8 if has_var(text) else 0) + (6 if has_exec_part(text) else 0) + (5 if n >= 150 else 0)
    s["事实与服从"] = max(0, 15 - (5 if over400(text) else 0) - (5 if asked(text) else 0))
    return s, n

def main():
    retests = [r for r in R2["results"] if r.get("stage") == "retest" and "content" in r]
    reviews = [r for r in R2["results"] if r.get("stage") == "review" and "content" in r]
    alias = ["甲", "乙", "丙", "丁", "戊", "己"]
    blind_map = {alias[i]: r["label"] for i, r in enumerate(retests)}
    sysmsg = ("你是严格的评测裁判。下面有若干份匿名答案（编号），都回答同一个题目。"
              "请按「能否直接拿来用」给每份打 0-20 分（整数）。只输出 JSON，形如 {\"甲\": 15}，不要解释。")
    numbered = "\n\n".join(f"【{a}】\n{r['content'][:900]}" for a, r in zip(alias, retests))
    blind = {}
    try:
        r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                          headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                          json={"model": JUDGE, "messages": [{"role": "system", "content": sysmsg},
                                                              {"role": "user", "content": numbered}],
                                "max_tokens": 600, "stream": False}, timeout=300)
        m = re.search(r"\{.*\}", r.json()["choices"][0]["message"]["content"], re.S)
        blind = json.loads(m.group(0)) if m else {}
    except Exception as e:
        print("裁判失败:", e)

    d1map = {r["label"]: r["total"] for r in D1["ranking"]}
    rows = []
    for i, r in enumerate(retests):
        s, n = score_one(r["content"])
        s["盲评"] = max(0, min(20, int(blind.get(alias[i], 12))))
        total = sum(s.values())
        prev = d1map.get(r["label"], 0)
        review = next((x["content"] for x in reviews if x["label"] == r["label"]), "")
        # 评审里最狠的一句话
        harsh = ""
        mm = re.findall(r"[^\n。！？]{6,60}[。！？]", review)
        if mm: harsh = sorted(mm, key=lambda x: -len(x))[0][:60]
        rows.append({"label": r["label"], "model": r["model"], **s, "total": total, "day1": prev,
                      "delta": total - prev, "chars": n, "over400": over400(r["content"]),
                      "harsh": harsh, "reviewed_by": r.get("peer", ""), "review_latency": None})
    rows.sort(key=lambda x: -x["total"])
    out = {"judge": JUDGE, "rubric": D1["rubric"], "need": D1["need"], "ranking": rows,
           "up": sum(1 for r in rows if r["delta"] > 0), "down": sum(1 for r in rows if r["delta"] < 0),
           "same": sum(1 for r in rows if r["delta"] == 0),
           "raw_ref": "day2/raw2.json"}
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("=== Day2 结果（互相改提示词之后重考）===")
    for r in rows:
        arrow = "↑" if r["delta"] > 0 else ("↓" if r["delta"] < 0 else "=")
        print("  %-20s Day1 %3d → Day2 %3d  %s%+d ｜ 完成%2d 执行%2d 结构%2d 事实%2d 盲评%2d ｜ %s 改的" %
              (r["label"], r["day1"], r["total"], arrow, r["delta"], r["完成度"], r["可执行性"], r["结构化"],
               r["事实与服从"], r["盲评"], r["reviewed_by"]))
    print("涨 %d ｜ 跌 %d ｜ 持平 %d" % (out["up"], out["down"], out["same"]))
    print("→", OUT)

if __name__ == "__main__":
    main()
