# -*- coding: utf-8 -*-
"""用 OpenLux 出的真图组装成品：头像 + Day0/Day1 封面（含像素小恐龙联动）
用法: python compose_final.py
"""
import os, sys, importlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
GEN = os.path.join(ASSETS, "gen")
lady = importlib.import_module("lady")

FONT_BD, FONT_RG = "C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc"
EMERALD, WHITE = (16, 185, 129), (255, 255, 255)


def fit_top(im, w, h):
    """等比缩放到铺满 w×h，从顶部裁（保住头部）"""
    r = max(w / im.width, h / im.height)
    n = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.Resampling.LANCZOS)
    x = (n.width - w) // 2
    return n.crop((x, 0, x + w, h))


def avatar(src, box, out, badge_text="ANS"):
    im = Image.open(src).convert("RGB").crop(box).resize((1024, 1024), Image.Resampling.LANCZOS).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.rectangle([0, 926, 1024, 1024], fill=(8, 12, 26, 242))
    lady.badge(im, (40, 948), badge_text, 40, pad=(22, 10))
    f = ImageFont.truetype(FONT_RG, 26)
    t = "AI 运营中 · 非官方同人"
    b = d.textbbox((0, 0), t, font=f)
    d.text(((1024 - (b[2] - b[0])) // 2, 952), t, font=f, fill=(126, 142, 196))
    im.convert("RGB").save(out)
    print("avatar ->", out)


def full_scrim(im, strength=215, falloff=1.35):
    """整幅横向渐变遮罩：左侧压暗放标题，右侧透出人物——没有硬边"""
    W, H = im.size
    xs = np.linspace(0, 1, W)[None, :]
    a = (np.clip(1 - xs * falloff, 0, 1) ** 1.25) * strength
    g = np.zeros((H, W, 4), np.float32)
    g[:, :, 3] = np.repeat(a, H, axis=0)
    g[:, :, :3] = np.array([6, 9, 22]) / 255.0
    from PIL import ImageFilter
    im.alpha_composite(Image.fromarray((g * 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(6)))


def cover(art, out, day, t1, t2, sub, note, chips=None, with_dino=False):
    CW, CH = 1920, 1080
    cv = fit_top(Image.open(art).convert("RGB"), CW, CH).convert("RGBA")
    full_scrim(cv, 218, 1.38)
    if with_dino:
        dp = Image.open(os.path.join(ASSETS, "ans-dino-chibi-ref.png")).convert("RGBA")
        h = 300
        dp = dp.resize((max(1, int(dp.width * h / dp.height)), h), Image.Resampling.LANCZOS)
        cv.alpha_composite(dp, (150, CH - 92 - dp.height + 6))
    d = ImageDraw.Draw(cv)
    d.text((110, 92), day, font=ImageFont.truetype(FONT_BD, 42), fill=EMERALD)
    lady.badge(cv, (110, 168), "AI 运营 · 日更", 30, fill=(24, 34, 72), fg=(150, 172, 255))
    d.text((104, 300), t1, font=ImageFont.truetype(FONT_BD, 112), fill=WHITE)
    d.text((104, 424), t2, font=ImageFont.truetype(FONT_BD, 112), fill=EMERALD)
    d.text((110, 588), sub, font=ImageFont.truetype(FONT_RG, 54), fill=(214, 224, 250))
    d.text((110, 662), note, font=ImageFont.truetype(FONT_RG, 36), fill=(156, 170, 208))
    if chips:
        f = ImageFont.truetype(FONT_BD, 32)
        x = 110
        for c in chips:
            b = d.textbbox((0, 0), c, font=f)
            w = b[2] - b[0]
            d.rounded_rectangle([x, 752, x + w + 48, 812], radius=30, fill=(24, 34, 72), outline=(58, 82, 196), width=2)
            d.text((x + 24 - b[0], 782 - (b[3] + b[1]) // 2), c, font=f, fill=(178, 194, 255))
            x += w + 66
    d.rectangle([0, CH - 92, CW, CH], fill=(8, 12, 26))
    d.text((110, CH - 64), "本账号为同人创作，与 DeepSeek / Anthropic 等官方无关 · 含 AI 生成合成内容，已按平台要求标识",
           font=ImageFont.truetype(FONT_RG, 32), fill=(120, 138, 190))
    cv.convert("RGB").save(out)
    print("cover ->", out)


cover(os.path.join(GEN, "ans-lady-cover-16x9.png"), os.path.join(ASSETS, "cover-day0-1920x1080.png"),
      "Day 0", "大肥鱼入职", "ANS 第一天", "KPI：把 ANS 和我自己都跑一遍",
      "选题 · 脚本 · 动画 · 运营 = AI ｜ 人类只按发布键", with_dino=True)
cover(os.path.join(GEN, "ans-lady-cover-16x9.png"), os.path.join(ASSETS, "cover-day1-1920x1080.png"),
      "Day 1", "五个模型", "一道题", "同一个 Prompt，谁的交付能过审？",
      "模型名 / 版本号 / 推理档位全标注 ｜ 结果公开可复现",
      chips=["GPT-6 Astra", "Claude Opus 5.5", "DeepSeek V4.1 Flash", "Kimi K3", "GLM-5.3"])
avatar(os.path.join(GEN, "ans-lady-anime-1x1.png"), (395, 15, 1005, 625), os.path.join(ASSETS, "avatar-1024.png"))
avatar(os.path.join(GEN, "ans-lady-pixel-1x1.png"), (170, 80, 900, 810), os.path.join(ASSETS, "avatar-pixel-1024.png"))
print("ok")