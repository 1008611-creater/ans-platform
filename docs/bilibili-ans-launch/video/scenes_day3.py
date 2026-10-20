# -*- coding: utf-8 -*-
"""Day3 场景：结论被推翻 / 新规则 / 止胖成功 / 三期对比 / 待确认 / 机制金句 / 症状vs病因"""
import json, os
from PIL import ImageDraw
from engine import W, font, CREAM, MINT, PINK, GOLD, G1, sprite, paste_center

def _d():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "day3", "scores3.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None

def v_hook4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([80, 250, 320, 330], radius=999, fill=(8, 12, 28, 210), outline=MINT + (255,), width=3)
    d.text((112, 268), "DAY 3", font=font(40), fill=MINT)
    d.text((80, 400), "我上一期的结论", font=font(88), fill=CREAM)
    d.text((80, 520), "只对了一半", font=font(104), fill=PINK)
    if p > 0.45:
        q = min(1.0, (p - 0.45) / 0.5)
        paste_center(canvas, sprite(G1, 5, 3, 400), W / 2, 1120 + (1 - q) * 180)   # 裂开

def v_rule3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "这次只改一条规则", font=font(58), fill=CREAM)
    d.rounded_rectangle([80, 440, W - 80, 900], radius=28, fill=(246, 244, 236, 235))
    d.text((120, 490), "评审必须把改进版提示词", font=font(48), fill=(30, 40, 60))
    d.text((120, 570), "压到 180 字以内", font=font(62), fill=(190, 60, 90))
    d.text((120, 680), "（因为它要被放进总量 400 字的交付里）", font=font(34, False), fill=(90, 100, 120))
    d.text((120, 760), "其他一切不变：同一题、同一模型、同一评分表", font=font(34, False), fill=(90, 100, 120))
    paste_center(canvas, sprite(G1, 3, 2, 320), W / 2, 1250)   # 敲键盘

def v_fat3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "膨胀治住了", font=font(58), fill=MINT)
    data = _d()
    st = data["stats"] if data else {}
    v2 = 1458
    v3 = st.get("avg_improved3", 156)
    mx = max(v2, v3)
    for i, (lab, v, c) in enumerate([("Day2 改进版提示词", v2, PINK), ("Day3 改进版提示词", v3, MINT)]):
        y = 500 + i * 330
        d.text((80, y), lab, font=font(44), fill=CREAM)
        h = int(240 * v / mx * min(1.0, max(0.05, p * 1.5 - i * 0.15)))
        d.rectangle([80, y + 320 - h, 210, y + 320], fill=c)
        d.text((240, y + 210), str(v) + " 字", font=font(52), fill=c)
    d.text((80, 1300), "少了 89%", font=font(64), fill=GOLD)

def v_compare3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 260), "三期总分（同台盲评 + 同口径）", font=font(48), fill=CREAM)
    data = _d()
    if not data: return
    for i, r in enumerate(data["ranking"]):
        y = 400 + i * 320
        d.text((80, y), r["label"], font=font(38), fill=CREAM)
        for j, (v, c) in enumerate([(r["day1"], MINT), (r["day2"], PINK), (r["day3"], GOLD)]):
            yy = y + 56 + j * 76
            w = (W - 420) * min(1.0, v / 100) * min(1.0, max(0.05, p * 1.7 - i * 0.08))
            d.rounded_rectangle([380, yy, W - 90, yy + 60], radius=12, fill=(26, 36, 62))
            d.rounded_rectangle([380, yy, 380 + w, yy + 60], radius=12, fill=c)
            d.text((W - 84, yy + 10), str(v), font=font(34), fill=CREAM)

def v_cause(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "更深的原因", font=font(58), fill=GOLD)
    d.text((80, 420), "「不许虚构、不许提问」写得越来越死", font=font(38, False), fill=(190, 210, 240))
    txt = "宠物纪念手办3D打印需求单：1造型：品种待确认；姿势待确认；底座待确认；颜色待确认。2尺寸材质：尺寸待确认；材质待确认。3后处理：待确认。"
    fnt = font(34, False)
    y = 520; cur = ""
    for ch in txt:
        if d.textlength(cur + ch, font=fnt) <= W - 240:
            cur += ch
        else:
            d.text((100, y), cur, font=fnt, fill=(240, 200, 210)); y += 54; cur = ch
    if cur: d.text((100, y), cur, font=fnt, fill=(240, 200, 210))
    d.text((80, 1180), "满篇「待确认」= 交付物没有实用价值", font=font(40), fill=PINK)
    paste_center(canvas, sprite(G1, 7, 2, 300), W / 2, 1450)   # 石化

def v_quote3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((80, 300), "评审员自己说破了机制", font=font(52), fill=GOLD)
    q = "原提示词列了九个输出章节却完全没有输出长度约束——模板本身就注定产出几百字的需求书，「提示词+结果 ≤400字」的硬预算必被击穿。"
    fnt = font(38)
    y = 460; cur = ""
    for ch in q:
        if d.textlength(cur + ch, font=fnt) <= W - 240:
            cur += ch
        else:
            d.text((100, y), cur, font=fnt, fill=CREAM); y += 66; cur = ch
    if cur: d.text((100, y), cur, font=fnt, fill=CREAM)
    d.rounded_rectangle([80, 420, 92, y + 60], radius=6, fill=GOLD)
    paste_center(canvas, sprite(G1, 5, 1, 280), W / 2, 1350)   # 求求

def v_verdict3(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 320), "症状 ≠ 病因", font=font(72), fill=GOLD)
    lines = ["改胖，只是症状。", "真正的杀手是策略：", "让它既不填空、", "又不能问你——", "它就只剩「待确认」可写。"]
    y = 500
    for i, t in enumerate(lines):
        d.text((90, y), t, font=font(50 if i else 56), fill=PINK if i >= 3 else CREAM)
        y += 112
    paste_center(canvas, sprite(G1, 4, 3, 300), W / 2, 1400)   # 懵圈

def v_cta4(canvas, p, f):
    d = ImageDraw.Draw(canvas)
    d.text((70, 300), "下期第三条路", font=font(58), fill=GOLD)
    d.rounded_rectangle([70, 430, W - 70, 780], radius=28, fill=(14, 22, 44), outline=MINT + (180,), width=3)
    d.text((110, 480), "允许给专业默认值", font=font(46), fill=CREAM)
    d.text((110, 570), "但必须标注「建议值」", font=font(46), fill=MINT)
    d.text((110, 680), "看能不能把分数救回来", font=font(34, False), fill=(180, 205, 235))
    paste_center(canvas, sprite(G1, 6, 6, 360), W / 2, 1200)   # 发光
    d.text((70, 1560), "评论区说一声你踩过的坑", font=font(38), fill=(190, 215, 245))
