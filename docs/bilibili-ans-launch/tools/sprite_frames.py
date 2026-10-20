# -*- coding: utf-8 -*-
"""序列帧处理：抠白底（只删边界连通的外侧白）→ 切格 → 归一化对齐 → 存帧 + 精灵图 + GIF + 预览
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
GEN = os.path.join(ASSETS, "gen")
FRAMES = os.path.join(ASSETS, "dino-frames")
SPRITES = os.path.join(ASSETS, "dino-sprites")
FONT_BD = "C:/Windows/Fonts/msyhbd.ttc"

SETS = [
    # 权威 = 用户指定的「最早那批」；walk/memes/memes2 直接用权威原图，其余用权威板重出
    ("walk", "dino-anim-walk-2x4.png", 2, 4, ["走路 1", "走路 2", "走路 3", "走路 4", "走路 5", "走路 6", "走路 7", "走路 8"], 110),
    ("idle", "dino5-idle-2x4.png", 2, 4, ["站立", "闭眼打盹", "歪头", "翘尾巴", "举手挥手", "坐下休息", "打哈欠", "轻跳"], 220),
    ("actions", "dino5-actions-2x4.png", 2, 4, ["跳起", "挥手", "坐下", "躺睡", "举方块", "冲刺", "欢呼", "比心"], 180),
    ("memes", "dino-memes-3x3.png", 3, 3, ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "吃瓜", "摆烂", "震惊", "比心"], 600),
    ("memes2", "dino-memes2-3x3.png", 3, 3, ["敬礼", "求求", "笑滚", "裂开", "流汗", "磕头", "探头", "狂吃", "举牌"], 600),
    ("memes3", "dino5-memes3-3x3.png", 3, 3, ["摸鱼", "搬砖", "敲键盘", "打瞌睡", "暴富", "点赞", "暗中观察", "石化", "谢谢你"], 600),
    ("standup", "dino5-standup-2x2.png", 2, 2, ["坐着", "撑地", "半站", "站直"], 260),
]



def dilate(m, k=1):
    out = m.copy()
    for _ in range(k):
        o = out.copy()
        o[1:, :] |= out[:-1, :]; o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out


def cut_white_border(im, thr=242, k=3):
    """只把与画面边界连通的白色变透明（保住眼白、爆米花等内部白色）"""
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    near_white = (a[:, :, 0] >= thr) & (a[:, :, 1] >= thr) & (a[:, :, 2] >= thr)
    out = np.zeros_like(near_white)
    out[0, :] = near_white[0, :]; out[-1, :] = near_white[-1, :]
    out[:, 0] |= near_white[:, 0]; out[:, -1] |= near_white[:, -1]
    it = 0
    while it < 4000:
        grown = dilate(out, k) & near_white
        it += 1
        if grown.sum() == out.sum():
            break
        out = grown
    alpha = np.where(out, 0, 255).astype(np.uint8)
    al = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.7))
    rgba = np.dstack([a.astype(np.uint8), np.asarray(al)])
    return Image.fromarray(rgba, "RGBA"), it


def norm_frames(cells, pad=24):
    boxes = [c.getbbox() for c in cells]
    mw = max(b[2] - b[0] for b in boxes)
    mh = max(b[3] - b[1] for b in boxes)
    W, H = mw + pad * 2, mh + pad * 2
    out = []
    for c, b in zip(cells, boxes):
        piece = c.crop(b)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(piece, ((W - piece.width) // 2, H - pad - piece.height))  # 底部对齐
        out.append(canvas)
    return out, (W, H)


def qc_report(name, frames):
    """逐帧质检：① 墨量离群（可能结构断裂/缺件）② 相邻帧几乎相同（动画看不出变化）"""
    areas = []
    for f in frames:
        areas.append(int((np.asarray(f)[:, :, 3] > 40).sum()))
    med = int(np.median(areas)) or 1
    flags = []
    for i, a in enumerate(areas, 1):
        if abs(a - med) / med > 0.35:
            flags.append(f"帧{i} 墨量异常({a} / 中位 {med})")
    for i in range(len(frames) - 1):
        a1 = np.asarray(frames[i]).astype(np.int16)
        a2 = np.asarray(frames[i + 1]).astype(np.int16)
        diff = (np.abs(a1 - a2).max(axis=2) > 24).mean()
        if diff < 0.02:
            flags.append(f"帧{i + 1}↔{i + 2} 几乎相同({diff * 100:.1f}%)")
    print(f"[QC] {name}: {len(frames)} 帧，墨量中位 {med} — " + ("；".join(flags) if flags else "无异常"))


def main():
    os.makedirs(FRAMES, exist_ok=True); os.makedirs(SPRITES, exist_ok=True)
    preview_rows = []
    for name, fn, cols, rows, labels, dur in SETS:
        src = Image.open(os.path.join(GEN, fn)).convert("RGBA")
        cut, iterations = cut_white_border(src)
        W, H = cut.size
        cw, ch = W // cols, H // rows
        cells = [cut.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]
        frames, (fw, fh) = norm_frames(cells)
        d = os.path.join(FRAMES, name); os.makedirs(d, exist_ok=True)
        for i, f in enumerate(frames, 1):
            f.save(os.path.join(d, f"{i:02d}.png"))
        # 精灵图（单行）
        sheet = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, (i * fw, 0))
        sheet.save(os.path.join(SPRITES, f"{name}-sheet.png"))
        # GIF
        frames[0].save(os.path.join(ASSETS, f"dino-{name}.gif"), save_all=True, append_images=frames[1:],
                       duration=dur, loop=0, disposal=2, transparency=0)
        print(f"{name}: {len(frames)} frames {fw}x{fh}, floodfill iters={iterations}")
        qc_report(name, frames)
        preview_rows.append((name, frames, labels, (fw, fh)))

    # 预览胶片（深底 + 标签）
    maxn = max(len(r[1]) for r in preview_rows)
    cell = 200
    label_h = 34
    gap = 12
    Wp = 40 + maxn * (cell + gap)
    Hp = 40 + sum(cell + label_h + gap + 16 for _ in preview_rows)
    pv = Image.new("RGB", (Wp, Hp), (11, 16, 32))
    dd = ImageDraw.Draw(pv)
    f = ImageFont.truetype(FONT_BD, 20)
    y = 30
    for name, frames, labels, (fw, fh) in preview_rows:
        dd.text((24, y - 26), name, font=ImageFont.truetype(FONT_BD, 22), fill=(16, 185, 129))
        x = 24
        for fr, lab in zip(frames, labels):
            r = min(cell / fr.width, cell / fr.height)
            im = fr.resize((max(1, int(fr.width * r)), max(1, int(fr.height * r))), Image.Resampling.LANCZOS)
            box = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            box.alpha_composite(im, ((cell - im.width) // 2, (cell - im.height) // 2))
            pv.paste(box, (x, y), box)
            dd.text((x + 4, y + cell + 4), lab, font=f, fill=(160, 176, 220))
            x += cell + gap
        y += cell + label_h + gap + 16
    pv.save(os.path.join(ASSETS, "dino-frames-preview.png"))
    print("preview ->", os.path.join(ASSETS, "dino-frames-preview.png"))


if __name__ == "__main__":
    main()