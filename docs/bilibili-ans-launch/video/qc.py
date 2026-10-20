# -*- coding: utf-8 -*-
"""逐镜抽帧做 QC 联络表"""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont
V = os.path.dirname(os.path.abspath(__file__))
FFMPEG = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"
TIMELINE = os.environ.get("ANS_TIMELINE", "timeline.json")
DAY_LABEL = os.environ.get("ANS_DAY_LABEL", "Day 0")
tl = json.load(open(os.path.join(V, TIMELINE), encoding="utf-8"))
t0 = 0.0
for s in tl["shots"]:
    s["lead"] = s.get("lead", 0.25); s["hold"] = s.get("hold", 0.45)
    s["start"] = round(t0, 3)
    s["len"] = round(s["lead"] + s["dur"] + s["hold"], 3)
    t0 += s["len"]
mp4 = os.path.join(V, "out", os.environ.get("ANS_OUT_PREFIX", "ans-day0") + "-1080x1920.mp4")
tmp = os.path.join(V, "out", "qc"); os.makedirs(tmp, exist_ok=True)
cols, rows = 2, 5
cw, ch = 460, 818
sheet = Image.new("RGB", (cols * cw + 40, rows * (ch + 46) + 20), (8, 10, 22))
d = ImageDraw.Draw(sheet)
fnt = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 24)
for i, s in enumerate(tl["shots"]):
    t = s["start"] + s["lead"] + s["dur"] * 0.45
    p = os.path.join(tmp, f"q{i:02d}.png")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", mp4, "-frames:v", "1", p], check=True)
    im = Image.open(p).resize((cw, ch), Image.Resampling.LANCZOS)
    x = 20 + (i % cols) * cw
    y = 20 + (i // cols) * (ch + 46)
    sheet.paste(im, (x, y))
    d.text((x + 4, y + ch + 6), f"[{DAY_LABEL}] {s['id']} {s['visual']}  {s['start']:.1f}s  {s['vo'][:14]}", font=fnt, fill=(150, 220, 190))
sheet.save(os.path.join(V, "out", os.environ.get("ANS_OUT_PREFIX", "ans-day0") + "-qc.png"))
print("qc sheet ->", os.path.join(V, "out", "qc-sheet.png"), sheet.size)
