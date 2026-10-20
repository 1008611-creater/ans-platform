# -*- coding: utf-8 -*-
"""Day1：五模型同题实测（真数据）——统一 Prompt、单轮、禁工具、每模型 3 次采样"""
import json, os, re, sys, time
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests

V = os.path.dirname(os.path.abspath(__file__))
KEY = None
for line in open(os.path.expanduser("~/.codex/secrets/siliconflow.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("SILICONFLOW_API_KEY="): KEY = line.split("=", 1)[1].strip()

NEED = "我想把家里宠物的照片做成一个 3D 打印纪念手办，需要一份能直接交给制作方的完整需求"
PROMPT = f"""你是 ANS 平台上的提示词工程师。下面是一段真实需求：

「{NEED}」

请输出两段：
1) 一条可直接复用、带变量占位的提示词（写清角色、约束、输出格式）；
2) 用你刚写的这条提示词，给出一次真实执行结果。

限制：全文不超过 400 字；不许调用任何工具；不许向我提问。"""

MODELS = [
    ("DeepSeek V4.1 Flash", "deepseek-ai/DeepSeek-V4.1-Flash"),
    ("GLM-5.3", "zai-org/GLM-5.3"),
    ("Kimi K2.7", "moonshotai/Kimi-K2.7-Code"),
    ("Qwen3.8-27B", "Qwen/Qwen3.8-27B"),
    ("Hunyuan Hy4", "tencent/Hy4-preview"),
]
SAMPLES = 3
OUT = os.path.join(V, "raw.json")

def call(model, prompt):
    t0 = time.time()
    r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                      headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                      json={"model": model, "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 2000, "stream": False},
                      timeout=300)
    dt = time.time() - t0
    if r.status_code != 200:
        return {"error": r.status_code, "body": r.text[:300], "latency": round(dt, 1)}
    d = r.json()
    ch = d["choices"][0]
    return {"content": ch["message"]["content"], "finish": ch.get("finish_reason"),
            "usage": d.get("usage"), "latency": round(dt, 1)}

def checks(text):
    n = len(re.sub(r"\s", "", text or ""))
    q = bool(re.search(r"(请告诉我|你能提供|能否提供|需要你确认|请问你|麻烦你提供)", text or "")) or bool(re.search(r"[^。！？\n]\?\s*$", text or ""))
    has1 = bool(re.search(r"^\s*1[).、]", text or "", re.M))
    has2 = bool(re.search(r"^\s*2[).、]", text or "", re.M))
    return {"chars_nospace": n, "over_400": n > 400, "asked_question": q, "sections": int(has1) + int(has2)}

res = []
# 断点续跑：已有 raw.json 就跳过已完成的采样
if os.path.exists(OUT):
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
        res = prev.get("results", [])
        print("续跑：已有", len(res), "条")
    except Exception:
        res = []
done = {(r["model"], r["sample"]) for r in res if "content" in r}

def persist():
    json.dump({"need": NEED, "prompt": PROMPT, "models": MODELS, "samples": SAMPLES, "results": res},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

for label, mid in MODELS:
    for i in range(SAMPLES):
        if (mid, i + 1) in done:
            continue
        r = call(mid, PROMPT)
        rec = {"label": label, "model": mid, "sample": i + 1, **r}
        if "content" in r:
            rec.update(checks(r["content"]))
        res.append(rec)
        persist()   # 每次调用后立刻落盘，避免再丢数据
        st = "%5.1fs" % r.get("latency", 0)
        print(f"  {label:<18} #{i+1} {st} " + ("OK %d字" % rec.get("chars_nospace", 0) if "content" in r else "FAIL " + str(r.get("error"))), flush=True)
        time.sleep(1)

persist()
ok = [r for r in res if "content" in r]
print(f"\n完成 {len(ok)}/{len(res)} 次采样 → {OUT}")
if ok:
    print("字数：min %d / 中位 %d / max %d" % (min(r["chars_nospace"] for r in ok),
          sorted(r["chars_nospace"] for r in ok)[len(ok)//2], max(r["chars_nospace"] for r in ok)))
    print("超 400 字:", sum(1 for r in ok if r["over_400"]), "｜ 违反禁止提问:", sum(1 for r in ok if r["asked_question"]))
