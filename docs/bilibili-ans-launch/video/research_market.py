# -*- coding: utf-8 -*-
"""用 B站公开 API 调研同类赛道：按播放量看什么在起量（真实数据）"""
import json, sys, time, urllib.parse
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
from http.cookiejar import CookieJar
import requests

S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
})
try:
    S.get("https://www.bilibili.com/", timeout=15)
except Exception as e:
    print("bootstrap:", e)

def search(kw, order="click", page=1):
    url = "https://api.bilibili.com/x/web-interface/search/type"
    params = {"search_type": "video", "keyword": kw, "order": order, "page": page}
    r = S.get(url, params=params, timeout=20)
    d = r.json()
    if d.get("code") != 0:
        return []
    out = []
    for it in (d.get("data") or {}).get("result") or []:
        if not isinstance(it, dict): continue
        out.append({
            "title": it.get("title", "").replace('<em class="keyword">', "").replace("</em>", ""),
            "play": it.get("play", 0),
            "danmaku": it.get("video_review", 0),
            "dur": it.get("duration", ""),
            "author": it.get("author", ""),
            "date": time.strftime("%Y-%m-%d", time.localtime(it.get("pubdate", 0))),
            "bvid": it.get("bvid", ""),
        })
    return out

KWS = ["AI运营", "AI当UP主", "用AI做视频", "AI虚拟UP主", "agent自动化", "AI 运营 账号"]
rows = []
for kw in KWS:
    got = search(kw, "click")
    print(f"\n【{kw}】按播放量 Top{min(6,len(got))}")
    for v in sorted(got, key=lambda x: -x["play"])[:6]:
        print(f"  {v['play']:>9,} 播放  {v['dur']:>7}  {v['date']}  {v['author'][:12]:<12} {v['title'][:40]}")
        rows.append({"kw": kw, **v})
    time.sleep(1.2)

json.dump(rows, open(r"E:\codex\ans\docs\bilibili-ans-launch\video\research_market.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n样本数:", len(rows))
