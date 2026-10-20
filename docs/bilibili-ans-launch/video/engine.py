# -*- coding: utf-8 -*-
"""ANS 短视频合成引擎：1080x1920 竖屏，像素 IP + 文字 + 真实截图 + 转场 → PNG 序列"""
import os, math, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30
ASSETS = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
SHOTS = os.path.join(ASSETS, "shots")
OUT = r"E:\codex\ans\docs\bilibili-ans-launch\video\day0"
FONT_B = "C:/Windows/Fonts/msyhbd.ttc"
FONT_R = "C:/Windows/Fonts/msyh.ttc"

# 品牌色
MINT = (155, 224, 197)
MINT_D = (86, 178, 150)
CREAM = (251, 246, 233)
NAVY = (16, 24, 48)
NAVY_2 = (26, 40, 82)
PINK = (255, 138, 168)
GOLD = (255, 206, 84)

def font(size, bold=True):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)

def bg_gradient(top=NAVY, bottom=NAVY_2, size=(W, H)):
    im = Image.new("RGB", size, top)
    d = ImageDraw.Draw(im)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        d.line([(0, y), (size[0], y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return im

def dots_overlay(im, step=48, color=(255, 255, 255), alpha=10):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(0, im.size[0], step):
        for y in range(0, im.size[1], step):
            d.ellipse([x, y, x + 2, y + 2], fill=color + (alpha,))
    return Image.alpha_composite(im.convert("RGBA"), layer)

# ---------- 像素精灵 ----------
def load_frames(folder):
    return [Image.open(f).convert("RGBA") for f in sorted(glob.glob(os.path.join(ASSETS, folder, "*.png")))]

G1 = load_frames("dino-grid")
G2 = load_frames("dino-grid2")

def sprite(frames, row, col, height):
    """取某行某帧，缩放到指定高度（NEAREST 保持像素硬边）"""
    im = frames[row * 8 + (col % 8)]
    r = height / im.height
    return im.resize((max(1, int(im.width * r)), height), Image.Resampling.NEAREST)

def paste_center(canvas, im, cx, cy):
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

# ---------- 文字 ----------
def wrap(draw, text, fnt, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur); cur = ""; continue
        if draw.textlength(cur + ch, font=fnt) <= max_w:
            cur += ch
        else:
            lines.append(cur); cur = ch
    if cur: lines.append(cur)
    return lines

def draw_text_block(canvas, text, size, cx, cy, fill=CREAM, max_w=W - 160, align="center", line_gap=16, shadow=True):
    fnt = font(size)
    d = ImageDraw.Draw(canvas)
    lines = wrap(d, text, fnt, max_w)
    lh = size + line_gap
    total = lh * len(lines)
    y = cy - total / 2
    for ln in lines:
        wpx = d.textlength(ln, font=fnt)
        x = cx - wpx / 2 if align == "center" else cx
        if shadow:
            d.text((x + 4, y + 4), ln, font=fnt, fill=(0, 0, 0, 160))
        d.text((x, y), ln, font=fnt, fill=fill)
        y += lh
    return total

def hextech_title(canvas, text, size, cx, cy, accent=MINT):
    """主标题：带品牌色底衬"""
    fnt = font(size); d = ImageDraw.Draw(canvas)
    wpx = d.textlength(text, font=fnt)
    pad = 28
    d.rounded_rectangle([cx - wpx / 2 - pad, cy - size * 0.75, cx + wpx / 2 + pad, cy + size * 0.75],
                        radius=18, fill=(0, 0, 0, 110), outline=accent + (200,), width=3)
    d.text((cx - wpx / 2, cy - size * 0.62), text, font=fnt, fill=CREAM)

# ---------- 截图 ----------
def screenshot(name, box_w, radius=28):
    p = os.path.join(SHOTS, name)
    if not os.path.exists(p): return None
    im = Image.open(p).convert("RGB")
    r = box_w / im.width
    im = im.resize((box_w, max(1, int(im.height * r))), Image.Resampling.LANCZOS)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out

def paste_screenshot(canvas, name, cx, cy, box_w, tilt=0):
    im = screenshot(name, box_w)
    if im is None: return False
    if tilt:
        im = im.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    # 阴影
    sh = Image.new("RGBA", (im.width + 60, im.height + 60), (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", im.size, (0, 0, 0, 130)), (30, 34), im.split()[3])
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(sh, (int(cx - im.width / 2 - 30), int(cy - im.height / 2 - 30)))
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
    return True

def ease_out(t):
    return 1 - (1 - t) ** 3

def shot_bg(kind=0):
    palette = [(NAVY, NAVY_2), ((14, 30, 26), (22, 52, 44)), ((30, 18, 40), (52, 26, 66))]
    im = bg_gradient(*palette[kind % len(palette)])
    return dots_overlay(im)

def brand_bar(canvas, progress, title="大肥鱼在ANS当运营"):
    """顶部：品牌条 + 进度条（竖屏完播率装置）"""
    d = ImageDraw.Draw(canvas)
    fnt = font(30)
    wpx = d.textlength(title, font=fnt)
    d.rounded_rectangle([50, 52, 50 + wpx + 44, 116], radius=999, fill=(8, 12, 28, 190), outline=MINT + (200,), width=2)
    d.text((72, 70), title, font=fnt, fill=CREAM)
    d.rounded_rectangle([50, 140, W - 50, 148], radius=4, fill=(38, 50, 78))
    d.rounded_rectangle([50, 140, 50 + (W - 100) * max(0.0, min(1.0, progress)), 148], radius=4, fill=MINT)


def bg_deco(canvas, t, seed=0):
    """背景：缓慢移动的像素点阵 + 巨大淡恐龙剪影"""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    step = 60
    off = int((t * 14) % step)
    for x in range(-step, W + step, step):
        for y in range(-step, H + step, step):
            d.rectangle([x + off, y + off, x + off + 3, y + off + 3], fill=(255, 255, 255, 14))
    canvas.alpha_composite(layer)
    # 淡剪影
    try:
        im = sprite(G1, 0, 0, 900)
        im = im.copy()
        a = im.split()[3].point(lambda v: int(v * 0.07))
        im.putalpha(a)
        paste_center(canvas, im, W / 2, H / 2 + 60)
    except Exception:
        pass


def checklist(canvas, items, done_until, cx, cy, width=620):
    """打勾清单卡"""
    d = ImageDraw.Draw(canvas)
    row = 84
    h = row * len(items) + 44
    d.rounded_rectangle([cx - width / 2, cy - h / 2, cx + width / 2, cy + h / 2], radius=26,
                        fill=(10, 16, 34, 215), outline=(70, 92, 130, 255), width=2)
    fnt = font(40)
    for i, it in enumerate(items):
        y = cy - h / 2 + 22 + i * row
        done = i < done_until
        d.text((cx - width / 2 + 40, y), "✓" if done else "○", font=fnt, fill=MINT if done else (90, 108, 140))
        d.text((cx - width / 2 + 108, y), it, font=fnt, fill=CREAM if done else (120, 136, 168))


def mini_atlas(canvas, frames, cx, cy, cell=72, lit=None):
    """8x8 迷你图集，亮起当前帧"""
    n = 8
    total = n * cell
    x0, y0 = cx - total / 2, cy - total / 2
    for i in range(64):
        r, c = i // 8, i % 8
        im = frames[i]
        rr = (cell - 8) / im.height
        im = im.resize((max(1, int(im.width * rr)), cell - 8), Image.Resampling.NEAREST)
        if lit is not None and i == lit % 64:
            d0 = ImageDraw.Draw(canvas)
            d0.rounded_rectangle([x0 + c * cell, y0 + r * cell, x0 + (c + 1) * cell, y0 + (r + 1) * cell],
                                 radius=8, fill=(155, 224, 197, 90))
        canvas.alpha_composite(im, (int(x0 + c * cell + (cell - im.width) / 2), int(y0 + r * cell + 4)))


def save(frame, idx):
    os.makedirs(OUT, exist_ok=True)
    frame.convert("RGB").save(os.path.join(OUT, f"f{idx:05d}.png"))

print("engine loaded:", W, "x", H, "| 帧素材:", len(G1), "+", len(G2), "| 截图目录存在:", os.path.isdir(SHOTS))
