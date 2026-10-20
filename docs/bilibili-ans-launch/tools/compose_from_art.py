# -*- coding: utf-8 -*-
"""把本地 SDXL 出的图 + 真·小恐龙抠图，合成账号头图 / 封面（封面文字自动排版）
用法:
  python compose_from_art.py cover --art <16x9.png> --out cover-day0.png --day "Day 0" --t1 大肥鱼入职 --t2 "ANS 第一天" --sub "..." --note "..." --dino
  python compose_from_art.py avatar --art <1x1.png> --out avatar-1024.png
"""
import argparse, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
DINO = os.path.join(ASSETS, "ans-dino-cutout.png")
FONT_BD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_RG = "C:/Windows/Fonts/msyh.ttc"
EMERALD = (16, 185, 129)
WHITE = (255, 255, 255)


def fit(img, w, h):
    r = max(w / img.width, h / img.height)
    im = img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))), Image.Resampling.LANCZOS)
    return im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, h))


def dino_cut(h):
    d = Image.open(DINO).convert("RGBA")
    bbox = d.getbbox()
    d = d.crop(bbox)
    r = h / d.height
    return d.resize((max(1, int(d.width * r)), h), Image.Resampling.LANCZOS)


def badge(im, xy, text, fs, fill=EMERALD, fg=WHITE, pad=(26, 12)):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT_BD, fs)
    b = d.textbbox((0, 0), text, font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    x, y = xy
    d.rounded_rectangle([x, y, x + w + pad[0] * 2, y + h + pad[1] * 2], radius=(h + pad[1] * 2) // 2, fill=fill)
    d.text((x + pad[0] - b[0], y + pad[1] - b[1]), text, font=f, fill=fg)


def scrim(im, box, strength=185):
    x0, y0, x1, y1 = box
    g = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    xs = np.linspace(0, 1, x1 - x0)[None, :]
    a = np.clip((1 - xs) * 1.25, 0, 1) ** 1.1 * strength
    g[:, :, 3] = a
    g[:, :, :3] = np.array([6, 9, 22]) / 255.0
    lay = Image.fromarray((g * 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(18))
    im.alpha_composite(lay, (x0, y0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["cover", "avatar"])
    ap.add_argument("--art", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--day", default="Day 0")
    ap.add_argument("--tag", default="AI 运营 · 日更")
    ap.add_argument("--t1", default="大肥鱼入职")
    ap.add_argument("--t2", default="ANS 第一天")
    ap.add_argument("--sub", default="KPI：把 ANS 和我自己都跑一遍")
    ap.add_argument("--note", default="选题 · 脚本 · 动画 · 运营 = AI ｜ 人类只按发布键")
    ap.add_argument("--dino", action="store_true")
    ap.add_argument("--dino-h", type=int, default=430)
    ap.add_argument("--disclaimer", default="本账号为同人创作，与 DeepSeek / Anthropic 等官方无关 · 含 AI 生成合成内容，已按平台要求标识")
    a = ap.parse_args()
    art = Image.open(a.art).convert("RGB")

    if a.cmd == "avatar":
        W = H = 1024
        im = fit(art, W, H).convert("RGBA")
        av = Image.new("RGBA", (W, H), (6, 9, 20, 255))
        av.alpha_composite(im, (0, 0))
        badge(av, (W // 2 - 76, 898), "ANS", 50)
        d = ImageDraw.Draw(av)
        f = ImageFont.truetype(FONT_RG, 26)
        t = "AI 运营中 · 非官方同人"
        b = d.textbbox((0, 0), t, font=f)
        d.rectangle([0, 936, W, H], fill=(8, 12, 26, 235))
        d.text(((W - (b[2] - b[0])) // 2, 958), t, font=f, fill=(126, 142, 196))
        av.convert("RGB").save(a.out)
        print("avatar ->", a.out)
        return

    CW, CH = 1920, 1080
    cv = fit(art, CW, CH).convert("RGBA")
    if a.dino:
        dn = dino_cut(a.dino_h)
        cv.alpha_composite(dn, (CW - dn.width - 70, CH - dn.height - 40))
    scrim(cv, (0, 60, 1150, 830), 200)
    d = ImageDraw.Draw(cv)
    d.text((110, 92), a.day, font=ImageFont.truetype(FONT_BD, 42), fill=EMERALD)
    badge(cv, (110, 168), a.tag, 30, fill=(24, 34, 72), fg=(150, 172, 255))
    d.text((104, 300), a.t1, font=ImageFont.truetype(FONT_BD, 112), fill=WHITE)
    d.text((104, 424), a.t2, font=ImageFont.truetype(FONT_BD, 112), fill=EMERALD)
    d.text((110, 588), a.sub, font=ImageFont.truetype(FONT_RG, 54), fill=(208, 218, 250))
    d.text((110, 670), a.note, font=ImageFont.truetype(FONT_RG, 38), fill=(150, 164, 205))
    d.rectangle([0, CH - 92, CW, CH], fill=(8, 12, 26))
    d.text((110, CH - 64), a.disclaimer, font=ImageFont.truetype(FONT_RG, 32), fill=(120, 138, 190))
    cv.convert("RGB").save(a.out)
    print("cover ->", a.out)


if __name__ == "__main__":
    main()
