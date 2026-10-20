# -*- coding: utf-8 -*-
"""同台盲评：Day1 与 Day2 的十份答案放进同一次盲评（解决跨批不可比问题）"""
import json, os, re, sys
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests
V = os.path.dirname(os.path.abspath(__file__))
D1DIR = os.path.join(V, "..", "day1")
sys.path.insert(0, os.path.abspath(D1DIR))
from scoring import KEY, JUDGE  # noqa

R1 = json.load(open(os.path.join(V, "..", "day1", "raw.json"), encoding="utf-8"))
R2 = json.load(open(os.path.join(V, "raw2.json"), encoding="utf-8"))

def median_content(entries, label):
    rs = sorted([r for r in entries if r.get("label") == label and "content" in r], key=lambda x: x["sample"])
    return rs[len(rs) // 2]["content"] if rs else ""

labels = []
for r in R1["results"]:
    if r.get("label") and r["label"] not in labels: labels.append(r["label"])
alias = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
items, mapping = [], {}
k = 0
for lab in labels:
    for tag, entries, keyname in (("D1", R1["results"], "sample"), ("D2", R2["results"], "stage")):
        if tag == "D2":
            rs = [r for r in entries if r.get("label") == lab and r.get("stage") == "retest" and "content" in r]
            txt = rs[0]["content"] if rs else ""
        else:
            txt = median_content(entries, lab)
        if not txt: continue
        items.append(f"【{alias[k]}】\n{txt[:800]}")
        mapping[alias[k]] = (lab, tag)
        k += 1
sysmsg = ("你是严格的评测裁判。下面有 10 份匿名答案（甲~癸），都回答同一个题目、同一套限制。"
          "请按「能否直接拿来用」给每份打 0-20 分（整数），**必须放在同一把尺子上横向比较**："
          "可以直接复制的提示词 + 真实的执行结果，分数高；缺一段、废话多、含糊、超字数的，分数低。"
          "只输出 JSON，形如 {\"甲\": 12, \"乙\": 15}，不要解释。")
r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                  headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                  json={"model": JUDGE, "messages": [{"role": "system", "content": sysmsg},
                                                      {"role": "user", "content": "\n\n".join(items)}],
                        "max_tokens": 800, "stream": False}, timeout=600)
txt = r.json()["choices"][0]["message"]["content"]
m = re.search(r"\{.*\}", txt, re.S)
scores = json.loads(m.group(0)) if m else {}
print("同台盲评结果：")
res = {}
for a, (lab, tag) in mapping.items():
    sc = int(scores.get(a, -1))
    res.setdefault(lab, {})[tag] = sc
    print(f"  {a} = {lab:<20} {tag}  {sc}/20")
json.dump({"judge": JUDGE, "mapping": {a: list(v) for a, v in mapping.items()}, "scores": res},
          open(os.path.join(V, "blind_both.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("→ day2/blind_both.json")
