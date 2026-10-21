# -*- coding: utf-8 -*-
"""B站运营账本：把已发布视频的公开数据抓成可对比的时间序列。

读公开接口，不需要登录（发布才需要凭据）。
用法：
  python ledger.py --bvids BV1xx BV2xx            # 临时指定
  python ledger.py --records ledger/records.json  # 自己账号已发布的视频清单
每次运行追加一条快照到 ledger/ledger.jsonl，并打印与上一条快照的增量。
"""
import argparse, json, os, sys, time
sys.path.insert(0, r"E:\codex\.tools\tts-libs")
import requests

V = os.path.dirname(os.path.abspath(__file__))
LEDGER_DIR = os.path.join(V, "ledger")
LEDGER = os.path.join(LEDGER_DIR, "ledger.jsonl")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36")
HEAD = {"User-Agent": UA, "Referer": "https://www.bilibili.com/"}


def get(url, **params):
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers=HEAD, timeout=20)
            if r.status_code == 200:
                j = r.json()
                if j.get("code") == 0:
                    return j["data"]
                return {"__error__": j.get("code"), "message": j.get("message")}
            time.sleep(1 + attempt)
        except Exception as e:
            if attempt == 2:
                return {"__error__": "exception", "message": str(e)[:120]}
            time.sleep(1 + attempt)
    return None


def video_stat(bvid):
    d = get("https://api.bilibili.com/x/web-interface/view", bvid=bvid)
    if not d or "__error__" in d:
        return {"bvid": bvid, "error": (d or {}).get("message", "unknown")}
    s = d.get("stat", {})
    return {
        "bvid": bvid, "aid": d.get("aid"), "title": d.get("title"),
        "pubdate": d.get("pubdate"), "duration": d.get("duration"),
        "owner": {"mid": d.get("owner", {}).get("mid"), "name": d.get("owner", {}).get("name")},
        "view": s.get("view", 0), "like": s.get("like", 0), "coin": s.get("coin", 0),
        "favorite": s.get("favorite", 0), "reply": s.get("reply", 0),
        "danmaku": s.get("danmaku", 0), "share": s.get("share", 0),
    }


def account_stat(mid):
    d = get("https://api.bilibili.com/x/relation/stat", vmid=mid)
    if not d or "__error__" in d:
        return {}
    return {"follower": d.get("follower", 0), "following": d.get("following", 0)}


def top_comments(aid, limit=8):
    d = get("https://api.bilibili.com/x/v2/reply", type=1, oid=aid, sort=2, ps=20)
    if not d or "__error__" in d or not d.get("replies"):
        return []
    out = []
    for r in d["replies"][:limit]:
        out.append({"user": r.get("member", {}).get("uname"), "like": r.get("like", 0),
                    "text": (r.get("content", {}).get("message") or "")[:120]})
    return out


def previous_totals():
    if not os.path.exists(LEDGER):
        return None
    last = None
    with open(LEDGER, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                last = line
    try:
        return json.loads(last)
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bvids", nargs="*", default=[])
    ap.add_argument("--records", default=None, help="已发布视频清单 JSON：[{bvid, day, title}]")
    ap.add_argument("--comments", action="store_true", help="额外抓最新评论（选题用）")
    ap.add_argument("--label", default="", help="本次快照标签，如 day0-published")
    ap.add_argument("--no-write", action="store_true", help="只打印不写账本（试跑用）")
    a = ap.parse_args()

    items = []
    if a.records and os.path.exists(a.records):
        items = json.load(open(a.records, encoding="utf-8-sig"))  # 容忍记事本加的 BOM
    bvids = [x["bvid"] for x in items] if items else a.bvids
    if not bvids:
        print("没有 bvid：用 --bvids 或 --records 指定", file=sys.stderr)
        return 2

    videos = [video_stat(b) for b in bvids]
    ok = [v for v in videos if "error" not in v]
    mid = next((v["owner"]["mid"] for v in ok if v.get("owner", {}).get("mid")), None)
    account = account_stat(mid) if mid else {}

    snap = {"ts": int(time.time()), "label": a.label, "mid": mid, "account": account,
            "videos": videos, "totals": {}}
    snap["totals"] = {
        "view": sum(v.get("view", 0) for v in ok),
        "like": sum(v.get("like", 0) for v in ok),
        "coin": sum(v.get("coin", 0) for v in ok),
        "favorite": sum(v.get("favorite", 0) for v in ok),
        "reply": sum(v.get("reply", 0) for v in ok),
        "danmaku": sum(v.get("danmaku", 0) for v in ok),
    }
    if a.comments and ok:
        snap["comments_sample"] = {ok[0]["bvid"]: top_comments(ok[0]["aid"])}

    prev = previous_totals()
    print("=== B站运营账本 · %s ===" % (a.label or time.strftime("%Y-%m-%d %H:%M")))
    print("账号 mid %s ｜ 粉丝 %s ｜ 关注 %s" % (mid, account.get("follower", "-"), account.get("following", "-")))
    print("%-14s %-30s %8s %7s %6s %5s %6s %6s" % ("bvid", "标题", "播放", "点赞", "投币", "收藏", "评论", "弹幕"))
    for v in videos:
        if "error" in v:
            print("%-14s 抓取失败: %s" % (v["bvid"], v["error"]))
            continue
        print("%-14s %-30s %8d %7d %6d %5d %6d %6d" % (v["bvid"], (v["title"] or "")[:28], v["view"],
                                                       v["like"], v["coin"], v["favorite"], v["reply"], v["danmaku"]))
    t = snap["totals"]
    print("合计：播放 %d ｜ 点赞 %d ｜ 投币 %d ｜ 收藏 %d ｜ 评论 %d ｜ 弹幕 %d" %
          (t["view"], t["like"], t["coin"], t["favorite"], t["reply"], t["danmaku"]))
    if prev and prev.get("totals"):
        d = {k: t[k] - prev["totals"].get(k, 0) for k in t}
        print("对比上次快照（%s）：播放 %+d ｜ 点赞 %+d ｜ 投币 %+d ｜ 评论 %+d" %
              (time.strftime("%m-%d %H:%M", time.localtime(prev["ts"])), d["view"], d["like"], d["coin"], d["reply"]))
    if snap.get("comments_sample"):
        for bv, cs in snap["comments_sample"].items():
            print("\n最新评论（%s，选题参考）：" % bv)
            for c in cs:
                print("  [%s赞] %s: %s" % (c["like"], c["user"], c["text"]))

    if not a.no_write:
        os.makedirs(LEDGER_DIR, exist_ok=True)
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(json.dumps(snap, ensure_ascii=False) + "\n")
        print("\n已追加快照 → %s" % LEDGER)
    return 0


if __name__ == "__main__":
    sys.exit(main())
