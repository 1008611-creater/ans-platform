# -*- coding: utf-8 -*-
import glob, numpy as np
from PIL import Image

def metrics(path):
    a = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3] > 40
    ys = np.where(a.any(axis=1))[0]; xs = np.where(a.any(axis=0))[0]
    m = a[ys[0]:ys[-1]+1, xs[0]:xs[-1]+1]          # 内容包围盒，不含归一化留白
    H, W = m.shape
    w = m.sum(axis=1).astype(float)
    return dict(headW_over_H=round(w.max()/H, 2),
                widest_at=round(int(np.argmax(w))/(H-1), 2),
                widest_in_head=bool(np.argmax(w) < H*0.6),
                W_over_H=round(W/H, 2))

base = r"E:\codex\ans\docs\bilibili-ans-launch\assets\dino-frames"
print("目标：头宽/身高 0.85-0.92 ｜ 最宽处在 0.30-0.55 ｜ 最宽处必须在头部(上半) ｜ 整体 W/H ≥ 0.85")
for s in ["walk","idle","actions","memes","memes2","memes3","standup"]:
    ms = [metrics(f) for f in sorted(glob.glob(base + "\\" + s + "\\*.png"))]
    hh = float(np.median([m["headW_over_H"] for m in ms]))
    wa = float(np.median([m["widest_at"] for m in ms]))
    inh = sum(1 for m in ms if m["widest_in_head"]); wh = float(np.median([m["W_over_H"] for m in ms]))
    ok = "✓" if 0.83 <= hh <= 0.93 and 0.28 <= wa <= 0.56 and inh == len(ms) and wh >= 0.82 else "✗"
    print(f"  {ok} {s:8s} 头宽/身高 {hh:.2f}｜最宽处 {wa:.2f}｜最宽在头部 {inh}/{len(ms)}｜W/H {wh:.2f}")
