# -*- coding: utf-8 -*-
import os, sys
from PIL import Image
HERE = r"E:\codex\ans\docs\bilibili-ans-launch\tools"; sys.path.insert(0, HERE)
import sprite_frames as sf
G = r"E:\codex\ans\docs\bilibili-ans-launch\assets\gen"
A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
sheet = Image.open(os.path.join(G, "dino2-memes-3x3.png")).convert("RGBA")
W, H = sheet.size; cw, ch = W // 3, H // 3
cell = sheet.crop((cw, ch, cw * 2, ch * 2))          # 第 2 行第 2 格 = 无语（正脸、无道具）
cut, _ = sf.cut_white_border(cell)
cut = cut.crop(cut.getbbox())
cut.save(os.path.join(A, "ans-dino-chibi-ref.png"))
print("new ref ->", cut.size)
