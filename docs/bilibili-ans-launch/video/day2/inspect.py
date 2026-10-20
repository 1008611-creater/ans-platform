# -*- coding: utf-8 -*-
import json, os, re
V = r"E:\codex\ans\docs\bilibili-ans-launch\video"
R1 = json.load(open(os.path.join(V, "day1", "raw.json"), encoding="utf-8"))
R2 = json.load(open(os.path.join(V, "day2", "raw2.json"), encoding="utf-8"))
def med(label):
    rs = sorted([r for r in R1["results"] if r.get("label")==label and "content" in r], key=lambda x: x["sample"])
    return rs[len(rs)//2]["content"]
def re_t(label):
    rs = [r for r in R2["results"] if r.get("label")==label and r.get("stage")=="retest" and "content" in r]
    return rs[0]["content"] if rs else ""
def rev(label):
    rs = [r for r in R2["results"] if r.get("label")==label and r.get("stage")=="review" and "content" in r]
    return rs[0]["content"] if rs else ""
for lab in ["GLM-5.3", "DeepSeek V4.1 Flash"]:
    d1, d2 = med(lab), re_t(lab)
    print("="*70)
    print(f"【{lab}】Day1 {len(re.sub(chr(92)+'s','',d1))}字 → Day2 {len(re.sub(chr(92)+'s','',d2))}字")
    print("--- Day1 前 220 字 ---"); print(d1[:220].replace(chr(10)," / "))
    print("--- Day2 前 320 字 ---"); print(d2[:320].replace(chr(10)," / "))
    print("--- 同行的评审意见 前 200 字 ---"); print(rev(lab)[:200].replace(chr(10)," / "))
