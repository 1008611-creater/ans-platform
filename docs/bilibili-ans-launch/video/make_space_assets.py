# -*- coding: utf-8 -*-
"""B站空间横幅 1920x280 + 头像方形版"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
V = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, V)
from engine import G1, G2, sprite, MINT, CREAM, NAVY, NAVY_2, PINK, GOLD, dots_overlay, bg_gradient

W, H = 1920, 280
canvas = dots_overlay(bg_gradient(NAVY, NAVY_2, (W, H))).convert("RGBA")
d = ImageDraw.Draw(canvas)
def F(s, b=True): return ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc" if b else "C:/Windows/Fonts/msyh.ttc", s)
# 左侧文字
d.text((80, 62), "大肥鱼在ANS当运营", font=F(72), fill=CREAM)
d.text((84, 168), "ANS 家的大小姐 · 一只像素恐龙替她干活", font=F(38, False), fill=(170, 205, 235))
# 右侧恐龙群
xs = [1400, 1560, 1720]
for i, (row, col) in enumerate([(0, 0), (4, 2), (7, 0)]):
    im = sprite(G1, row, col, 220)
    canvas.alpha_composite(im, (xs[i], H - im.height - 12))
# 品牌线
d.rectangle([80, 236, 560, 244], fill=MINT)
out = os.path.join(V, "out", "space-banner-1920x280.png")
canvas.convert("RGB").save(out)
print("横幅 ->", out)

# 正方形头像（B站头像用 1024，居中留白）
av = Image.new("RGBA", (1024, 1024), (11, 16, 32, 255))
av = dots_overlay(bg_gradient(NAVY, NAVY_2, (1024, 1024))).convert("RGBA")
im = sprite(G1, 4, 2, 760)     # 大笑
av.alpha_composite(im, ((1024 - im.width) // 2, (1024 - im.height) // 2 + 40))
d2 = ImageDraw.Draw(av)
d2.text((60, 60), "ANS", font=F(64), fill=MINT)
d2.text((60, 140), "大肥鱼", font=F(48), fill=CREAM)
o2 = os.path.join(V, "out", "avatar-space-1024.png")
av.convert("RGB").save(o2)
print("头像 ->", o2)
