# -*- coding: utf-8 -*-
"""Day4 场景：第三条路 / 建议值 / 四期回顾 / 结论"""
import json, os, re
from PIL import ImageDraw
from engine import W, font, CREAM, MINT, PINK, GOLD, G1, sprite, paste_center

def _d():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "day4", "scores4.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None

def v_hook5(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([80, 250, 320, 330], radius=999, fill=(8, 12, 28, 210), outline=MINT + (255,), w_idth=3) if False else None
    d.rounded_rectangle([80, 250, 320, 330], radius=999, fill=(8, 12, 28, 210), outline=MINT + (255,), width=3)
    d.text((112, 268), "DAY 4", font=font(40), fill=MINT)
    d.text((80, 400), "第三条路：", font=font(80), fill=CREAM)
    d.text((80, 510), "让它敢填，", font=font(96), fill=MINT)
    d.text((80, 630), "但要标注「建议」", font=font(84), fill=GOLD)
    if p > 0.45:
        q = min(1.0, (p - 0.45) / 0.5)
        paste_center(canvas, sprite(G1, 6, 2, 380), W / 2, 1180 + (1 - q) * 160)

def v_rule4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 290), "这次加的两条", font=font(56), fill=CREAM)
    items = [("① 字数预算", "改进版提示词 ≤ 180 字", MINT), ("② 策略要求", "允许补专业默认值，但每处必须写「建议：xxx」", GOLD)]
    y = 430
    for title, body, c in items:
        d.rounded_rectangle([80, y, W - 80, y + 300], radius=26, fill=(246, 244, 236, 235))
        d.text((120, y + 40), title, font=font(52), fill=(30, 40, 60))
        fnt = font(36)
        yy = y + 140; cur = ""
        for ch in body:
            if d.textlength(cur + ch, font=fnt) <= W - 260:
                cur += ch
            else:
                d.text((120, yy), cur, font=fnt, fill=(60, 70, 90)); yy += 56; cur = ch
        if cur: d.text((120, yy), cur, font=fnt, fill=(60, 70, 90))
        d.rounded_rectangle([80, y, 92, y + 300], radius=6, fill=c)
        y += 340

def v_suggest(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "交付物长这样了", font=font(56), fill=MINT)
    txt = ("1造型：品种待确认；姿势待确认；底座待确认；颜色待确认。"
           "2尺寸材质：高度建议 15cm；材质建议光敏树脂；公差建议 ±0.5mm。"
           "3后处理：涂装建议白底彩绘。4交付：建议 20 天。5验收：建议三次打样。")
    fnt = font(34, False)
    y = 440; cur = ""
    for ch in txt:
        if d.textlength(cur + ch, font=fnt) <= W - 240:
            cur += ch
        else:
            col = GOLD if "建议" in cur else (230, 235, 245)
            d.text((100, y), cur, font=fnt, fill=col); y += 56; cur = ch
    if cur:
        col = GOLD if "建议" in cur else (230, 235, 245)
        d.text((100, y), cur, font=fnt, fill=col)
    d.text((80, 1300), "「建议值」让制作方可以直接报价", font=font(40), fill=GOLD)
    paste_center(canvas, sprite(G1, 6, 0, 300), W / 2, 1520)   # 欢呼

def v_compare4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 250), "Day3 → Day4（同台盲评）", font=font(50), fill=CREAM)
    data = _d()
    if not data: return
    for i, r in enumerate(data["ranking"]):
        y = 400 + i * 320
        d.text((80, y), r["label"], font=font(38), fill=CREAM)
        for j, (v, c) in enumerate([(r["day3"], PINK), (r["day4"], GOLD)]):
            yy = y + 56 + j * 76
            w = (W - 420) * min(1.0, v / 100) * min(1.0, max(0.05, p * 1.7 - i * 0.08))
            d.rounded_rectangle([380, yy, W - 90, yy + 60], radius=12, fill=(26, 36, 62))
            d.rounded_rectangle([380, yy, 380 + w, yy + 60], radius=12, fill=c)
            d.text((W - 84, yy + 10), str(v), font=font(34), fill=CREAM)
    st = data["stats"]
    d.text((80, 1720), "均值 %.1f → %.1f ｜ 待确认 %d 处" % (st["avg_day3"], st["avg_day4"], st["pending_total"]),
           font=font(38), fill=GOLD)

def v_verdict4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 300), "四期下来，最有用的结论", font=font(50), fill=GOLD)
    lines = ["机制指标，比总分可信。", "", "要验证一个改动有没有用，", "就去看数得出来的东西：", "「待确认」少了几处，", "「建议值」多了几处。"]
    y = 460
    for i, t in enumerate(lines):
        if t:
            d.text((90, y), t, font=font(52 if i == 0 else 44), fill=MINT if i == 0 else CREAM)
        y += 104
    paste_center(canvas, sprite(G1, 4, 4, 320), W / 2, 1360)   # 无语

def v_mechanism4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "机制指标（可数、可验证）", font=font(50), fill=GOLD)
    rows = [("待确认", "满篇 → 6 处", MINT), ("建议值", "0 → 31 处", GOLD), ("超字数", "2 / 4 个模型", PINK)]
    y = 460
    for i, (k, v, c) in enumerate(rows):
        if i >= max(1, int(p * 4 + 1)): break
        d.rounded_rectangle([80, y, W - 80, y + 220], radius=24, fill=(14, 22, 44, 235), outline=(70, 96, 140, 255), width=2)
        d.text((110, y + 40), k, font=font(48), fill=CREAM)
        d.text((110, y + 120), v, font=font(46), fill=c)
        y += 250

def v_judge4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 280), "同一个裁判，同一批里", font=font(52), fill=PINK)
    data = _d()
    rows = [("DeepSeek", 0, 20), ("GLM-5.3", 19, 2), ("Qwen", 3, 5), ("Hunyuan", 4, 3)]
    if data:
        rows = [(r["label"], r["blind_d3"] or 0, r["blind_d4"] or 0) for r in data["ranking"]]
    for i, (lab, a, b) in enumerate(rows):
        y = 420 + i * 220
        d.text((80, y + 20), lab, font=font(36), fill=CREAM)
        d.text((470, y + 10), "D3", font=font(28, False), fill=(170, 190, 220))
        d.text((640, y + 10), "D4", font=font(28, False), fill=(170, 190, 220))
        for j, v in enumerate((a, b)):
            xx = 540 + j * 170
            h = int(120 * v / 20)
            d.rectangle([xx, y + 150 - h, xx + 90, y + 150], fill=PINK if j == 0 else GOLD)
            d.text((xx + 20, y + 160), str(v), font=font(36), fill=CREAM)
    d.text((80, 1520), "波动 20 分 → 这个尺子不能用来下结论", font=font(38), fill=PINK)

def v_recap(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 250), "四期结论", font=font(58), fill=GOLD)
    rows = [("Day 1", "五个模型同题实测：跑最快的，分也最高"), ("Day 2", "互相改提示词 → 提示词被改胖 3.7 倍"),
            ("Day 3", "给字数预算：膨胀治住了，分数没回来"), ("Day 4", "允许「建议值」：机制修好了，但总分尺子不可信")]
    y = 400
    for i, (k, v) in enumerate(rows):
        if i >= max(1, int(p * 5 + 1)): break
        d.rounded_rectangle([70, y, W - 70, y + 200], radius=24, fill=(14, 22, 44, 235), outline=(70, 96, 140, 255), width=2)
        d.text((100, y + 30), k, font=font(44), fill=MINT)
        d.text((100, y + 110), v, font=font(36), fill=CREAM)
        y += 230

def v_cta5(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 300), "可复用的三条规则", font=font(56), fill=GOLD)
    rules = ["1. 让 AI 改提示词，必须同时给「字数预算」",
             "2. 交付类任务，必须给「建议值」的名字",
             "3. 凡是「不许虚构 + 不许提问」的组合，",
             "     一定会产出满篇「待确认」"]
    y = 440
    for i, t in enumerate(rules):
        d.text((90, y), t, font=font(42 if i < 3 else 40), fill=CREAM if i < 3 else PINK)
        y += 100
    paste_center(canvas, sprite(G1, 4, 2, 320), W / 2, 1300)
    d.text((70, 1600), "下期：把这套流程接到 ANS 的真实项目上", font=font(36), fill=(190, 215, 245))
