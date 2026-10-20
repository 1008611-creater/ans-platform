# -*- coding: utf-8 -*-
"""Day1 评分：客观项程序化打分 + AI 盲评（替代 3 人盲评，公开声明）

维度：完成度 25 / 可执行性 25 / 结构化 15 / 事实与服从 15 / 盲评 20
减分：违反「不许提问」-5、「超 400 字」-5（按方案公开减分项）
"""
import json, os, re, sys
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests

V = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(V, "raw.json")
OUT = os.path.join(V, "scores.json")
KEY = None
for line in open(os.path.expanduser("~/.codex/secrets/siliconflow.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("SILICONFLOW_API_KEY="): KEY = line.split("=", 1)[1].strip()
JUDGE = "deepseek-ai/DeepSeek-V4-Pro"

def has_var(text):     return bool(re.search(r"(\{\{?[^}\n]{1,20}\}?\}|\[[^\]\n]{1,20}\]|<[^>\n]{1,20}>)", text))
def has_constraint(t): return bool(re.search(r"(限制|约束|不许|禁止|必须|不得|最多|不超过)", t))
def has_format(t):     return bool(re.search(r"(输出格式|格式如下|返回|以.{0,6}格式|JSON|Markdown|表格)", t))
def has_prompt_part(t):
    """第一段：提示词本体（兼容 1)/提示词：/Prompt/【提示词】 等写法）"""
    return bool(re.search(r"(提示词|Prompt|prompt|指令)", t)) and bool(re.search(r"^\s*(1[)）、.]|#+\s*1|\*\*1|【1|一、|第一段)", t, re.M)) \
        or bool(re.search(r"(可直接复用|可复用|复制.{0,4}使用)", t))

def has_exec_part(t):
    """第二段：真实执行结果（兼容 2)/执行结果：/示例输出 等写法）"""
    return bool(re.search(r"(执行结果|运行结果|输出示例|示例输出|应用示例|实际执行|执行如下)", t)) \
        or bool(re.search(r"^\s*(2[)）、.]|#+\s*2|\*\*2|【2|二、|第二段)", t, re.M))

def has_two(t):        return has_prompt_part(t) and has_exec_part(t)

def score_one(text, meta):
    n = meta["chars_nospace"]
    s = {}
    # 完成度 25
    # 完成度只看「两段是否交齐 + 是否明显敷衍」，超字数统一在「事实与服从」里扣，避免重复扣分
    c = 25 - (0 if has_prompt_part(text) else 8) - (0 if has_exec_part(text) else 10) - (0 if n >= 150 else 7)
    s["完成度"] = max(0, c)
    # 结构化 15
    s["结构化"] = (5 if has_var(text) else 0) + (5 if has_constraint(text) else 0) + (5 if has_format(text) else 0)
    # 可执行性 25（两段齐全 + 提示词可复制 + 执行结果非空）
    s["可执行性"] = (6 if has_prompt_part(text) else 0) + (8 if has_var(text) else 0) + (6 if has_exec_part(text) else 0) + (5 if n >= 150 else 0)
    # 事实与服从 15
    pen = 0
    if meta["over_400"]: pen += 5
    if meta["asked_question"]: pen += 5
    s["事实与服从"] = max(0, 15 - pen)
    return s

def judge_blind(items):
    """AI 盲评：隐去模型名，给 0-20 分"""
    numbered = "\n\n".join(f"【{k}】\n{v[:900]}" for k, v in items.items())
    sysmsg = ("你是严格的评测裁判。下面有若干份匿名答案（编号），都回答同一个题目。"
              "请按「能否直接拿来用」这一件事给每份打 0-20 分（整数）：越能直接复用、结构越清晰、越少废话分越高；"
              "出现幻觉字段、废话、未按要求分段要扣分。只输出 JSON，形如 {\"甲\": 15, \"乙\": 12}，不要解释。")
    r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                      headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                      json={"model": JUDGE, "messages": [{"role": "system", "content": sysmsg},
                                                          {"role": "user", "content": numbered}],
                            "max_tokens": 600, "stream": False}, timeout=300)
    if r.status_code != 200:
        print("裁判失败:", r.status_code, r.text[:200]); return {}
    txt = r.json()["choices"][0]["message"]["content"]
    m = re.search(r"\{.*\}", txt, re.S)
    try:
        return json.loads(m.group(0)) if m else {}
    except Exception:
        return {}

def main():
    raw = json.load(open(RAW, encoding="utf-8"))
    ok = [r for r in raw["results"] if "content" in r]
    by_model = {}
    for r in ok:
        by_model.setdefault(r["module"] if "module" in r else r["model"], []).append(r)

    labels = {r["model"]: r["label"] for r in ok}
    alias = ["甲", "乙", "丙", "丁", "戊", "己"]
    medians = {}
    for i, (mid, rs) in enumerate(by_model.items()):
        rs_sorted = sorted(rs, key=lambda x: x["sample"])
        medians[mid] = rs_sorted[len(rs_sorted) // 2]        # 取中位次采样
    blind_map = {alias[i]: mid for i, mid in enumerate(medians.keys())}
    blind = judge_blind({alias[i]: medians[mid]["content"] for i, mid in enumerate(medians.keys())})

    ranking = []
    for mid, r in medians.items():
        s = score_one(r["content"], r)
        b = int(blind.get([k for k, v in blind_map.items() if v == mid][0], 12))
        s["盲评"] = max(0, min(20, b))
        total = sum(s.values())
        # 最扎眼的失误
        flaw = []
        if r["over_400"]: flaw.append("字数超了 400（扣 5）")
        if r["asked_question"]: flaw.append("反过来问我问题（扣 5）")
        if not has_var(r["content"]): flaw.append("没写变量占位")
        if not has_prompt_part(r["content"]): flaw.append("没给出提示词本体")
        if not has_exec_part(r["content"]): flaw.append("没给真实执行结果")
        allr = [x for x in by_model[mid]]
        lat = sorted(int(x["latency"]) for x in allr)
        ranking.append({
            "model": mid, "label": labels[mid], **s, "total": total,
            "flaw": "；".join(flaw) if flaw else "无明显失误",
            "note": "耗时 中位 %ds（%d/%d/%ds）｜字数 中位 %d" % (lat[len(lat)//2], lat[0], lat[len(lat)//2], lat[-1],
                    sorted(x["chars_nospace"] for x in allr)[len(allr)//2]),
            "samples": [{"sample": x["sample"], "chars": x["chars_nospace"], "latency": x["latency"],
                          "over_400": x["over_400"], "asked": x["asked_question"]} for x in sorted(allr, key=lambda y: y["sample"])],
        })
    ranking.sort(key=lambda x: -x["total"])
    best = max(by_model.values(), key=lambda rs: len(rs[0]["content"]))[0]
    out = {
        "need": raw["need"], "prompt": raw["prompt"], "judge": JUDGE,
        "rubric": "完成度25 / 可执行性25 / 结构化15 / 事实与服从15 / 盲评20（AI 盲评，替代 3 人盲评，已在视频中声明）",
        "ranking": ranking,
        "raw_excerpt": best["content"][:900],
        "raw_all_ref": "raw.json（站内动态公开）",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("=== Day1 结果 ===")
    for r in ranking:
        print("  %-20s 总分 %3d ｜ 完成%2d 执行%2d 结构%2d 事实%2d 盲评%2d ｜ %s" %
              (r["label"], r["total"], r["完成度"], r["可执行性"], r["结构化"], r["事实与服从"], r["盲评"], r["flaw"]))
    print("→", OUT)
    return 0

if __name__ == "__main__":
    sys.exit(main())
