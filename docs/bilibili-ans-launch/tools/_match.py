# -*- coding: utf-8 -*-
import os, numpy as np
from PIL import Image

G = r"E:\codex\ans\docs\bilibili-ans-launch\assets\gen"
ATT = {
 "walk":  (r"E:\codex\token\dsh-home\attachments\v1\objects\2a\2af492b4abba0ac375b1e57a1bb3ecc05ebd6e8de510f22f4a77d06f8ec4b857", 8, 26),
 "memes": (r"E:\codex\token\dsh-home\attachments\v1\objects\90\90aa1d2ded60b6bf797e52954acb236005effdea34478f6546fb6ab9841913de", 9, 26),
}


def norm(img, bg):
    a = np.asarray(img.convert("RGB")).astype(int)
    fg = np.abs(a - bg).sum(axis=2) > 55
    ys = np.where(fg.any(axis=1))[0]; xs = np.where(fg.any(axis=0))[0]
    if not len(ys) or not len(xs): return None
    sub = fg[ys[0]:ys[-1]+1, xs[0]:xs[-1]+1]
    m = np.asarray(Image.fromarray((sub*255).astype(np.uint8)).resize((64,64), Image.Resampling.BILINEAR)) > 110
    g = np.asarray(img.convert("L").crop((xs[0], ys[0], xs[-1]+1, ys[-1]+1)).resize((64,64), Image.Resampling.BILINEAR)).astype(float)
    return m, g


def row_frames(path, n, drop_bottom):
    im = Image.open(path).convert("RGB"); W, H = im.size
    im = im.crop((0, 0, W, H - drop_bottom)); W, H = im.size
    bg = np.asarray(im).astype(int)[2, 2]
    out = []
    for i in range(n):
        x0, x1 = int(W*i/n), int(W*(i+1)/n)
        r = norm(im.crop((x0, 0, x1, H)), bg)
        if r: out.append(r)
    return out


def sheet_frames(path, cols, rows):
    im = Image.open(path).convert("RGB"); W, H = im.size
    cw, ch = W//cols, H//rows
    return [r for r in (norm(im.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch)), np.array([255,255,255]))
                        for r in range(rows) for c in range(cols)) if r]


def compare(att, cand):
    n = min(len(att), len(cand))
    ious = [(att[i][0] & cand[i][0]).sum() / max((att[i][0] | cand[i][0]).sum(), 1) for i in range(n)]
    gd = [abs(att[i][1]-cand[i][1]).mean() for i in range(n)]
    return float(np.mean(ious)), float(np.mean(gd))


for label, (path, n, db) in ATT.items():
    att = row_frames(path, n, db)
    print(f"== 权威图 {label}：{len(att)} 格 ==")
    cands = [("dino-anim-walk-2x4.png",2,4), ("dino-chibi-walk-2x4.png",2,4), ("dino2-walk-2x4.png",2,4)] if label == "walk" else \
            [("dino-memes-3x3.png",3,3), ("dino-chibi-memes-3x3.png",3,3), ("dino2-memes-3x3.png",3,3)]
    for fn, c, r in cands:
        p = os.path.join(G, fn)
        if not os.path.exists(p): continue
        io, gd = compare(att, sheet_frames(p, c, r))
        print(f"   {fn:26s} 形状IoU {io:.3f} | 灰度差 {gd:5.1f} -> {'★匹配' if io > 0.75 else '不匹配'}")