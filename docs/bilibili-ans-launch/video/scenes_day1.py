# -*- coding: utf-8 -*-
"""Day1 专用场景：白板规则 / 模型卡 / 横向条形图 / 原始输出截取"""
import json, os
from PIL import Image, ImageDraw, ImageFont
from engine import W, H, font, CREAM, MINT, MINT_D, PINK, GOLD, sprite, G1, G2, paste_center

def _load():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "day1", "scores.json")
    if not os.path.exists(p): return None
    return json.load(open(p, encoding="utf-8"))

def v_rule(canvas, p, f):
    """白板规则：逐条出现"""
    d = ImageDraw.Draw(canvas)
    rules = ["同一道题", "同一个 Prompt", "不许提问", "不许用工具", "每个模型跑 3 次"]
    d.rounded_rectangle([70, 300, W - 70, 1240], radius=32, fill=(246, 244, 236, 235), outline=MINT_D + (255,), width=6)
    d.text((110, 340), "考场规则", font=font(58), fill=(30, 40, 60))
    fnt = font(46)
    shown = int(p * (len(rules) + 0.5))
    for i, t in enumerate(rules):
        if i >= shown: break
        y = 470 + i * 130
        d.text((120, y), "✓", font=fnt, fill=(40, 150, 110))
        d.text((190, y), t, font=fnt, fill=(35, 45, 70))
    paste_center(canvas, sprite(G1, 0, 0, 300), 200, 1500)

def v_cards(canvas, p, f):
    """五个模型卡：左模型名 / 右总分 / 下失误"""
    data = _load()
    d = ImageDraw.Draw(canvas)
    d.text((70, 250), "五维加权总分", font=font(56), fill=CREAM)
    if not data:
        d.text((70, 400), "（等待实测数据）", font=font(48), fill=(150, 180, 220))
        return
    rows = data["ranking"]
    shown = max(1, int(p * len(rows) + 0.6))
    for i, r in enumerate(rows[:shown]):
        y = 380 + i * 240
        d.rounded_rectangle([70, y, W - 70, y + 210], radius=26, fill=(14, 22, 44, 230), outline=(70, 96, 140, 255), width=3)
        d.text((100, y + 22), r["label"], font=font(50), fill=CREAM)
        sc = str(r["total"])
        d.text((W - 130 - d.textlength(sc, font=font(76)), y + 18), sc, font=font(76), fill=GOLD)
        d.text((100, y + 100), "最扎眼：" + r.get("flaw", "—"), font=font(36, False), fill=(178, 198, 228))
        d.text((100, y + 152), r.get("note", ""), font=font(32, False), fill=(140, 165, 200))

def v_bars(canvas, p, f):
    """横向条形图（方案要求：不用雷达图）"""
    data = _load(); d = ImageDraw.Draw(canvas)
    d.text((70, 260), "总分（满分 100）", font=font(54), fill=CREAM)
    if not data:
        d.text((70, 420), "（等待实测数据）", font=font(46), fill=(150, 180, 220)); return
    rows = data["ranking"]
    x0, x1 = 420, W - 120
    for i, r in enumerate(rows):
        y = 420 + i * 200
        d.text((70, y + 26), r["label"], font=font(40), fill=CREAM)
        w = (x1 - x0) * min(1.0, r["total"] / 100)
        prog = min(1.0, max(0.0, p * 1.4 - i * 0.08))
        d.rounded_rectangle([x0, y, x1, y + 96], radius=16, fill=(26, 36, 62))
        d.rounded_rectangle([x0, y, x0 + w * prog, y + 96], radius=16,
                            fill=GOLD if i == 0 else MINT if i < 3 else (110, 170, 210))
        d.text((x0 + w * prog + 18, y + 22), str(r["total"]), font=font(48), fill=CREAM)

def v_raw(canvas, p, f):
    """原始输出截取"""
    data = _load(); d = ImageDraw.Draw(canvas)
    d.text((70, 250), "原始输出（未修饰）", font=font(52), fill=CREAM)
    if not data or not data.get("raw_excerpt"):
        d.text((70, 400), "（等待实测数据）", font=font(44), fill=(150, 180, 220)); return
    ex = data["raw_excerpt"]
    fnt = font(34, False)
    d.rounded_rectangle([70, 360, W - 70, 1520], radius=24, fill=(10, 16, 32, 240), outline=(60, 84, 124, 255), width=3)
    y = 400
    for line in ex.split("\n")[:26]:
        d.text((100, y), line[:44], font=fnt, fill=(206, 222, 244)); y += 44
    d.text((100, 1540), "完整输出见站内动态", font=font(32, False), fill=(150, 175, 210))
