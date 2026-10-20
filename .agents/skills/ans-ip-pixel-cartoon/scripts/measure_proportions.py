# -*- coding: utf-8 -*-
"""比例自检：头宽/身高、最宽处高度、最宽处是否在头部（内容包围盒，不含归一化留白）
用法: python measure_proportions.py <帧目录或 glob>
目标: 头宽/身高 0.85-0.95（正面帧）｜ 最宽处在 0.30-0.55 ｜ 最宽处在头部
注意: 带道具的帧（爆米花/电脑/木牌）会让最宽处下移，属正常，单独判断。
"""
import sys, glob
import numpy as np
from PIL import Image


def metrics(path):
    a = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3] > 40
    ys = np.where(a.any(axis=1))[0]; xs = np.where(a.any(axis=0))[0]
    m = a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
    H, W = m.shape
    w = m.sum(axis=1).astype(float)
    return round(w.max() / H, 2), round(int(np.argmax(w)) / (H - 1), 2), bool(np.argmax(w) < H * 0.6)


if __name__ == "__main__":
    pat = sys.argv[1] if len(sys.argv) > 1 else "assets/dino-frames/idle/*.png"
    files = sorted(glob.glob(pat))
    if not files:
        print("没有匹配的帧：", pat); sys.exit(1)
    rs = [metrics(f) for f in files]
    hh = float(np.median([r[0] for r in rs]))
    wa = float(np.median([r[1] for r in rs]))
    inh = sum(1 for r in rs if r[2])
    print(f"{len(files)} 帧 ｜ 头宽/身高 {hh:.2f}（目标 0.85-0.95）｜ 最宽处高度 {wa:.2f}（目标 0.30-0.55）"
          f"｜ 最宽处在头部 {inh}/{len(files)}（带道具帧可不下移）")
