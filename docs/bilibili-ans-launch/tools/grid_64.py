# -*- coding: utf-8 -*-
"""8x8 = 64 格：切格 → 边界洪泛抠白 → 归一化（居中+底部对齐）→ 64 帧 + 主图 + 8 行动画 + GIF + 总览 + 质检"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sprite_frames as sf

A = os.path.join(os.path.dirname(HERE), "assets")
SRC = os.path.join(A, "gen", "dino-grid-8x8.png")
OUT = os.path.join(A, "dino-grid")
ROWS = [
    ("01-基础待机", ["站立", "眨眼", "歪头", "摇尾", "举手", "坐下", "打哈欠", "轻跳"], 260),
    ("02-走路循环", [f"走{i}" for i in range(1, 9)], 110),
    ("03-跑动循环", [f"跑{i}" for i in range(1, 9)], 90),
    ("04-打工人", ["摸鱼", "搬砖", "敲键盘", "开会打盹", "接电话", "喝水", "举牌", "被追跑"], 400),
    ("05-情绪", ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "震惊", "摆烂", "比心"], 600),
    ("06-互动", ["敬礼", "求求", "笑滚", "裂开", "流汗", "磕头", "探头", "狂吃"], 600),
    ("07-动作", ["跳起", "挥手", "比心", "欢呼", "举方块", "躺睡", "背对", "回头"], 300),
    ("08-抽象网感", ["暴富", "暗中观察", "石化", "没电", "加载中", "冒烟", "发光", "缩成团"], 450),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    W, H = src.size
    cw, ch = W // 8, H // 8
    cells, iters = [], []
    for r in range(8):
        for c in range(8):
            cut, it = sf.cut_white_border(src.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
            cells.append(cut); iters.append(it)
    frames, (fw, fh) = sf.norm_frames(cells, pad=20)
    print(f"切格 {len(frames)} 格，归一化 {fw}x{fh}，洪泛迭代 {iters[0]}")
    for i, f in enumerate(frames, 1):
        f.save(os.path.join(OUT, f"{i:02d}.png"))
    # 主图 8x8
    master = Image.new("RGBA", (fw * 8, fh * 8), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        master.alpha_composite(f, ((i % 8) * fw, (i // 8) * fh))
    master.save(os.path.join(A, "dino-grid-8x8-master.png"))
    # 每行 = 一组动画
    sheets = os.path.join(A, "dino-sprites"); os.makedirs(sheets, exist_ok=True)
    for ri, (name, labels, dur) in enumerate(ROWS):
        grp = frames[ri * 8:(ri + 1) * 8]
        sh = Image.new("RGBA", (fw * 8, fh), (0, 0, 0, 0))
        for i, f in enumerate(grp):
            sh.alpha_composite(f, (i * fw, 0))
        sh.save(os.path.join(sheets, f"grid-{name}-sheet.png"))
        grp[0].save(os.path.join(A, f"dino-grid-{name}.gif"), save_all=True, append_images=grp[1:],
                    duration=dur, loop=0, disposal=2, transparency=0)
        sf.qc_report(name, grp)
    # 总览（带标签）
    cell = 190; gap = 10; lab = 30
    Wp = 30 + 8 * (cell + gap); Hp = 40 + 8 * (cell + lab + gap)
    pv = Image.new("RGB", (Wp, Hp), (11, 16, 32)); d = ImageDraw.Draw(pv)
    f = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 18)
    for ri, (name, labels, _) in enumerate(ROWS):
        y = 30 + ri * (cell + lab + gap)
        d.text((20, y - 22), name, font=ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 20), fill=(16, 185, 129))
        for ci in range(8):
            fr = frames[ri * 8 + ci]
            r = min(cell / fr.width, cell / fr.height)
            im = fr.resize((max(1, int(fr.width * r)), max(1, int(fr.height * r))), Image.Resampling.LANCZOS)
            box = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            box.alpha_composite(im, ((cell - im.width) // 2, (cell - im.height) // 2))
            x = 20 + ci * (cell + gap)
            pv.paste(box, (x, y), box)
            d.text((x + 4, y + cell + 2), labels[ci], font=f, fill=(160, 176, 220))
    pv.save(os.path.join(A, "dino-grid-preview.png"))
    print("preview ->", os.path.join(A, "dino-grid-preview.png"))


if __name__ == "__main__":
    main()
