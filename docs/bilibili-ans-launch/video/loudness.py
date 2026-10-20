# -*- coding: utf-8 -*-
"""响度归一化：测 → 归一到 -14 LUFS → 重新封装成片"""
import json, os, re, subprocess, sys
V = os.path.dirname(os.path.abspath(__file__))
FF = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"
FP = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffprobe.exe"
OUT = os.path.join(V, "out")
src = os.path.join(OUT, "audio-mix.wav")
vid = os.path.join(OUT, "video-only.mp4")
final = os.path.join(OUT, os.environ.get("ANS_OUT_PREFIX", "ans-day0") + "-1080x1920.mp4")

def measure(path):
    r = subprocess.run([FF, "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*input_i[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else None

before = measure(src)
print("原始：integrated %.1f LUFS ｜ true peak %.1f dBTP ｜ LRA %.1f" % (
    float(before["input_i"]), float(before["input_tp"]), float(before["input_lra"])))

norm = os.path.join(OUT, "audio-norm.wav")
subprocess.run([FF, "-y", "-loglevel", "error", "-i", src,
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                "-ar", "44100", "-ac", "2", norm], check=True)
after = measure(norm)
print("归一后：integrated %.1f LUFS ｜ true peak %.1f dBTP" % (float(after["input_i"]), float(after["input_tp"])))
subprocess.run([FF, "-y", "-loglevel", "error", "-i", vid, "-i", norm, "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k", "-shortest", final], check=True)
r = subprocess.run([FP, "-v", "error", "-show_entries", "format=duration,size,bit_rate", "-of", "csv=p=0", final],
                   capture_output=True, text=True)
print("成片重封装完成：", r.stdout.strip())
