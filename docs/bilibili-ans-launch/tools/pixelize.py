# -*- coding: utf-8 -*-
"""把官方小恐龙（伪 3D 黏土渲染）转成像素风，并可选加 1px 深色描边
产出: assets/ans-dino-pixel.png / assets/ans-dino-pixel-compare.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
SRC = os.path.join(ASSETS, "ans-dino-cutout.png")
OUTLINE = (22, 28, 66)
NAVY = (11, 16, 34)


def pixelize(src_path, grid=52, colors=9, scale=9, outline=True, pad=1):
    src = Image.open(src_path).convert("RGBA")
    src = src.crop(src.getbbox())
    small = src.resize((grid, grid), Image.Resampling.LANCZOS)
    alpha = small.split()[3]
    quant = small.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT,
                                           dither=Image.Dither.NONE).convert("RGB")
    W = grid + pad * 2
    canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    canvas.paste(quant, (pad, pad))
    a = Image.new("L", (W, W), 0)
    a.paste(alpha, (pad, pad))
    m = np.asarray(a) > 120
    dil = m.copy()
    dil[1:, :] |= m[:-1, :]; dil[:-1, :] |= m[1:, :]
    dil[:, 1:] |= m[:, :-1]; dil[:, :-1] |= m[:, 1:]
    arr = np.asarray(canvas.convert("RGB")).copy()
    if outline:
        arr[dil & ~m] = OUTLINE
    out = np.dstack([arr, np.where(dil, 255, 0)[:, :, None].repeat(3, 2)[:, :, 0:1] * 255]).astype(np.uint8)
    out[:, :, 3] = np.where(dil, 255, 0)
    im = Image.fromarray(out, "RGBA").resize((W * scale, W * scale), Image.Resampling.NEAREST)
    return im


if __name__ == "__main__":
    px = pixelize(SRC)
    px.save(os.path.join(ASSETS, "ans-dino-pixel.png"))
    # 对照：原黏土版 / 像素版 / 像素版放深底
    clay = Image.open(SRC).convert("RGBA")
    clay = clay.crop(clay.getbbox())
    side = 520
    c = Image.new("RGB", (side * 3 + 80, side + 90), (12, 16, 32))
    c.paste(clay.resize((side, side), Image.Resampling.LANCZOS).convert("RGB"), (20, 70))
    c.paste(px.resize((side, side), Image.Resampling.NEAREST).convert("RGB"), (side + 40, 70))
    dark = Image.new("RGBA", px.size, NAVY + (255,))
    dark.alpha_composite(px)
    c.paste(dark.resize((side, side), Image.Resampling.NEAREST).convert("RGB"), (side * 2 + 60, 70))
    d = ImageDraw.Draw(c)
    f = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 26)
    for i, t in enumerate(["原·伪3D黏土", "像素风（含描边）", "像素风 → 深底预览"]):
        d.text((22 + i * (side + 20), 26), t, font=f, fill=(222, 230, 255))
    c.save(os.path.join(ASSETS, "ans-dino-pixel-compare.png"))
    print("ok", px.size)
