# -*- coding: utf-8 -*-
"""决定性特征：腮红像素占比 + 黑眼珠面积占比 + 像素块大小"""
import os, numpy as np
from PIL import Image
G = r"E:\codex\ans\docs\bilibili-ans-launch\assets\gen"
ATTS = {
 "权威·walk":  r"E:\codex\token\dsh-home\attachments\v1\objects\2a\2af492b4abba0ac375b1e57a1bb3ecc05ebd6e8de510f22f4a77d06f8ec4b857",
 "权威·memes": r"E:\codex\token\dsh-home\attachments\v1\objects\90\90aa1d2ded60b6bf797e52954acb236005effdea34478f6546fb6ab9841913de",
}
CANDS = {
 "dino2-walk(在管线里)": os.path.join(G, "dino2-walk-2x4.png"),
 "dino-chibi-walk(v1)": os.path.join(G, "dino-chibi-walk-2x4.png"),
 "dino2-memes(在管线里)": os.path.join(G, "dino2-memes-3x3.png"),
 "dino-chibi-memes(v1)": os.path.join(G, "dino-chibi-memes-3x3.png"),
 "dino4-idle(新)": os.path.join(G, "dino4-idle-2x4.png"),
}

def stat(path, is_att=False):
    im = Image.open(path).convert("RGB")
    if is_att:  # 去标签
        W, H = im.size; im = im.crop((0, 0, W, H - 26))
    a = np.asarray(im).astype(int)
    bg = a[2, 2]
    fg = np.abs(a - bg).sum(axis=2) > 55
    n = max(fg.sum(), 1)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    blush = fg & (r > 235) & (g > 150) & (g < 205) & (b > 160) & (b < 215) & (r - g > 45)
    dark = fg & (r < 60) & (g < 60) & (b < 80)
    green = fg & (g - r > 15) & (g - b > 5)
    return (round(blush.sum() / n * 100, 2), round(dark.sum() / n * 100, 2), round(green.sum() / n * 100, 1))

print(f"{'文件':26s} 腮红%   黑眼%   薄荷绿%")
for k, p in ATTS.items():
    if os.path.exists(p): print(f"{k:26s} {stat(p, True)[0]:>6} {stat(p, True)[1]:>6} {stat(p, True)[2]:>7}")
for k, p in CANDS.items():
    if os.path.exists(p): print(f"{k:26s} {stat(p)[0]:>6} {stat(p)[1]:>6} {stat(p)[2]:>7}")
