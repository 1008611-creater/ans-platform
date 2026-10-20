# -*- coding: utf-8 -*-
"""探测像素块大小：像素画在原生网格外被放大过，先找出块边长 k"""
import glob, os
import numpy as np
from PIL import Image
A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"

def detect_k(im, kmax=10):
    a = np.asarray(im.convert("L")).astype(np.float32)
    best, bestk = None, 1
    for k in range(2, kmax + 1):
        h, w = a.shape
        h2, w2 = h - h % k, w - w % k
        small = a[:h2, :w2].reshape(h2 // k, k, w2 // k, k).mean(axis=(1, 3))
        up = np.repeat(np.repeat(small, k, 0), k, 1)
        err = np.abs(up - a[:h2, :w2]).mean()
        if best is None or err < best:
            best, bestk = err, k
    return bestk, best

for f in sorted(glob.glob(os.path.join(A, "dino-grid", "*.png")))[:4]:
    im = Image.open(f).convert("RGBA")
    alpha = np.asarray(im)[:, :, 3] > 40
    ys = np.where(alpha.any(1))[0]; xs = np.where(alpha.any(0))[0]
    im2 = im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
    k, err = detect_k(im2)
    print(f"{os.path.basename(f)}: 内容 {im2.size} 块边长 k={k} (chunk 误差 {err:.2f})")
