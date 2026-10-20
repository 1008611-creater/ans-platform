# -*- coding: utf-8 -*-
"""看看 Day3「瘦身」后的提示词丢了什么"""
import json, os, re
V = r"E:\codex\ans\docs\bilibili-ans-launch\video"
R3 = json.load(open(os.path.join(V, "day3", "raw3.json"), encoding="utf-8"))
def re_t(lab):
    rs = [r for r in R3["results"] if r.get("label")==lab and r.get("stage")=="retest" and "content" in r]
    return rs[0]["content"] if rs else "（缺失）"
def rev(lab):
    rs = [r for r in R3["results"] if r.get("label")==lab and r.get("stage")=="review" and "content" in r]
    return rs[0]["content"] if rs else ""
print("缺失的模型:", [l for l in ["DeepSeek V4.1 Flash","GLM-5.3","Kimi K2.7","Qwen3.8-27B","Hunyuan Hy4"] if re_t(l).startswith("（缺失")])
for lab in ["GLM-5.3", "DeepSeek V4.1 Flash"]:
    print("="*70)
    print("【%s】评审给出的改进版（前 260 字）：" % lab)
    print(rev(lab)[:260].replace(chr(10), " / "))
    print("--- 重考交付（前 260 字）：")
    print(re_t(lab)[:260].replace(chr(10), " / "))
