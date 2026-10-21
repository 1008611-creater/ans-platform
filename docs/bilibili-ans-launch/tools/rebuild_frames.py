# -*- coding: utf-8 -*-
"""从已入库的图集重建帧素材（MP4 不入库，但图集入库，所以帧可无损重建）"""
import os
from PIL import Image

WT = r"E:\\codex\\ans-worktrees\\bili-rebuild-20261021"
A = os.path.join(WT, "docs", "bilibili-ans-launch", "assets")
def slice_atlas(src, cell, outdir):
    os.makedirs(outdir, exist_ok=True)
    im = Image.open(src).convert("RGBA")
    n = 0
    for r in range(8):
        for c in range(8):
            box = (c * cell, r * cell, (c + 1) * cell, (r + 1) * cell)
            cell_im = im.crop(box)
            name = "%02d.png" % (r * 8 + c + 1)
            cell_im.save(os.path.join(outdir, name))
            n += 1
    return n, im.size

n1, s1 = slice_atlas(os.path.join(WT, "public", "mascot", "pixel", "dino-atlas.png"), 128, os.path.join(A, "dino-grid"))
n2, s2 = slice_atlas(os.path.join(WT, "public", "mascot", "pixel", "dino-atlas@2x.png"), 256, os.path.join(A, "dino-grid2"))
print("dino-grid: %d 帧（源 %s）｜ dino-grid2: %d 帧（源 %s）" % (n1, s1, n2, s2))
for d in ("dino-grid", "dino-grid2"):
    p = os.path.join(A, d)
    fs = sorted(os.listdir(p))
    print(" ", d, "文件数", len(fs), "首/尾", fs[0], fs[-1])
