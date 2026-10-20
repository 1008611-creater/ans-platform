# -*- coding: utf-8 -*-
import os, re
T = r"E:\codex\ans\docs\bilibili-ans-launch\tools"
G = r"E:\codex\ans\docs\bilibili-ans-launch\assets\gen"
src = open(os.path.join(T, "sprite_frames.py"), encoding="utf-8").read()
block = src[src.find("SETS = ["):]
block = block[:block.find("\n]")]
names = list(dict.fromkeys(re.findall(r'"(dino[^"]+\.png)"', block)))
miss = 0
for n in names:
    ok = os.path.exists(os.path.join(G, n))
    if not ok: miss += 1
    print(("OK   " if ok else "MISS "), n)
print("缺失:", miss)
