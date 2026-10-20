# -*- coding: utf-8 -*-
"""Day1 评分表长图（发动态用）：规则 + 榜单 + 五维 + 原始输出摘录（自动折行 + 自动裁高）"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
V = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, V)
from engine import bg_gradient, dots_overlay, NAVY, NAVY_2, MINT, CREAM, GOLD, PINK, G1, sprite

W, TALL = 1080, 5000
d0 = json.load(open(os.path.join(V, "day1", "scores.json"), encoding="utf-8"))
raw = json.load(open(os.path.join(V, "day1", "raw.json"), encoding="utf-8"))
by = {}
for r in raw["results"]:
    if "content" in r: by.setdefault(r["label"], []).append(r)

canvas = dots_overlay(bg_gradient(NAVY, NAVY_2, (W, TALL))).convert("RGBA")
d = ImageDraw.Draw(canvas)
def F(s, b=True): return ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc" if b else "C:/Windows/Fonts/msyh.ttc", s)

def wrap(text, fnt, max_w, max_lines=99):
    out, cur = [], ""
    for ch in text.replace("\r", ""):
        if ch == "\n":
            out.append(cur); cur = ""; continue
        if d.textlength(cur + ch, font=fnt) <= max_w:
            cur += ch
        else:
            out.append(cur); cur = ch
        if len(out) >= max_lines:
            break
    if cur: out.append(cur)
    return out[:max_lines]

y = 50
d.text((60, y), "Day 1 测评完整记录", font=F(58), fill=CREAM); y += 88
d.text((60, y), "同一 Prompt · 单轮 · 禁用工具 · 每模型 3 次采样", font=F(32, False), fill=(170, 200, 230)); y += 56
d.rounded_rectangle([60, y, W - 60, y + 6], radius=3, fill=MINT); y += 44

d.text((60, y), "统一 Prompt（逐字相同）", font=F(40), fill=GOLD); y += 58
body = wrap(d0["prompt"], F(28, False), W - 200, 12)
bh = 40 + 42 * len(body)
d.rounded_rectangle([60, y, W - 60, y + bh], radius=20, fill=(10, 16, 34, 235))
ty = y + 20
for line in body:
    d.text((84, ty), line, font=F(28, False), fill=(206, 222, 244)); ty += 42
y += bh + 40

d.text((60, y), "总分榜（五维加权，满分 100）", font=F(40), fill=GOLD); y += 62
for i, r in enumerate(d0["ranking"]):
    d.rounded_rectangle([60, y, W - 60, y + 92], radius=16, fill=(16, 24, 48), outline=(70, 96, 140, 255), width=2)
    d.text((84, y + 24), "%d. %s" % (i + 1, r["label"]), font=F(36), fill=CREAM)
    sc = str(r["total"])
    d.text((W - 100 - d.textlength(sc, font=F(44)), y + 18), sc, font=F(44), fill=GOLD if i == 0 else MINT)
    y += 104
y += 24

d.text((60, y), "五维明细", font=F(40), fill=GOLD); y += 58
d.text((84, y), "模型                    完成  执行  结构  事实  盲评", font=F(28, False), fill=(180, 205, 235)); y += 44
for r in d0["ranking"]:
    d.text((84, y), "%-22s %4d  %4d  %4d  %4d  %4d" % (r["label"][:22], r["完成度"], r["可执行性"], r["结构化"], r["事实与服从"], r["盲评"]),
           font=F(28, False), fill=(206, 222, 244))
    y += 44
y += 30

d.text((60, y), "原始输出摘录（完整版在动态）", font=F(40), fill=GOLD); y += 60
for r in d0["ranking"]:
    rs = sorted(by.get(r["label"], []), key=lambda x: x["sample"])
    if not rs: continue
    txt = rs[len(rs) // 2]["content"]
    d.text((60, y), "· " + r["label"] + "（中位采样）", font=F(32), fill=MINT); y += 46
    for line in wrap(txt, F(26, False), W - 160, 9):
        d.text((84, y), line, font=F(26, False), fill=(190, 208, 236)); y += 36
    y += 24

av = sprite(G1, 4, 2, 180)
canvas.alpha_composite(av, (W - 240, y - 40))
y += 150
d.text((60, y), "评分标准与原始输出全部公开 · 欢迎复现与指正", font=F(26, False), fill=(150, 175, 210))
y += 70

final = canvas.crop((0, 0, W, min(TALL, y)))
out = os.path.join(V, "out", "ans-day1-scorecard.png")
final.convert("RGB").save(out)
print("评分长图 ->", out, final.size)
