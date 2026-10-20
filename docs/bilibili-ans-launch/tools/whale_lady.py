# -*- coding: utf-8 -*-
"""DeepSeek 鲸鱼娘 —— 纯代码像素风二创形象（对齐社区约定：DeepSeek 蓝 + 鲸鱼元素 + 双马尾鲸尾）
产出: assets/deepseek-whale-lady-1024.png / assets/deepseek-whale-lady-preview.png
说明: 同人二创，非深度求索官方形象。
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
S = 128
FONT_BD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_RG = "C:/Windows/Fonts/msyh.ttc"

SKIN, SKIN_SH = (255, 228, 208), (238, 191, 166)
BLUSH = (255, 152, 174)
DS_HI, DS_LT, DS_MD, DS, DS_DK, DS_DEEP = (216, 230, 255), (168, 194, 255), (110, 142, 255), (77, 107, 254), (44, 68, 196), (24, 40, 130)
EYE_DK, WHITE, PUPIL = (14, 20, 48), (255, 255, 255), (10, 16, 40)
SAILOR, SAILOR_SH, TIE = (249, 251, 255), (208, 218, 242), (77, 107, 254)
NAVY_TOP, NAVY_BOT, GRID = (12, 20, 52), (4, 7, 18), (30, 46, 96)
ROSE = (206, 96, 118)


def shade(im, region, shapes, color, alpha=90):
    m = Image.new("L", im.size, 0)
    dd = ImageDraw.Draw(m)
    for kind, box in shapes:
        (dd.ellipse if kind == "e" else dd.polygon)(box, fill=255)
    m = ImageChops.multiply(m, region)
    lay = Image.new("RGBA", im.size, color + (0,))
    lay.putalpha(m.point(lambda v: int(v * alpha / 255)))
    im.alpha_composite(lay)


def whale_lady():
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 0) 头顶喷水（紧凑的一小簇，鲸鱼换气）
    for box in ([54, 5, 60, 11], [62, 0, 67, 5], [50, 10, 55, 15]):
        d.ellipse(box, fill=DS_LT)
    # 1) 后发（收窄，给马尾留出间隙）
    d.rounded_rectangle([30, 12, 98, 120], radius=32, fill=DS_DK)
    d.ellipse([42, 14, 88, 60], fill=DS)
    # 2) 双马尾：细管 + 末端鲸尾叉（左右各一，与头发留 4px 缝）
    d.polygon([(24, 44), (34, 42), (30, 104), (20, 108), (10, 104), (14, 50)], fill=DS)
    d.polygon([(6, 106), (17, 100), (15, 122)], fill=DS)
    d.polygon([(17, 100), (28, 106), (19, 122)], fill=DS)
    d.polygon([(104, 44), (94, 42), (98, 104), (108, 108), (118, 104), (114, 50)], fill=DS)
    d.polygon([(122, 106), (111, 100), (113, 122)], fill=DS)
    d.polygon([(111, 100), (100, 106), (109, 122)], fill=DS)
    shade(im, Image.new("L", (S, S), 0).point(lambda v: 255), [("e", [62, 30, 132, 128])], DS_DEEP, 55)
    # 3) 露肩 + 水手领
    d.ellipse([26, 96, 102, 150], fill=SKIN)
    d.polygon([(42, 100), (64, 118), (86, 100), (94, 106), (64, 132), (34, 106)], fill=SAILOR)
    d.polygon([(46, 104), (64, 119), (82, 104), (78, 100), (64, 112), (50, 100)], fill=SAILOR_SH)
    d.polygon([(60, 112), (68, 112), (66, 126), (62, 126)], fill=TIE)
    # 4) 脖子 + 颈带
    d.rectangle([59, 84, 69, 112], fill=SKIN_SH)
    d.rectangle([57, 96, 71, 101], fill=DS_DK)
    # 5) 脸
    d.rounded_rectangle([34, 22, 94, 92], radius=26, fill=SKIN)
    face = Image.new("L", (S, S), 0)
    ImageDraw.Draw(face).rounded_rectangle([34, 22, 94, 92], radius=26, fill=255)
    shade(im, face, [("r", [30, 24, 98, 54])], DS_DK, 40)
    shade(im, face, [("e", [64, 30, 120, 100])], SKIN_SH, 95)
    shade(im, face, [("e", [36, 70, 48, 76])], BLUSH, 145)
    shade(im, face, [("e", [80, 70, 92, 76])], BLUSH, 145)
    # 6) 齐刘海 + 月牙高光
    d.rounded_rectangle([30, 12, 98, 52], radius=14, fill=DS)
    d.ellipse([38, 15, 74, 37], fill=DS_LT)
    d.ellipse([38, 22, 74, 44], fill=DS)
    d.rectangle([52, 20, 53, 38], fill=DS_MD)
    # 7) 侧发（贴脸的发片）
    d.polygon([(31, 34), (40, 30), (41, 96), (35, 120), (28, 120), (27, 88)], fill=DS)
    d.polygon([(97, 34), (88, 30), (87, 96), (93, 120), (100, 120), (101, 88)], fill=DS)
    d.rectangle([35, 44, 36, 74], fill=DS_LT)
    # 8) 眼睛
    for cx in (49, 79):
        d.ellipse([cx - 8, 59, cx + 8, 79], fill=DS)
        d.ellipse([cx - 7, 59, cx + 7, 69], fill=DS_MD)
        d.ellipse([cx - 7, 72, cx + 7, 79], fill=DS_DEEP)
        d.ellipse([cx - 3, 65, cx + 3, 75], fill=PUPIL)
        d.rectangle([cx - 7, 61, cx - 3, 66], fill=WHITE)
        d.rectangle([cx + 3, 72, cx + 5, 74], fill=DS_HI)
        d.rounded_rectangle([cx - 8, 56, cx + 8, 59], radius=2, fill=EYE_DK)
        d.rectangle([cx + 8, 56, cx + 10, 58], fill=EYE_DK)
        d.rectangle([cx - 6, 79, cx + 6, 80], fill=EYE_DK)
    # 9) 鼻 / 嘴
    d.rectangle([63, 79, 65, 81], fill=SKIN_SH)
    d.rectangle([61, 84, 67, 85], fill=ROSE)
    d.rectangle([60, 83, 60, 83], fill=ROSE)
    d.rectangle([68, 83, 68, 83], fill=ROSE)
    # 10) 鲸鱼发夹
    d.ellipse([80, 20, 92, 28], fill=DS_HI)
    d.polygon([(91, 19), (97, 15), (97, 31), (91, 28)], fill=DS_HI)
    d.rectangle([84, 23, 85, 24], fill=EYE_DK)
    # 11) 轮廓光
    d.rectangle([30, 24, 32, 40], fill=DS_HI)
    d.rectangle([31, 46, 32, 90], fill=DS_LT)
    return im


def bg(w, h, grid=16):
    y = np.linspace(0, 1, h)[:, None]
    arr = (np.array(NAVY_TOP) * (1 - y) + np.array(NAVY_BOT) * y).astype(np.uint8)
    arr = np.repeat(arr, w, axis=1).reshape(h, w, 3)
    xs, ys = np.arange(w)[None, :], np.arange(h)[:, None]
    dd = np.sqrt(((xs - w * 0.72) / (w * 0.55)) ** 2 + ((ys - h * 0.4) / (h * 0.62)) ** 2)
    arr = np.clip(arr.astype(np.float32) + (np.clip(1 - dd, 0, 1) ** 2 * 34)[:, :, None], 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, "RGB").convert("RGBA")
    dr = ImageDraw.Draw(im)
    for x in range(0, w, grid):
        dr.line([(x, 0), (x, h)], fill=GRID + (26,), width=1)
    for yy in range(0, h, grid):
        dr.line([(0, yy), (w, yy)], fill=GRID + (26,), width=1)
    return im


def badge(im, xy, text, fs, fill=(77, 107, 254), fg=WHITE, pad=(26, 12)):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT_BD, fs)
    b = d.textbbox((0, 0), text, font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    x, y = xy
    d.rounded_rectangle([x, y, x + w + pad[0] * 2, y + h + pad[1] * 2], radius=(h + pad[1] * 2) // 2, fill=fill)
    d.text((x + pad[0] - b[0], y + pad[1] - b[1]), text, font=f, fill=fg)


if __name__ == "__main__":
    W = H = 1024
    av = bg(W, H, 16)
    av.alpha_composite(whale_lady().resize((S * 8, S * 8), Image.Resampling.NEAREST), (0, 0))
    badge(av, (W // 2 - 128, 878), "DeepSeek", 44)
    d = ImageDraw.Draw(av)
    d.rectangle([0, 936, W, H], fill=(8, 12, 26, 240))
    f = ImageFont.truetype(FONT_RG, 26)
    t = "鲸鱼娘 · 同人二创 · 非官方形象"
    b = d.textbbox((0, 0), t, font=f)
    d.text(((W - (b[2] - b[0])) // 2, 952), t, font=f, fill=(126, 142, 196))
    av.convert("RGB").save(os.path.join(ASSETS, "deepseek-whale-lady-1024.png"))
    pv = Image.new("RGB", (1024 + 560, 1024), (10, 14, 28))
    pv.paste(av.convert("RGB"), (0, 0))
    pv.paste(whale_lady().crop((0, 0, 128, 128)).resize((560, 560), Image.Resampling.NEAREST).convert("RGB"), (1060, 220))
    pv.save(os.path.join(ASSETS, "deepseek-whale-lady-preview.png"))
    print("ok")