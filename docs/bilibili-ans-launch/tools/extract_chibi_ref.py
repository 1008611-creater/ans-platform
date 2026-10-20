# -*- coding: utf-8 -*-
"""从 Q 版设定图裁出正视图，抠白后作为「比例权威参考图」
用法: python extract_chibi_ref.py <设定图文件名> <输出名>
"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sprite_frames as sf
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
GEN = os.path.join(ASSETS, "gen")
sheet_name = sys.argv[1] if len(sys.argv) > 1 else "dino2-model-2x2.png"
out_name = sys.argv[2] if len(sys.argv) > 2 else "ans-dino-chibi-ref.png"
sheet = Image.open(os.path.join(GEN, sheet_name)).convert("RGBA")
W, H = sheet.size
front = sheet.crop((0, 0, W // 2, H // 2))
cut, _ = sf.cut_white_border(front)
cut = cut.crop(cut.getbbox())
cut.save(os.path.join(ASSETS, out_name))
whole, _ = sf.cut_white_border(sheet)
whole.save(os.path.join(ASSETS, out_name.replace("-ref", "-modelsheet")))
print(out_name, cut.size)
