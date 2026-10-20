# -*- coding: utf-8 -*-
"""① 网页用精灵图集（1x/2x）② GIF 动态表情包 ③ 贴纸总览 ④ manifest.json"""
import os, json, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
PUB = r"E:\codex\ans\public\mascot\pixel"
ST = os.path.join(A, "dino-stickers")
os.makedirs(PUB, exist_ok=True); os.makedirs(ST, exist_ok=True)

ROWS = [
    ("idle",   "dino-grid",  ["站立", "眨眼", "歪头", "摇尾", "举手", "坐下", "打哈欠", "轻跳"], 260),
    ("walk",   "dino-grid",  [f"走{i}" for i in range(1, 9)], 110),
    ("run",    "dino-grid",  [f"跑{i}" for i in range(1, 9)], 90),
    ("work",   "dino-grid",  ["摸鱼", "搬砖", "敲键盘", "开会打盹", "接电话", "喝水", "举牌", "被追跑"], 400),
    ("emote",  "dino-grid",  ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "震惊", "摆烂", "比心"], 600),
    ("react",  "dino-grid",  ["敬礼", "求求", "笑滚", "裂开", "流汗", "磕头", "探头", "狂吃"], 600),
    ("action", "dino-grid",  ["跳起", "挥手", "比心", "欢呼", "举方块", "躺睡", "背对", "回头"], 300),
    ("meme",   "dino-grid",  ["暴富", "暗中观察", "石化", "没电", "加载中", "冒烟", "发光", "缩成团"], 450),
    ("daily",  "dino-grid2", ["起床", "刷牙", "吃早饭", "通勤", "打卡", "午休", "下班", "睡觉"], 400),
    ("spring", "dino-grid2", ["贴春联", "挂灯笼", "收红包", "抱拳拜年", "吃饺子", "放鞭炮", "舞狮", "守岁"], 400),
    ("holiday","dino-grid2", ["中秋月饼", "端午粽子", "儿童节气球", "万圣南瓜", "圣诞树", "生日蛋糕", "情人节比心", "618购物车"], 400),
    ("office", "dino-grid2", ["工位", "举手提问", "白板讲解", "开会点头", "交报告", "摸鱼被抓", "深夜加班", "摸鱼成功"], 400),
    ("stream", "dino-grid2", ["举相机", "打板开拍", "直播比心", "剪辑中", "上传进度", "数据暴涨", "掉粉震惊", "破万庆祝"], 400),
    ("device", "dino-grid2", ["充电", "断网", "加载中", "报错", "修电脑", "宕机冒烟", "重启恢复", "信号满格"], 400),
    ("abstract","dino-grid2",["大脑爆炸", "血压升高", "灵魂出窍", "原地蒸发", "像素方块", "头顶问号", "头顶灯泡", "数据狂飙"], 400),
    ("duo",    "dino-grid2", ["递文件", "被敲头", "被摸头", "躲身后", "举牌加油", "递咖啡", "一起比心", "一起欢呼"], 400),
]

def load_frames(folder):
    return [Image.open(f).convert("RGBA") for f in sorted(glob.glob(os.path.join(A, folder, "*.png")))]

G1, G2 = load_frames("dino-grid"), load_frames("dino-grid2")
ALL = {"dino-grid": G1, "dino-grid2": G2}

def hard_alpha(im):
    a = np.array(im, dtype=np.uint8)
    a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    return Image.fromarray(a, "RGBA")

ART_H = 120   # 原生像素高度（实测：模型像素块密度 ~120）


def cell(img, size, bottom=True):
    """像素完美：BOX 降到原生网格 → 硬 alpha → NEAREST 整数放大（绝不用 LANCZOS）"""
    art_h = ART_H if size >= 200 else max(1, size - 16)
    r = art_h / img.height
    small = img.resize((max(1, round(img.width * r)), art_h), Image.Resampling.BOX)
    a = np.array(small)
    a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    small = Image.fromarray(a, "RGBA")
    up = max(1, round(size / art_h))
    big = small.resize((small.width * up, small.height * up), Image.Resampling.NEAREST)
    if big.width > size:
        cut = (big.width - size) // 2
        big = big.crop((cut, 0, cut + size, big.height))
    if big.height > size:
        big = big.crop((0, big.height - size, big.width, big.height))
    box = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    box.alpha_composite(big, ((size - big.width) // 2, size - big.height - 4 if bottom else (size - big.height) // 2))
    return box

# ---------- ① 网页精灵图集 ----------
manifest = {"atlas": "dino-atlas.png", "cell": 128, "cols": 8, "rows": 8, "states": {}}
for i, size in enumerate((128, 256)):
    atlas = Image.new("RGBA", (size * 8, size * 8), (0, 0, 0, 0))
    for ri, (state, folder, labels, dur) in enumerate(ROWS):
        frames = ALL[folder][ri * 8:(ri + 1) * 8]
        for ci, f in enumerate(frames):
            atlas.alpha_composite(cell(f, size), (ci * size, ri * size))
    name = "dino-atlas.png" if size == 128 else "dino-atlas@2x.png"
    atlas.save(os.path.join(PUB, name))
    print("atlas ->", name, atlas.size)
for ri, (state, folder, labels, dur) in enumerate(ROWS):
    manifest["states"][state] = {"row": ri, "frames": 8, "durationMs": dur, "labels": labels}
manifest["atlas2x"] = "dino-atlas@2x.png"
open(os.path.join(PUB, "manifest.json"), "w", encoding="utf-8").write(json.dumps(manifest, ensure_ascii=False, indent=1))
print("manifest ->", len(manifest["states"]), "states")

# ---------- ② GIF 动态表情包 ----------
MOTION = {  # 合成小动作：位移/缩放序列
    "shake":  [("dx", 3), ("dx", -3), ("dx", 2)],
    "tremble":[("dx", 2), ("dx", -2), ("dx", 2), ("dx", -2)],
    "bounce": [("s", 1.0), ("s", 1.07), ("s", 1.0)],
    "nod":    [("dy", 2), ("dy", -2)],
    "pulse":  [("s", 1.0), ("s", 1.05)],
}

def motion_frames(base, kind, size=256):
    out = []
    for op in MOTION.get(kind, MOTION["bounce"]):
        k, v = op
        f = base
        if k == "dx":
            canvas = Image.new("RGBA", (size + 12, size), (0, 0, 0, 0))
            canvas.alpha_composite(f, (6 + int(v), 0)); f = canvas
        elif k == "dy":
            canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            canvas.alpha_composite(f, (0, int(v))); f = canvas
        else:
            n = int(size * v)
            r = f.resize((n, n), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            canvas.alpha_composite(r, ((size - n) // 2, size - n)); f = canvas
        out.append(hard_alpha(f))
    return out

SINGLES = [  # (文件名, 源, 行, 列, 动作)
    ("爆哭", "dino-grid", 4, 0, "shake"), ("气鼓鼓", "dino-grid", 4, 1, "tremble"),
    ("大笑", "dino-grid", 4, 2, "bounce"), ("懵圈", "dino-grid", 4, 3, "pulse"),
    ("无语", "dino-grid", 4, 4, "nod"), ("震惊", "dino-grid", 4, 5, "shake"),
    ("摆烂", "dino-grid", 4, 6, "pulse"), ("比心", "dino-grid", 4, 7, "bounce"),
    ("敬礼", "dino-grid", 5, 0, "bounce"), ("求求", "dino-grid", 5, 1, "nod"),
    ("裂开", "dino-grid", 5, 3, "tremble"), ("流汗", "dino-grid", 5, 4, "shake"),
    ("磕头", "dino-grid", 5, 5, "nod"), ("探头", "dino-grid", 5, 6, "pulse"),
    ("狂吃", "dino-grid", 5, 7, "bounce"), ("摸鱼", "dino-grid", 3, 0, "pulse"),
    ("搬砖", "dino-grid", 3, 1, "shake"), ("敲键盘", "dino-grid", 3, 2, "tremble"),
    ("开会打盹", "dino-grid", 3, 3, "nod"), ("被追跑", "dino-grid", 3, 7, "shake"),
    ("暴富", "dino-grid", 7, 0, "bounce"), ("石化", "dino-grid", 7, 2, "pulse"),
    ("没电", "dino-grid", 7, 3, "nod"), ("加载中", "dino-grid", 7, 4, "pulse"),
    ("冒烟", "dino-grid", 7, 5, "shake"), ("发光", "dino-grid", 7, 6, "pulse"),
    ("收红包", "dino-grid2", 1, 2, "bounce"), ("舞狮", "dino-grid2", 1, 6, "shake"),
    ("数据暴涨", "dino-grid2", 4, 5, "bounce"), ("宕机冒烟", "dino-grid2", 5, 5, "shake"),
    ("大脑爆炸", "dino-grid2", 6, 0, "tremble"), ("灵魂出窍", "dino-grid2", 6, 2, "nod"),
    ("递咖啡", "dino-grid2", 7, 5, "bounce"), ("一起比心", "dino-grid2", 7, 6, "bounce"),
]
thumbs = []
for name, folder, ri, ci, kind in SINGLES:
    base = cell(ALL[folder][ri * 8 + ci], 256)
    fr = motion_frames(base, kind)
    fr[0].save(os.path.join(ST, f"{name}.gif"), save_all=True, append_images=fr[1:],
               duration=140, loop=0, disposal=2, transparency=0)
    thumbs.append((name, base))
print("single stickers ->", len(SINGLES))

loops = 0
for state, folder, labels, dur in ROWS:
    ri = [r[0] for r in ROWS].index(state)
    local = ri % 8          # 组内行号（每个分组只有 8 行 64 帧）
    fr = [hard_alpha(cell(f, 256)) for f in ALL[folder][local * 8:(local + 1) * 8]]
    fr[0].save(os.path.join(ST, f"loop-{state}.gif"), save_all=True, append_images=fr[1:],
               duration=dur, loop=0, disposal=2, transparency=0)
    loops += 1
print("loop stickers ->", loops)

# ---------- ③ 总览 ----------
cols = 9; s = 150; pad = 10; lab = 26
rows_n = (len(thumbs) + cols - 1) // cols
pv = Image.new("RGB", (30 + cols * (s + pad), 40 + rows_n * (s + lab + pad)), (11, 16, 32))
d = ImageDraw.Draw(pv); f = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 18)
for i, (name, im) in enumerate(thumbs):
    x = 20 + (i % cols) * (s + pad); y = 30 + (i // cols) * (s + lab + pad)
    box = Image.new("RGBA", (s, s), (0, 0, 0, 0)); box.alpha_composite(im.resize((s, s), Image.Resampling.LANCZOS))
    pv.paste(box, (x, y), box)
    if name.isascii():
        d.text((x + 4, y + s + 4), name, font=f, fill=(160, 176, 220))
    else:
        d.text((x + 4, y + s + 3), name, font=f, fill=(160, 176, 220))
pv.save(os.path.join(A, "dino-stickers-preview.png"))
print("preview ->", os.path.join(A, "dino-stickers-preview.png"))
