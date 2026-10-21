# -*- coding: utf-8 -*-
"""探测可用 LLM 通路（SiliconFlow / Volcengine ARK），列出可跑的模型"""
import json, os, sys
sys.path.insert(0, __import__("os").environ.get("ANS_TTS_LIBS", r"E:\codex\.tools\tts-libs"))
import requests

def env(path, key):
    p = os.path.expanduser(path)
    if not os.path.exists(p): return None
    for line in open(p, encoding="utf-8", errors="ignore"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return None

sf_key = env("~/.codex/secrets/siliconflow.env", "SILICONFLOW_API_KEY")
ark_key = env("~/.codex/secrets/volcengine.env", "ARK_API_KEY") or env("~/.codex/secrets/volcengine.env", "VOLC_ARK_API_KEY")
print("SiliconFlow key:", "有" if sf_key else "无", "｜ ARK key:", "有" if ark_key else "无")

if sf_key:
    try:
        r = requests.get("https://api.siliconflow.cn/v1/models", headers={"Authorization": "Bearer " + sf_key}, timeout=30)
        d = r.json()
        ids = [m["id"] for m in d.get("data", [])]
        print("SiliconFlow 模型数:", len(ids))
        # 挑出适合做题的对话模型
        cands = [i for i in ids if any(k in i.lower() for k in ["deepseek", "qwen", "glm", "kimi", "minimax", "internlm", "yi-"])]
        for i in sorted(cands)[:25]:
            print("   ", i)
    except Exception as e:
        print("SiliconFlow 失败:", e)

if ark_key:
    for url in ["https://ark.cn-beijing.volces.com/api/v3/models"]:
        try:
            r = requests.get(url, headers={"Authorization": "Bearer " + ark_key}, timeout=20)
            print("ARK:", r.status_code, r.text[:200])
        except Exception as e:
            print("ARK 失败:", e)
