# -*- coding: utf-8 -*-
"""ANS 像素角色资产总览图（大小姐 + 小恐龙 + DeepSeek 鲸鱼娘）"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
import importlib
lady_mod = importlib.import_module("lady")
whale_mod = importlib.import_module("whale_lady")

FONT_BD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_RG = "C:/Windows/Fonts/msyh.ttc"
W, H = 1920, 1080


def main():
    cv = lady_mod.bg(W, H, 32)
    d = ImageDraw.Draw(cv)
    d.text((96, 78), "ANS 像素角色资产", font=ImageFont.truetype(FONT_BD, 62), fill=(255, 255, 255))
    d.text((98, 162), "全部由代码在 64/128 像素网格上逐笔绘制 ｜ 零出图模型、零 API ｜ 改坐标即可微调",
           font=ImageFont.truetype(FONT_RG, 30), fill=(150, 168, 214))

    cards = [
        (lady_mod.lady().resize((128 * 4, 128 * 4), Image.Resampling.NEAREST),
         "大肥鱼", "ANS 家大小姐 · 账号主形象", (16, 185, 129)),
        (lady_mod.dino_pixel().resize((64 * 8, 64 * 8), Image.Resampling.NEAREST),
         "ANS 小恐龙", "官方 IP 搭档（Dino Agent）", (16, 185, 129)),
        (whale_mod.whale_lady().resize((128 * 4, 128 * 4), Image.Resampling.NEAREST),
         "DeepSeek 鲸鱼娘", "二创联动形象 · 非官方", (77, 107, 254)),
    ]
    cw, ch = 560, 760
    for i, (im, name, role, accent) in enumerate(cards):
        x = 96 + i * (cw + 60)
        y = 240
        card = Image.new("RGBA", (cw, ch), (18, 26, 56, 235))
        ImageDraw.Draw(card).rounded_rectangle([0, 0, cw - 1, ch - 1], radius=26, outline=(48, 66, 128, 255), width=2)
        cv.alpha_composite(card, (x, y))
        cv.alpha_composite(im, (x + (cw - im.width) // 2, y + 40))
        dd = ImageDraw.Draw(cv)
        dd.rectangle([x + 30, y + 590, x + 30 + 46, y + 596], fill=accent)
        dd.text((x + 30, y + 620), name, font=ImageFont.truetype(FONT_BD, 40), fill=(255, 255, 255))
        dd.text((x + 30, y + 680), role, font=ImageFont.truetype(FONT_RG, 26), fill=(150, 168, 214))
    d = ImageDraw.Draw(cv)
    d.text((96, H - 62), "同人二创，与深度求索（DeepSeek）/ Anthropic 等官方无关 · 含 AI 生成合成内容时按平台要求标识",
           font=ImageFont.truetype(FONT_RG, 28), fill=(118, 136, 186))
    cv.convert("RGB").save(os.path.join(ASSETS, "cast-sheet-1920x1080.png"))
    print("ok")


main()
