# -*- coding: utf-8 -*-
"""ANS 家大小姐「大肥鱼」—— 纯代码像素立绘（零模型、零 API）
布局以 128x128 像素网格为单位，最后 NEAREST 放大到 1024。
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
S = 128
FONT_BD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_RG = "C:/Windows/Fonts/msyh.ttc"

SKIN, SKIN_SH, SKIN_DK = (255, 228, 208), (240, 194, 170), (222, 170, 148)
BLUSH = (255, 152, 174)
HAIR_DK, HAIR, HAIR_MD, HAIR_LT, HAIR_HI = (24, 32, 88), (56, 80, 194), (86, 114, 230), (134, 158, 255), (196, 212, 255)
EYE_DK, IRIS_LT, IRIS, IRIS_DK, PUPIL, WHITE = (16, 22, 54), (126, 168, 255), (56, 106, 236), (26, 54, 150), (12, 18, 44), (255, 255, 255)
ROSE = (206, 96, 118)
HOODIE, HOODIE_SH, HOODIE_DK = (244, 247, 255), (210, 220, 244), (178, 192, 228)
DARK, EMERALD = (22, 28, 60), (16, 185, 129)
NAVY_TOP, NAVY_BOT, GRID = (16, 26, 58), (6, 9, 20), (32, 46, 92)

FACE = [(41, 28), (87, 28), (96, 50), (86, 78), (64, 94), (42, 78), (32, 50)]


def shade(im, region, shapes, color, alpha=90):
    """把 shapes 画成遮罩，仅在 region 内以 color+alpha 叠加（正确的明暗方式）"""
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    for kind, box in shapes:
        if kind == "e":
            d.ellipse(box, fill=255)
        elif kind == "p":
            d.polygon(box, fill=255)
        else:
            d.rectangle(box, fill=255)
    m = ImageChops.multiply(m, region)
    lay = Image.new("RGBA", im.size, color + (0,))
    lay.putalpha(m.point(lambda v: int(v * alpha / 255)))
    im.alpha_composite(lay)


def lady():
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 1) 后发（整体剪影）
    d.rounded_rectangle([26, 14, 102, 124], radius=34, fill=HAIR_DK)
    # 2) 露肩 + 卫衣
    d.ellipse([24, 98, 104, 152], fill=SKIN)
    d.rounded_rectangle([20, 112, 108, 176], radius=22, fill=HOODIE)
    d.ellipse([40, 106, 88, 134], fill=HOODIE_SH)
    d.ellipse([46, 110, 82, 132], fill=HOODIE)
    # 3) 脖子 + 颈环
    d.rectangle([59, 82, 69, 112], fill=SKIN_SH)
    d.rectangle([57, 96, 71, 102], fill=DARK)
    d.rectangle([62, 98, 66, 102], fill=EMERALD)
    # 4) 脸（圆润方脸，别做尖下巴）
    d.rounded_rectangle([34, 22, 94, 92], radius=26, fill=SKIN)
    face = Image.new("L", (S, S), 0)
    ImageDraw.Draw(face).rounded_rectangle([34, 22, 94, 92], radius=26, fill=255)
    shade(im, face, [("r", [30, 24, 98, 54])], HAIR_DK, 40)          # 刘海投影
    shade(im, face, [("e", [64, 30, 120, 100])], SKIN_SH, 95)        # 右侧暗部
    shade(im, face, [("e", [36, 70, 48, 76])], BLUSH, 145)           # 腮红左
    shade(im, face, [("e", [80, 70, 92, 76])], BLUSH, 145)           # 腮红右
    # 5) 齐刘海 + 月牙高光
    d.rounded_rectangle([28, 12, 100, 52], radius=14, fill=HAIR)
    d.ellipse([36, 15, 72, 37], fill=HAIR_LT)
    d.ellipse([36, 22, 72, 44], fill=HAIR)
    d.rectangle([50, 20, 51, 38], fill=HAIR_MD)
    # 6) 侧发（收窄发片）
    d.polygon([(27, 34), (38, 30), (39, 96), (33, 124), (25, 124), (23, 88)], fill=HAIR)
    d.polygon([(101, 34), (90, 30), (89, 96), (95, 124), (103, 124), (105, 88)], fill=HAIR)
    d.polygon([(26, 34), (29, 32), (28, 124), (24, 124), (21, 88)], fill=HAIR_DK)
    d.polygon([(102, 34), (99, 32), (100, 124), (104, 124), (107, 88)], fill=HAIR_DK)
    d.rectangle([31, 44, 32, 74], fill=HAIR_LT)
    # 7) 眼睛
    for cx in (49, 79):
        d.ellipse([cx - 8, 59, cx + 8, 79], fill=IRIS)
        d.ellipse([cx - 7, 59, cx + 7, 69], fill=IRIS_LT)
        d.ellipse([cx - 7, 72, cx + 7, 79], fill=IRIS_DK)
        d.ellipse([cx - 3, 65, cx + 3, 75], fill=PUPIL)
        d.rectangle([cx - 7, 61, cx - 3, 66], fill=WHITE)
        d.rectangle([cx + 3, 72, cx + 5, 74], fill=(216, 232, 255))
        d.rounded_rectangle([cx - 8, 56, cx + 8, 59], radius=2, fill=EYE_DK)
        d.rectangle([cx + 8, 56, cx + 10, 58], fill=EYE_DK)
        d.rectangle([cx - 6, 79, cx + 6, 80], fill=EYE_DK)
    # 8) 鼻 / 嘴
    d.rectangle([63, 79, 65, 81], fill=SKIN_SH)
    d.rectangle([61, 84, 67, 85], fill=ROSE)
    d.rectangle([60, 83, 60, 83], fill=ROSE)
    d.rectangle([68, 83, 68, 83], fill=ROSE)
    # 9) 鱼发夹
    d.ellipse([80, 20, 90, 28], fill=HAIR_LT)
    d.polygon([(89, 19), (94, 16), (94, 31), (89, 28)], fill=HAIR_LT)
    d.rectangle([84, 23, 85, 24], fill=EYE_DK)
    # 10) 轮廓光
    d.rectangle([28, 24, 30, 40], fill=HAIR_HI)
    d.rectangle([29, 46, 30, 90], fill=HAIR_LT)
    return im


def bg(w, h, grid=16):
    y = np.linspace(0, 1, h)[:, None]
    arr = (np.array(NAVY_TOP) * (1 - y) + np.array(NAVY_BOT) * y).astype(np.uint8)
    arr = np.repeat(arr, w, axis=1).reshape(h, w, 3)
    xs, ys = np.arange(w)[None, :], np.arange(h)[:, None]
    dd = np.sqrt(((xs - w * 0.72) / (w * 0.55)) ** 2 + ((ys - h * 0.4) / (h * 0.62)) ** 2)
    arr = np.clip(arr.astype(np.float32) + (np.clip(1 - dd, 0, 1) ** 2 * 32)[:, :, None], 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, "RGB").convert("RGBA")
    d = ImageDraw.Draw(im)
    for x in range(0, w, grid):
        d.line([(x, 0), (x, h)], fill=GRID + (26,), width=1)
    for yy in range(0, h, grid):
        d.line([(0, yy), (w, yy)], fill=GRID + (26,), width=1)
    return im


def badge(im, xy, text, fs, fill=EMERALD, fg=WHITE, pad=(26, 12)):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT_BD, fs)
    b = d.textbbox((0, 0), text, font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    x, y = xy
    d.rounded_rectangle([x, y, x + w + pad[0] * 2, y + h + pad[1] * 2], radius=(h + pad[1] * 2) // 2, fill=fill)
    d.text((x + pad[0] - b[0], y + pad[1] - b[1]), text, font=f, fill=fg)


DINO = os.path.join(ASSETS, "ans-dino-cutout.png")
# ANS 小恐龙官方设定：薄荷绿 #9BE0C5 圆蛋身 + 头顶 3 个圆包 + 2 个黑色圆点眼
#              + 横向奶油白下脸块（小 U 微笑）+ 奶油白圆肚
D_MINT_LT, D_MINT, D_MINT_SH, D_MINT_DK = (190, 236, 212), (155, 224, 197), (126, 194, 166), (100, 164, 138)
D_CREAM, D_CREAM_SH, D_DARK = (251, 246, 233), (228, 218, 196), (44, 42, 46)


def dino_pixel(S2=64):
    """像素风小恐龙（手绘，严格对齐官网形象）"""
    im = Image.new("RGBA", (S2, S2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    shapes = [
        ("e", [7, 14, 57, 62]),      # 身体
        ("e", [15, 8, 27, 20]),      # 头顶包 1
        ("e", [26, 4, 38, 18]),      # 头顶包 2
        ("e", [37, 10, 49, 22]),     # 头顶包 3
        ("e", [1, 32, 15, 48]),      # 左手
        ("e", [49, 34, 63, 50]),     # 右手
        ("e", [15, 52, 31, 63]),     # 左脚
        ("e", [33, 52, 49, 63]),     # 右脚
        ("p", [(52, 42), (62, 38), (62, 54), (52, 50)]),  # 尾巴
    ]
    for kind, box in shapes:
        if kind == "e":
            d.ellipse(box, fill=D_MINT)
        else:
            d.polygon(box, fill=D_MINT)
    # 薄荷体块的明暗（先做，避免把奶油肚也涂脏）
    mm = Image.new("L", (S2, S2), 0)
    md = ImageDraw.Draw(mm)
    for kind, box in shapes:
        if kind == "e":
            md.ellipse(box, fill=255)
        else:
            md.polygon(box, fill=255)
    shade(im, mm, [("e", [32, 14, 68, 68])], D_MINT_SH, 120)
    shade(im, mm, [("e", [0, 10, 28, 46])], D_MINT_LT, 95)
    # 奶油肚 + 下脸块（中间留 3px 薄荷缝，别粘成一块）
    d.ellipse([16, 24, 48, 39], fill=D_CREAM)
    d.ellipse([19, 43, 45, 59], fill=D_CREAM)
    shade(im, mm, [("e", [30, 30, 68, 68])], D_CREAM_SH, 70)
    # 眼睛 + 小 U 微笑
    d.ellipse([19, 21, 25, 27], fill=D_DARK)
    d.ellipse([39, 21, 45, 27], fill=D_DARK)
    d.rectangle([31, 34, 34, 35], fill=D_DARK)
    d.rectangle([30, 33, 30, 33], fill=D_DARK)
    d.rectangle([35, 33, 35, 33], fill=D_DARK)
    return im


def dino_cut(h):
    d = Image.open(DINO).convert("RGBA")
    d = d.crop(d.getbbox())
    return d.resize((max(1, int(d.width * h / d.height)), h), Image.Resampling.LANCZOS)


def scrim(im, box, strength=200):
    x0, y0, x1, y1 = box
    g = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    xs = np.linspace(0, 1, x1 - x0)[None, :]
    g[:, :, 3] = (np.clip((1 - xs) * 1.25, 0, 1) ** 1.1) * strength
    g[:, :, :3] = np.array([6, 9, 22]) / 255.0
    im.alpha_composite(Image.fromarray((g * 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(18)), (x0, y0))


def cover(out, day, t1, t2, sub, note, chips=None, dino_h=258, dino_dx=0):
    CW, CH = 1920, 1080
    cv = bg(CW, CH, 32)
    sp = lady().resize((S * 8, S * 8), Image.Resampling.NEAREST)
    cv.alpha_composite(sp, (CW - sp.width + 20, CH - sp.height))
    dn = dino_pixel().resize((dino_h, dino_h), Image.Resampling.NEAREST)
    # 小恐龙（像素风）：贴右下角、完整落在声明条之上（不裁切、无阴影）
    cv.alpha_composite(dn, (CW - dn.width - 66, CH - 92 - dn.height - 6))
    scrim(cv, (0, 60, 1180, 840), 205)
    d = ImageDraw.Draw(cv)
    d.text((110, 92), day, font=ImageFont.truetype(FONT_BD, 42), fill=EMERALD)
    badge(cv, (110, 168), "AI 运营 · 日更", 30, fill=(24, 34, 72), fg=(150, 172, 255))
    d.text((104, 300), t1, font=ImageFont.truetype(FONT_BD, 112), fill=(255, 255, 255))
    d.text((104, 424), t2, font=ImageFont.truetype(FONT_BD, 112), fill=EMERALD)
    d.text((110, 588), sub, font=ImageFont.truetype(FONT_RG, 54), fill=(210, 220, 250))
    d.text((110, 670), note, font=ImageFont.truetype(FONT_RG, 38), fill=(152, 166, 206))
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


if __name__ == "__main__":
    W = H = 1024
    av = bg(W, H, 16)
    av.alpha_composite(lady().resize((S * 8, S * 8), Image.Resampling.NEAREST), (0, 0))
    badge(av, (W // 2 - 76, 878), "ANS", 50)
    d = ImageDraw.Draw(av)
    d.rectangle([0, 936, W, H], fill=(8, 12, 26, 240))
    f = ImageFont.truetype(FONT_RG, 26)
    t = "AI 运营中 · 非官方同人"
    b = d.textbbox((0, 0), t, font=f)
    d.text(((W - (b[2] - b[0])) // 2, 952), t, font=f, fill=(126, 142, 196))
    av.convert("RGB").save(os.path.join(ASSETS, "avatar-1024.png"))

    cover(os.path.join(ASSETS, "cover-day0-1920x1080.png"), "Day 0", "大肥鱼入职", "ANS 第一天",
          "KPI：把 ANS 和我自己都跑一遍", "选题 · 脚本 · 动画 · 运营 = AI ｜ 人类只按发布键")
    cover(os.path.join(ASSETS, "cover-day1-1920x1080.png"), "Day 1", "五个模型", "一道题",
          "同一个 Prompt，谁的交付能过审？", "模型名 / 版本号 / 推理档位全标注 ｜ 结果公开可复现",
          chips=["GPT-6 Astra", "Claude Opus 5.5", "DeepSeek V4.1 Flash", "Kimi K3", "GLM-5.3"])

    dino_pixel().resize((64 * 9, 64 * 9), Image.Resampling.NEAREST).save(os.path.join(ASSETS, "ans-dino-pixel.png"))
    pv = Image.new("RGB", (1024 + 560, 1024), (10, 14, 28))
    pv.paste(av.convert("RGB"), (0, 0))
    pv.paste(lady().crop((16, 4, 116, 120)).resize((100 * 5, 116 * 5), Image.Resampling.NEAREST).convert("RGB"), (1044, 40))
    pv.save(os.path.join(ASSETS, "lady-preview.png"))
    print("ok")