# -*- coding: utf-8 -*-
"""逐镜生成配音（edge-tts → mp3 → wav）+ 时长测量"""
import json, os, subprocess, sys
sys.path.insert(0, __import__("os").environ.get("ANS_TTS_LIBS", r"E:\codex\.tools\tts-libs"))
import asyncio
import edge_tts

V = os.path.dirname(os.path.abspath(__file__))
TIMELINE_NAME = os.environ.get("ANS_TIMELINE", "timeline.json")
OUT = os.path.join(V, "vo", os.path.splitext(TIMELINE_NAME)[0])   # 按天分目录，避免跨天复用旧配音
os.makedirs(OUT, exist_ok=True)
FFMPEG = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffprobe.exe"

spec = json.load(open(os.path.join(V, os.environ.get("ANS_NARRATION", "narration.json")), encoding="utf-8"))
TIMELINE = os.environ.get("ANS_TIMELINE", "timeline.json")
voice, rate = spec["voice"], spec["rate"]

def dur(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return float(r.stdout.strip())

async def synth(text, path):
    await edge_tts.Communicate(text, voice, rate=rate).save(path)

total = 0.0
timeline = []
for s in spec["shots"]:
    mp3 = os.path.join(OUT, f"vo-{s['id']}.mp3")
    wav = os.path.join(OUT, f"vo-{s['id']}.wav")
    if not os.path.exists(mp3):
        asyncio.run(synth(s["vo"], mp3))
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", "44100", "-ac", "1", wav], check=True)
    d = dur(wav)
    total += d
    timeline.append({"id": s["id"], "dur": round(d, 2), "vo": s["vo"], "visual": s["visual"], "sfx": s.get("sfx", "")})
    print(f"  {s['id']}: {d:5.2f}s  {s['vo'][:34]}")

# 给每镜留呼吸：尾部 +0.45s / 头部 +0.25s
for t in timeline:
    t["hold"] = 0.45
    t["lead"] = 0.25
fitted = sum(t["dur"] + t["hold"] + t["lead"] for t in timeline)
json.dump({"voice": voice, "rate": rate, "shots": timeline, "vo_total": round(total, 2), "fitted_total": round(fitted, 2)},
          open(os.path.join(V, TIMELINE), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\n配音净时长 {total:.1f}s ｜ 加上呼吸后成片约 {fitted:.1f}s")
