# -*- coding: utf-8 -*-
import json, os, sys
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests
key = None
for line in open(os.path.expanduser("~/.codex/secrets/siliconflow.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("SILICONFLOW_API_KEY="): key = line.split("=",1)[1].strip()
r = requests.get("https://api.siliconflow.cn/v1/models", headers={"Authorization": "Bearer " + key}, timeout=30)
ids = sorted(m["id"] for m in r.json().get("data", []))
chat_like = [i for i in ids if not any(x in i.lower() for x in ["image","asr","tts","embedding","rerank","video","audio","speech","lora"])]
print("对话类模型共", len(chat_like))
for i in chat_like: print("  ", i)
