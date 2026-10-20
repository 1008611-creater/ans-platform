# -*- coding: utf-8 -*-
"""把 OpenLux 出的白底像素 IP 图抠成透明 PNG（白底 → 透明，保留奶油肚与深蓝描边）
用法: python cutout_white.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
GEN = os.path.join(ASSETS, "gen")


def cut_white(src, out, thr=246, crop=True, feather=0.6):
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    white = (r >= thr) & (g >= thr) & (b >= thr)
    alpha = np.where(white, 0, 255).astype(np.uint8)
    if feather:
        al = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(feather))
        alpha = np.asarray(al)
    res = Image.fromarray(np.dstack([a[:, :, :3].astype(np.uint8), alpha]), "RGBA")
    if crop:
        res = res.crop(res.getbbox())
    res.save(out)
    print("cutout ->", out, res.size)
    return res


if __name__ == "__main__":
    cut_white(os.path.join(GEN, "dino-ip-pixel-1x1.png"), os.path.join(ASSETS, "ans-dino-ip.png"))
    cut_white(os.path.join(GEN, "dino-ip-stickers-2x2.png"), os.path.join(ASSETS, "ans-dino-ip-stickers-transparent.png"))
