# -*- coding: utf-8 -*-
"""Day4 实验：第三条路——允许模型给专业默认值，但必须标注「建议值」

与 Day3 的区别只在评审规则：
- 保留 ≤180 字预算；
- 明确要求：允许（且鼓励）为外行补专业默认值，但必须写成「建议：xxx」；
- 仍然不许反问用户。
参赛模型沿用数据完整的 4 个（Kimi 接口在 Day3 连续失败，已剔除并标注）。
"""
import json, os, re, sys, time
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests

V = os.path.dirname(os.path.abspath(__file__))
KEY = None
for line in open(os.path.expanduser("~/.codex/secrets/siliconflow.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("SILICONFLOW_API_KEY="): KEY = line.split("=", 1)[1].strip()

D1 = json.load(open(os.path.join(V, "..", "day1", "raw.json"), encoding="utf-8"))
OUT = os.path.join(V, "raw4.json")
DROP = {"Kimi K2.7"}     # Day3 接口连续失败，按「宁少不假」剔除

def median_of(label):
    rs = sorted([r for r in D1["results"] if r.get("label") == label and "content" in r], key=lambda x: x["sample"])
    return rs[len(rs) // 2]["content"] if rs else ""

def split_prompt(text):
    m = re.split(r"(执行结果|运行结果|输出示例|示例输出|2[)）、]|二、)", text, maxsplit=1)
    body = m[0] if m else text
    return re.sub(r"^[\s\S]{0,40}?(提示词|Prompt)[：:]?", "", body, count=1).strip()[:1400]

order, seen = [], set()
for r in D1["results"]:
    lab = r.get("label")
    if lab and lab not in seen and lab not in DROP:
        seen.add(lab); order.append((lab, r["model"]))
print("参赛:", [o[0] for o in order], "（已剔除", DROP, "）", flush=True)

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
    json.dump({"models": order, "dropped": sorted(DROP), "results": results},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

n = len(order)
for i, (label, mid) in enumerate(order):
    peer_label, peer_mid = order[(i + 1) % n]
    own = split_prompt(median_of(label))
    if (label, "review") not in done:
        p1 = f"""你是严格的提示词评审员。下面这条提示词用于解决这条真实需求：

需求：「{D1['need']}」

别人的提示词：
{own}

请改进它。两条硬要求：
1）**字数预算**：改进后的提示词必须 ≤180 字（因为最终交付「提示词 + 一次执行结果」总字数上限是 400 字）；
2）**策略要求**：普通宠物主人给不出公差、壁厚、涂装这些专业参数，所以**允许并为外行补上专业默认值，但每处默认值必须写成「建议：xxx」**，让制作方能直接报价；仍然不许反过来问用户。

请只输出：1) 一句话指出原提示词最致命的问题；2) 改进后的提示词（≤180 字）。"""
        r1 = call(peer_mid, p1)
        results.append({"label": label, "peer": peer_label, "model": mid, "peer_model": peer_mid,
                        "stage": "review", "prompt_sent": own, **r1}); persist()
        print(f"  [评审] {peer_label} 改 {label}  {r1.get('latency')}s " + ("OK" if "content" in r1 else "FAIL"), flush=True)
        time.sleep(1)
    if (label, "retest") not in done:
        rv = [r for r in results if r.get("label") == label and r.get("stage") == "review" and "content" in r]
        if rv:
            improved = rv[-1]["content"]
            p2 = f"""下面是你同事帮你改进后的提示词。

需求：「{D1['need']}」

改进后的提示词：
{improved}

请输出两段（与第一轮完全一致，便于公平对比）：
1) 原样给出这条改进后的提示词（作为最终版）；
2) 用它完成上面的需求，给出一次真实执行结果。

限制：全文不超过 400 字；不许调用任何工具；不许向我提问。"""
            r2 = call(mid, p2)
            results.append({"label": label, "model": mid, "stage": "retest", "prompt_sent": improved, **r2}); persist()
            print(f"  [重考] {label}  {r2.get('latency')}s " + ("OK" if "content" in r2 else "FAIL"), flush=True)
            time.sleep(1)

print("\n完成，记录数:", len([r for r in results if 'content' in r]), "→", OUT, flush=True)
