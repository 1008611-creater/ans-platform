# -*- coding: utf-8 -*-
"""Day2 实验 A：让五个模型互相改对方的提示词，然后用改后的提示词重考一遍

阶段1（同行评审）：把 M 的 Day1 提示词交给另一个模型 P，要求「挑问题 + 给改进版」
阶段2（重考）：用改进版提示词，让 M 输出真实执行结果
产出：day2/raw2.json（逐条落盘）
"""
import json, os, re, sys, time
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests

V = os.path.dirname(os.path.abspath(__file__))
KEY = None
for line in open(os.path.expanduser("~/.codex/secrets/siliconflow.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("SILICONFLOW_API_KEY="): KEY = line.split("=", 1)[1].strip()

D1 = json.load(open(os.path.join(V, "..", "raw.json"), encoding="utf-8"))
OUT = os.path.join(V, "raw2.json")

def median_of(label):
    rs = sorted([r for r in D1["results"] if r.get("label") == label and "content" in r], key=lambda x: x["sample"])
    return rs[len(rs) // 2]["content"] if rs else ""

def split_prompt(text):
    """取出提示词本体（第一个分段）"""
    m = re.split(r"(执行结果|运行结果|输出示例|示例输出|2[)）、]|二、)", text, maxsplit=1)
    body = m[0] if m else text
    return re.sub(r"^[\s\S]{0,40}?(提示词|Prompt)[：:]?", "", body, count=1).strip()[:1400]

LABELS = [r["label"] for r in D1["results"][:1]] or []
MODELS = [(r["label"], r["model"]) for r in D1["results"]]
seen, order = set(), []
for lab, mid in MODELS:
    if lab not in seen:
        seen.add(lab); order.append((lab, mid))
print("参赛:", [o[0] for o in order], flush=True)

def call(model, prompt, mx=2000):
    t0 = time.time()
    try:
        r = requests.post("https://api.siliconflow.cn/v1/chat/completions",
                          headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                          json={"model": model, "messages": [{"role": "user", "content": prompt}],
                                "max_tokens": mx, "stream": False}, timeout=600)
    except Exception as e:
        return {"error": "exception", "body": str(e)[:200], "latency": round(time.time() - t0, 1)}
    dt = round(time.time() - t0, 1)
    if r.status_code != 200:
        return {"error": r.status_code, "body": r.text[:200], "latency": dt}
    ch = r.json()["choices"][0]
    return {"content": ch["message"]["content"], "finish": ch.get("finish_reason"), "latency": dt}

results = []
if os.path.exists(OUT):
    try: results = json.load(open(OUT, encoding="utf-8"))["results"]
    except Exception: results = []
done = {(r["label"], r["stage"]) for r in results if "content" in r}

def persist():
    json.dump({"models": order, "results": results}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

n = len(order)
for i, (label, mid) in enumerate(order):
    peer_label, peer_mid = order[(i + 1) % n]          # 互相改：A 改 B 的，B 改 C 的……
    own = split_prompt(median_of(label))
    # 阶段1：同行评审
    if (label, "review") not in done:
        p1 = f"""这是另一个 AI 写的提示词，用来解决下面这条真实需求：

需求：「{D1['need']}」

别人的提示词：
{own}

请你以严格评审员的身份：1) 指出它最致命的两个问题（各一句话）；2) 给出一条改进后的完整提示词（可直接复用、带变量占位）。
只输出这两部分，不要客套。"""
        r1 = call(peer_mid, p1)
        rec = {"label": label, "peer": peer_label, "model": mid, "peer_model": peer_mid, "stage": "review", "prompt_sent": own, **r1}
        results.append(rec); persist()
        print(f"  [评审] {peer_label} 改 {label}  {r1.get('latency')}s " + ("OK" if "content" in r1 else "FAIL"), flush=True)
        time.sleep(1)
    # 阶段2：用改进版重考
    if (label, "retest") not in done:
        rv = [r for r in results if r.get("label") == label and r.get("stage") == "review" and "content" in r]
        if rv:
            improved = rv[-1]["content"]
            p2 = f"""请直接使用下面这条提示词，完成它描述的任务，并给出一次真实执行结果。

提示词：
{improved}

限制：全文不超过 400 字；不许调用任何工具；不许向我提问。"""
            r2 = call(mid, p2)
            rec2 = {"label": label, "model": mid, "stage": "retest", "prompt_sent": improved, **r2}
            results.append(rec2); persist()
            print(f"  [重考] {label}  {r2.get('latency')}s " + ("OK" if "content" in r2 else "FAIL"), flush=True)
            time.sleep(1)

print("\n完成，记录数:", len([r for r in results if 'content' in r]), "→", OUT, flush=True)
