# -*- coding: utf-8 -*-
"""把用户指定的两行权威图拼成权威板（所有出图 --ref 指向它）"""
import os
from PIL import Image, ImageDraw, ImageFont
A = r"E:\codex\ans\docs\bilibili-ans-launch\assets"
w = Image.open(os.path.join(A, "ans-ip-authority-walk.png")).convert("RGB")
m = Image.open(os.path.join(A, "ans-ip-authority-memes.png")).convert("RGB")
W = max(w.width, m.width)
h1 = int(w.height * W / w.width); h2 = int(m.height * W / m.width)
board = Image.new("RGB", (W, h1 + h2 + 96), (11, 16, 32))
board.paste(w.resize((W, h1), Image.Resampling.LANCZOS), (0, 52))
board.paste(m.resize((W, h2), Image.Resampling.LANCZOS), (0, h1 + 88))
d = ImageDraw.Draw(board)
d.text((20, 16), "ANS IP 权威形象板（用户指定 · 2026-10-21）— 全部出图以本板为准", font=ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 30), fill=(16, 185, 129))
board.save(os.path.join(A, "ans-ip-authority-board.png"))
print("board ->", board.size)
