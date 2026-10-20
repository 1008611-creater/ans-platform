# -*- coding: utf-8 -*-
"""像素完美处理 + 前后对比"""
import os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
ART_H = 120          # 原生像素高度（对齐模型实际细节密度）
PALETTE_N = 20       # 颜色量化档位

def load_frame(path):
    im = Image.open(path).convert("RGBA")
    al = np.asarray(im)[:, :, 3] > 40
    ys = np.where(al.any(1))[0]; xs = np.where(al.any(0))[0]
    return im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))

def pixel_snap(im, canvas=256, up=None):
    r = ART_H / im.height
    small = im.resize((max(1, round(im.width * r)), ART_H), Image.Resampling.BOX)
    a = np.array(small)
    a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    small = Image.fromarray(a, "RGBA")
    rgb = small.convert("RGB").quantize(colors=PALETTE_N, method=Image.MEDIANCUT).convert("RGB")
    rgb.putalpha(small.getchannel("A"))
    up = up or max(1, canvas // ART_H)
    big = rgb.resize((rgb.width * up, rgb.height * up), Image.Resampling.NEAREST)
    box = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    if big.width > canvas or big.height > canvas:
        big = big.resize((min(big.width, canvas), min(big.height, canvas)), Image.Resampling.NEAREST)
    box.alpha_composite(big, ((canvas - big.width) // 2, canvas - big.height - 4))
    return box, small

if __name__ == "__main__":
    f = sorted(glob.glob(os.path.join(A, "dino-grid", "*.png")))[14]     # 大笑
    src = load_frame(f)
    # 旧做法（LANCZOS 直接缩）
    old = Image.new("RGBA", (256, 256), (12, 16, 32, 255))
    o = src.resize((int(src.width*256/src.height), 256), Image.Resampling.LANCZOS)
    old.alpha_composite(o, ((256-o.width)//2, 0))
    # 新做法（像素完美）
    new, _ = pixel_snap(src, 256)
    dark = Image.new("RGBA", (256, 256), (12, 16, 32, 255)); dark.alpha_composite(new)
    # 放大 3 倍看边缘
    scale = 3
    canvas = Image.new("RGB", (256*scale*2 + 60, 256*scale + 70), (11, 16, 32))
    canvas.paste(old.resize((256*scale, 256*scale), Image.Resampling.NEAREST).convert("RGB"), (20, 50))
    canvas.paste(dark.resize((256*scale, 256*scale), Image.Resampling.NEAREST).convert("RGB"), (256*scale + 40, 50))
    d = ImageDraw.Draw(canvas)
    fnt = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 26)
    d.text((22, 14), "旧：LANCZOS 缩放 → 发虚、边缘糊", font=fnt, fill=(255, 140, 140))
    d.text((256*scale + 42, 14), "新：原生网格 + NEAREST → 硬边清晰", font=fnt, fill=(120, 240, 180))
    canvas.save(os.path.join(A, "_pixel_crisp_compare.png"))
    print("compare ->", os.path.join(A, "_pixel_crisp_compare.png"))
