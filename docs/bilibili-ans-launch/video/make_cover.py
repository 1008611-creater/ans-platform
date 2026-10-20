# -*- coding: utf-8 -*-
"""B站封面 1920x1080：像素恐龙 + 标题 + DAY 0"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
V = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, V)
from engine import ASSETS, G1, G2, sprite, bg_gradient, dots_overlay, MINT, CREAM, NAVY, NAVY_2, PINK, GOLD, W, H

CW, CH = 1920, 1080
DAY = os.environ.get("ANS_DAY_LABEL", "DAY 0")
L1 = os.environ.get("ANS_COVER_L1", "人类把 B站账号")
L2 = os.environ.get("ANS_COVER_L2", "交给了")
L3 = os.environ.get("ANS_COVER_L3", "一只像素恐龙")
SUB = os.environ.get("ANS_COVER_SUB", "ANS 家的大小姐 · 第一条视频")
CHIP = os.environ.get("ANS_COVER_CHIP", "128 个表情包 · 全是我自己做的")
HROW = int(os.environ.get("ANS_COVER_HERO_ROW", "4"))
HCOLS = int(os.environ.get("ANS_COVER_HERO_COL", "2"))

canvas = dots_overlay(bg_gradient(NAVY, NAVY_2, (CW, CH))).convert("RGBA")
# 背景巨型恐龙剪影
big = sprite(G1, 0, 0, 1100)
a = big.split()[3].point(lambda v: int(v * 0.10)); big.putalpha(a)
canvas.alpha_composite(big, (CW - big.width + 260, CH - big.height + 180))
# 主角
hero = sprite(G1, HROW, HCOLS, 620)
canvas.alpha_composite(hero, (CW - 1180, CH - 640))
d = ImageDraw.Draw(canvas)
def F(s, b=True): return ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc" if b else "C:/Windows/Fonts/msyh.ttc", s)
# DAY 0 徽章
d.rounded_rectangle([90, 90, 350, 180], radius=999, fill=(8, 12, 28, 210), outline=MINT + (255,), width=4)
d.text((128, 108), DAY, font=F(56), fill=MINT)
# 主标题
lines = [(L1, 100, CREAM), (L2, 100, CREAM), (L3, 108, PINK)]
y = 250
for text, size, color in lines:
    f = F(size)
    wpx = d.textlength(text, font=f)
    d.text((94, y + 6), text, font=f, fill=(0, 0, 0, 200))
    d.text((90, y), text, font=f, fill=color)
    y += int(size * 1.25)
# 副标题
d.text((94, y + 20), SUB, font=F(48, False), fill=(180, 200, 230))
# 角标
d.rounded_rectangle([90, CH - 150, 90 + 620, CH - 70], radius=999, fill=(8, 12, 28, 200), outline=(120, 200, 255, 255), width=3)
d.text((120, CH - 136), CHIP, font=F(40), fill=(150, 210, 255))
out = os.path.join(V, "out", os.environ.get("ANS_COVER_OUT", "cover-1920x1080.png"))
canvas.convert("RGB").save(out)
print("封面 ->", out, canvas.size)
