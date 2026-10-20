# -*- coding: utf-8 -*-
"""同一帧的 4 种像素处理对比（都放大到同样的显示尺寸）"""
import os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
OUT = os.path.join(A, "_pixel_options.png")

f = sorted(glob.glob(os.path.join(A, "dino-grid", "*.png")))[18]   # 敲键盘（细节多）
im = Image.open(f).convert("RGBA")
al = np.asarray(im)[:, :, 3] > 40
ys = np.where(al.any(1))[0]; xs = np.where(al.any(0))[0]
src = im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
print("源内容尺寸:", src.size)

def snap(im, art_h, colors=None, up=2):
    r = art_h / im.height
    s = im.resize((max(1, round(im.width * r)), art_h), Image.Resampling.BOX)
    a = np.array(s); a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    s = Image.fromarray(a, "RGBA")
    if colors:
        rgb = s.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")
        rgb.putalpha(s.getchannel("A")); s = rgb
    return s.resize((s.width * up, s.height * up), Image.Resampling.NEAREST)

opts = [
    ("A 旧·LANCZOS 缩到256", im.resize((int(src.width*256/src.height), 256), Image.Resampling.LANCZOS), (255, 140, 140)),
    ("B 原生像素 NEAREST×2·原色", src.resize((src.width*2, src.height*2), Image.Resampling.NEAREST), (120, 240, 180)),
    ("C 原生网ba120·20色·×2", snap(src, 120, 20, 2), (150, 200, 255)),
    ("D 粗像素 72·16色·×3", snap(src, 72, 16, 3), (255, 210, 120)),
]
cellw, cellh = 620, 620
canvas = Image.new("RGB", (cellw * 2 + 60, cellh * 2 + 130), (11, 16, 32))
d = ImageDraw.Draw(canvas); fnt = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 26)
for i, (label, img, col) in enumerate(opts):
    r = min((cellw - 40) / img.width, (cellh - 40) / img.height)
    show = img.resize((int(img.width * r), int(img.height * r)), Image.Resampling.NEAREST)
    x = 20 + (i % 2) * (cellw + 20); y = 50 + (i // 2) * (cellh + 30)
    canvas.paste(show.convert("RGB"), (x + (cellw - show.width) // 2 - 20, y), show)
    d.text((x, y - 30), label, font=fnt, fill=col)
canvas.save(OUT)
print("options ->", OUT)
