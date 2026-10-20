# -*- coding: utf-8 -*-
"""清理 ANS 小恐龙吉祥物底部的灰色残影 / 投影（不覆盖原文件）
思路：薄荷绿+奶油肚 = 可靠核心 → 填洞得到物体（保住黑眼睛）→ 只在物体外剔除灰影/投影
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
SRC = r"E:\codex\ans\public\mascot\ans-mascot.png"

src = Image.open(SRC).convert("RGBA")
arr = np.asarray(src).astype(np.float32)
rgb, alpha = arr[:, :, :3], arr[:, :, 3]
H, W, _ = rgb.shape
R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
spread = rgb.max(2) - rgb.min(2)
lum = rgb.mean(2)
inside_card = alpha > 8

blur_mask = lambda m, r: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
blur_img = lambda i, r: np.asarray(Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)

def dilate(mask, it=1):
    out = mask.copy()
    for _ in range(it):
        o = out.copy()
        o[1:, :] |= out[:-1, :]; o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out
erode = lambda m, it=1: ~dilate(~m, it)

# 1) 核心色块
mint = (G - R > 12) & (G - B > 10)
cream = (R > 170) & (R - B > 15) & (G - B > 5) & (lum >= 212)
core = mint | cream
mi = Image.fromarray((core * 255).astype(np.uint8))
mi = mi.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
core = np.asarray(mi) > 127

# 2) 填洞：从图像边界洪泛（矩形内膨胀），没被连通到的「非核心」像素 = 物体内部（黑眼睛 / AO 缝）
comp = ~core
outside = np.zeros_like(comp)
outside[0, :] = comp[0, :]; outside[-1, :] = comp[-1, :]
outside[:, 0] |= comp[:, 0]; outside[:, -1] |= comp[:, -1]
for _ in range(20000):
    grown = dilate(outside, 1) & comp
    if grown.sum() == outside.sum():
        break
    outside = grown
obj = core | (comp & ~outside)
obj_d = dilate(obj, 2)
print("core:", int(core.sum()), "| obj:", int(obj.sum()), "| filled holes:", int(obj.sum() - core.sum()))

# 3) 背景模型：紫色像素二次曲面拟合
base = np.array([196.0, 171.0, 238.0])
conf = inside_card & (np.abs(rgb - base).sum(2) < 60) & (~core)
yy, xx = np.mgrid[0:H, 0:W]
xs = xx / W - 0.5; ys = yy / H - 0.5
feat = np.stack([np.ones_like(xs), xs, ys, xs * xs, ys * ys, xs * ys,
                 xs ** 3, ys ** 3, xs * xs * ys, xs * ys * ys, (xs * xs + ys * ys) ** 2], -1)
sel = conf & (np.mod(yy, 2) == 0) & (np.mod(xx, 2) == 0)
A = feat[sel]
bg_model = np.zeros_like(rgb)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, rgb[:, :, c][sel], rcond=None)
    bg_model[:, :, c] = (feat * coef).sum(-1)
bg_model = blur_img(bg_model, 8)

# 4) 残影只在物体之外剔除（中性灰块 / 暖灰投影）
neutral = spread <= 22
warm_shadow = (R - B > 15) & (G - B > 5) & (lum < 213)
artifact = inside_card & (~obj) & (neutral | warm_shadow)
# 局部背景回填（用紧邻的干净背景像素），避免全局拟合产生亮度接缝；极端处兜底用 bg_model
w = blur_mask(dilate(artifact, 1).astype(np.float32), 5)[:, :, None]
clean_rgb = rgb * (1 - w) + bg_model * w
Image.fromarray(np.clip(np.dstack([clean_rgb, alpha]), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(ASSETS, "ans-mascot-clean.png"))

# 5) 透明抠图（物体内保留原始 RGB：眼睛/AO 都在；只对边缘去紫边）
hard = erode(obj, 1)
edge_color = blur_img(rgb * obj[:, :, None], 2) / np.maximum(blur_mask(obj, 2)[:, :, None], 1e-3)
al = np.clip((blur_mask(hard, 1.0) - 0.30) / 0.45, 0, 1)
rgb_out = np.where((al < 0.92)[:, :, None], edge_color, rgb)
Image.fromarray(np.clip(np.dstack([rgb_out, al * 255]), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(ASSETS, "ans-dino-cutout.png"))
print("opaque px:", int((al > 0.5).sum()), "| artifact:", int(artifact.sum()))

# 6) 对照图
BOX = (250, 620, 1500, 1500)
Z = (860, 1150, 1500, 1500)
FACE = (380, 380, 1160, 800)
pw = 296
def panel(im, box):
    return im.convert("RGB").resize((pw, pw), Image.Resampling.LANCZOS)
clean = Image.open(os.path.join(ASSETS, "ans-mascot-clean.png"))
cut = Image.open(os.path.join(ASSETS, "ans-dino-cutout.png"))
dark = Image.new("RGBA", cut.size, (11, 16, 32, 255)); dark.alpha_composite(cut)
items = [(src, BOX, "原图：灰影 + 硬边"), (clean, BOX, "修后：保留紫卡"), (dark, BOX, "抠图：透明 → 深底"),
         (src, Z, "原图放大：罪魁祸首"), (clean, Z, "修后放大：灰影没了"), (clean, FACE, "修后脸部：眼睛完好")]
canvas = Image.new("RGB", (pw * len(items) + 20 * (len(items) + 1), pw + 80), (12, 16, 32))
for i, (im, box, label) in enumerate(items):
    canvas.paste(panel(im.crop(box), box), (20 + i * (pw + 20), 60))
d = ImageDraw.Draw(canvas)
f = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 22)
for i, (_, _, label) in enumerate(items):
    d.text((22 + i * (pw + 20), 20), label, font=f, fill=(220, 228, 255))
canvas.save(os.path.join(ASSETS, "ans-mascot-compare.png"))
print("ok")
