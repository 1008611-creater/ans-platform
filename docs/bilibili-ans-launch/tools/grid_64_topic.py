# -*- coding: utf-8 -*-
"""8x8 = 64 格：切格 → 边界洪泛抠白 → 归一化（居中+底部对齐）→ 64 帧 + 主图 + 8 行动画 + GIF + 总览 + 质检"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sprite_frames as sf

A = os.path.join(os.path.dirname(HERE), "assets")
SRC = os.path.join(A, "gen", "dino-grid2-8x8.png")
OUT = os.path.join(A, "dino-grid2")
ROWS = [
    ("01-日常作息", ["起床", "刷牙", "吃早饭", "通勤", "打卡", "午休", "下班", "睡觉"], 400),
    ("02-春节", ["贴春联", "挂灯笼", "收红包", "抱拳拜年", "吃饺子", "放鞭炮", "舞狮", "守岁"], 400),
    ("03-节日杂烩", ["中秋月饼", "端午粽子", "儿童节气球", "万圣南瓜", "圣诞树", "生日蛋糕", "情人节比心", "618购物车"], 400),
    ("04-办公场景", ["工位", "举手提问", "白板讲解", "开会点头", "交报告", "摸鱼被抓", "深夜加班", "摸鱼成功"], 400),
    ("05-直播运营", ["举相机", "打板开拍", "直播比心", "剪辑中", "上传进度", "数据暴涨", "掉粉震惊", "破万庆祝"], 400),
    ("06-设备技术", ["充电", "断网", "加载中", "报错", "修电脑", "宕机冒烟", "重启恢复", "信号满格"], 400),
    ("07-抽象第二弹", ["大脑爆炸", "血压升高", "灵魂出窍", "原地蒸发", "像素方块", "头顶问号", "头顶灯泡", "数据狂飙"], 400),
    ("08-与大小姐互动", ["递文件", "被敲头", "被摸头", "躲身后", "举牌加油", "递咖啡", "一起比心", "一起欢呼"], 400),
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
    master.save(os.path.join(A, "dino-grid2-8x8-master.png"))
    # 每行 = 一组动画
    sheets = os.path.join(A, "dino-sprites"); os.makedirs(sheets, exist_ok=True)
    for ri, (name, labels, dur) in enumerate(ROWS):
        grp = frames[ri * 8:(ri + 1) * 8]
        sh = Image.new("RGBA", (fw * 8, fh), (0, 0, 0, 0))
        for i, f in enumerate(grp):
            sh.alpha_composite(f, (i * fw, 0))
        sh.save(os.path.join(sheets, f"grid2-{name}-sheet.png"))
        grp[0].save(os.path.join(A, f"dino-grid2-{name}.gif"), save_all=True, append_images=grp[1:],
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
    pv.save(os.path.join(A, "dino-grid2-preview.png"))
    print("preview ->", os.path.join(A, "dino-grid2-preview.png"))


if __name__ == "__main__":
    main()