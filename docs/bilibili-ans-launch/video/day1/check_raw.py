# -*- coding: utf-8 -*-
import json, os, collections
V = r"E:\codex\ans\docs\bilibili-ans-launch\video"
raw = json.load(open(os.path.join(V, "raw.json"), encoding="utf-8"))
ok = [r for r in raw["results"] if "content" in r]
bad = [r for r in raw["results"] if "content" not in r]
print("总记录", len(raw["results"]), "｜ 成功", len(ok), "｜ 失败", len(bad))
c = collections.Counter(r["label"] for r in ok)
for k, v in c.items(): print("  %-20s %d 次" % (k, v))
for b in bad: print("  失败:", b["label"], "#%d" % b["sample"], b.get("error") or b.get("body", "")[:80])
