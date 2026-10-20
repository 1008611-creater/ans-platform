# -*- coding: utf-8 -*-
"""Day2 专用场景：互相改图 / 评审金句 / 提示词膨胀 / 两期对比 / 拒交 / 结论"""
import json, os
from PIL import Image, ImageDraw
from engine import W, font, CREAM, MINT, PINK, GOLD, G1, G2, sprite, paste_center

def _d():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "day2", "scores2.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None

def v_hook3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 380), "98 分 → 50 分", font=font(112), fill=PINK)
    d.text((80, 540), "不是模型变笨了", font=font(96), fill=CREAM)
    if p > 0.45:
        q = min(1.0, (p - 0.45) / 0.5)
        im = sprite(G1, 7, 3, 380)   # 没电
        paste_center(canvas, im, W / 2, 1150 + (1 - q) * 200)
    badge_like = "DAY 2"
    d.rounded_rectangle([80, 250, 300, 330], radius=999, fill=(8, 12, 28, 210), outline=MINT + (255,), width=3)
    d.text((112, 268), badge_like, font=font(40), fill=MINT)

def v_peer(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "互相改提示词", font=font(60), fill=CREAM)
    data = _d()
    if not data: return
    rows = data["rows"]
    for i, r in enumerate(rows):
        y = 440 + i * 230
        d.rounded_rectangle([80, y, W - 80, y + 190], radius=24, fill=(14, 22, 44, 235), outline=(70, 96, 140, 255), width=2)
        d.text((110, y + 24), r["reviewed_by"], font=font(40), fill=MINT)
        d.text((110, y + 92), "改写 " + r["label"], font=font(44), fill=CREAM)
        d.text((110, y + 142), "改进版提示词 %d 字" % r["improved_chars"], font=font(32, False), fill=(170, 195, 225))

def v_quote(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "评审挑出的真问题", font=font(56), fill=GOLD)
    quote = "它没有声明模型无法直接看到用户照片，只能依据文字变量凭空编造宠物斑纹、比例、瞳色等关键细节。"
    fnt = font(42)
    y = 460
    cur = ""
    for ch in quote:
        if d.textlength(cur + ch, font=fnt) <= W - 220:
            cur += ch
        else:
            d.text((100, y), cur, font=fnt, fill=CREAM); y += 74; cur = ch
    if cur: d.text((100, y), cur, font=fnt, fill=CREAM)
    d.rounded_rectangle([80, 420, 90, y + 60], radius=6, fill=MINT)
    paste_center(canvas, sprite(G1, 5, 0, 300), W / 2, 1350)

def v_fat(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "提示词被「改胖」了", font=font(56), fill=CREAM)
    data = _d()
    if not data: return
    st = data["stats"]
    steps = [("Day1 交付", st["avg_day1_chars"], MINT), ("改进版提示词", st["avg_improved_chars"], PINK),
             ("Day2 交付", st["avg_day2_chars"], GOLD)]
    mx = max(s[1] for s in steps)
    for i, (lab, v, c) in enumerate(steps):
        y = 500 + i * 320
        d.text((80, y), lab, font=font(44), fill=CREAM)
        h = int(220 * v / mx * min(1.0, max(0.05, p * 1.5 - i * 0.12)))
        d.rectangle([80, y + 300 - h, 200, y + 300], fill=c)
        d.text((230, y + 200), str(v) + " 字", font=font(48), fill=c)
    d.text((80, 1620), "约束没变：全文不超过 400 字", font=font(38, False), fill=(190, 210, 240))

def v_compare2(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 280), "两期总分对比", font=font(56), fill=CREAM)
    data = _d()
    if not data: return
    for i, r in enumerate(data["rows"]):
        y = 420 + i * 250
        d.text((80, y), r["label"], font=font(38), fill=CREAM)
        for j, (v, c, tag) in enumerate([(r["day1"], MINT, "D1"), (r["day2"], PINK, "D2")]):
            yy = y + 60 + j * 70
            w = (W - 420) * min(1.0, v / 100) * min(1.0, max(0.05, p * 1.6 - i * 0.08))
            d.rounded_rectangle([380, yy, W - 90, yy + 56], radius=12, fill=(26, 36, 62))
            d.rounded_rectangle([380, yy, 380 + w, yy + 56], radius=12, fill=c)
            d.text((W - 84, yy + 6), str(v), font=font(34), fill=CREAM)

def v_refuse(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "DeepSeek 拒绝交付", font=font(58), fill=PINK)
    d.rounded_rectangle([80, 420, W - 80, 1180], radius=24, fill=(10, 16, 32, 240), outline=(90, 70, 110, 255), width=3)
    txt = "无法原样给出该改进提示词：它本身约 800+ 字，已超过「全文不超过 400 字」的硬限制；逐字复制必然违规。"
    fnt = font(38, False)
    y = 470; cur = ""
    for ch in txt:
        if d.textlength(cur + ch, font=fnt) <= W - 220:
            cur += ch
        else:
            d.text((110, y), cur, font=fnt, fill=(228, 214, 236)); y += 62; cur = ch
    if cur: d.text((110, y), cur, font=fnt, fill=(228, 214, 236))
    paste_center(canvas, sprite(G1, 7, 3, 420), W / 2, 1450)
    d.text((80, 1720), "98 分 → 50 分", font=font(44), fill=GOLD)

def v_lesson(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 300), "真正的结论", font=font(56), fill=GOLD)
    lines = ["让 AI 互相改提示词，", "最大的风险不是改错，", "是「改胖」。", "", "约束不跟着改，交付就会崩。"]
    y = 460
    for i, t in enumerate(lines):
        if t:
            d.text((90, y), t, font=font(56 if i < 3 else 44), fill=PINK if i == 2 else CREAM)
        y += 110
    paste_center(canvas, sprite(G1, 5, 1, 340), W / 2, 1300)

def v_cta3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 300), "下期实验", font=font(58), fill=GOLD)
    d.rounded_rectangle([70, 430, W - 70, 700], radius=26, fill=(14, 22, 44), outline=MINT + (180,), width=3)
    d.text((110, 480), "把字数约束一起交给评审", font=font(44), fill=CREAM)
    d.text((110, 570), "看能不能只改质量、不改胖", font=font(38, False), fill=(180, 205, 235))
    paste_center(canvas, sprite(G1, 6, 3, 380), W / 2, 1150)
    d.text((70, 1560), "你踩过什么坑，评论区说一声", font=font(38), fill=(190, 215, 245))
