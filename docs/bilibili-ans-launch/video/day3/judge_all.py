# -*- coding: utf-8 -*-
"""三期同台盲评：Day1 / Day2 / Day3 的十五份答案放进同一次盲评（同一把尺子）"""
import json, os, re, sys
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests
V = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(V, "..", "day1")))
from scoring import KEY, JUDGE  # noqa

R1 = json.load(open(os.path.join(V, "..", "day1", "raw.json"), encoding="utf-8"))
R2 = json.load(open(os.path.join(V, "..", "day2", "raw2.json"), encoding="utf-8"))
R3 = json.load(open(os.path.join(V, "raw3.json"), encoding="utf-8"))
OUT = os.path.join(V, "blind_all.json")

labels = []
for r in R1["results"]:
    if r.get("label") and r["label"] not in labels: labels.append(r["label"])

def med(entries, lab):
    rs = sorted([r for r in entries if r.get("label") == lab and "content" in r], key=lambda x: x["sample"])
    return rs[len(rs) // 2]["content"] if rs else ""

def rt(entries, lab):
    rs = [r for r in entries if r.get("label") == lab and r.get("stage") == "retest" and "content" in r]
    return rs[0]["content"] if rs else ""

alias = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸","子","丑","寅","卯","辰"]
items, mapping, k = [], {}, 0
for lab in labels:
    for tag, txt in (("D1", med(R1["results"], lab)), ("D2", rt(R2["results"], lab)), ("D3", rt(R3["results"], lab))):
        if not txt: continue
        items.append(f"【{alias[k]}】\n{txt[:700]}")
        mapping[alias[k]] = [lab, tag]
        k += 1
sysmsg = ("你是严格的评测裁判。下面是 15 份匿名答案（甲~辰），全部回答同一个题目、同一套限制（提示词 + 执行结果两段，全文 ≤400 字）。"
          "请按「能否直接拿来用」给每份打 0-20 分（整数），**必须放在同一把尺子上横向比较**：两段齐全、能直接复制、结构清晰的高分；"
          "缺段、废话多、含糊、超字数的低分。只输出 JSON（形如 {\"甲\": 12}），不要解释。")
r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                  headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                  json={"model": JUDGE, "messages": [{"role": "system", "content": sysmsg},
                                                      {"role": "user", "content": "\n\n".join(items)}],
                        "max_tokens": 900, "stream": False}, timeout=600)
txt = r.json()["choices"][0]["message"]["content"]
m = re.search(r"\{.*\}", txt, re.S)
scores = json.loads(m.group(0)) if m else {}
out = {}
for a, (lab, tag) in mapping.items():
    out.setdefault(lab, {})[tag] = int(scores.get(a, -1))
json.dump({"judge": JUDGE, "mapping": mapping, "scores": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("同台盲评（15 份）：")
for lab, v in out.items():
    print("  %-20s D1 %2s ｜ D2 %2s ｜ D3 %2s" % (lab, v.get("D1"), v.get("D2"), v.get("D3")))
print("→", OUT)
