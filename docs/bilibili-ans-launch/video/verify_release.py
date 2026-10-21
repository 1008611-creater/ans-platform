# -*- coding: utf-8 -*-
"""发布包自检：一条命令证明「真的可以发」。

检查项：成片规格/音频、封面尺寸、发布文案合法性（含 AIGC 声明）、凭据路径、账本就绪。
不需要登录；未登录会明确标为「待人工」，不算失败。
"""
import json, os, re, subprocess, sys

V = os.path.dirname(os.path.abspath(__file__))
FFPROBE = os.environ.get("FFPROBE", r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffprobe.exe")
PYP = r"C:\Users\lsb\pipx\venvs\bilibili-cli\Scripts\python.exe"

ok, warn, fail = [], [], []


def probe(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries",
                        "stream=codec_type,width,height:format=duration",
                        "-of", "json", path], capture_output=True, text=True)
    return json.loads(r.stdout) if r.stdout else {}


def check_video(day, path):
    if not os.path.exists(path):
        fail.append("Day%d 成片缺失: %s" % (day, os.path.basename(path))); return
    mb = os.path.getsize(path) / 1048576
    j = probe(path)
    st = j.get("streams", [])
    w = next((s.get("width") for s in st if s.get("codec_type") == "video"), None)
    h = next((s.get("height") for s in st if s.get("codec_type") == "video"), None)
    has_audio = any(s.get("codec_type") == "audio" for s in st)
    dur = float(j.get("format", {}).get("duration") or 0)
    good = (w == 1080 and h == 1920 and has_audio and 40 <= dur <= 180 and mb >= 1)
    (ok if good else fail).append(
        "Day%d 成片 %s ｜ %dx%d ｜ %.1fs ｜ %.1fMB ｜ 音频 %s" %
        (day, "规格正常" if good else "规格异常", w or 0, h or 0, dur, mb, "有" if has_audio else "无"))


def check_cover(path, label):
    if not os.path.exists(path):
        fail.append("%s 封面缺失" % label); return
    try:
        from PIL import Image
        im = Image.open(path)
        good = im.size == (1920, 1080)
        (ok if good else fail).append("%s 封面 %s ｜ %s" % (label, "1920x1080" if good else "尺寸异常", im.size))
    except Exception as e:
        fail.append("%s 封面读取失败: %s" % (label, e))


def check_meta(path, label, expect_aigc=True):
    if not os.path.exists(path):
        warn.append("%s 文案缺失（该期未生成？）: %s" % (label, os.path.basename(path))); return
    m = json.load(open(path, encoding="utf-8-sig"))
    t = m.get("title", "")
    desc = m.get("desc", "")
    tags = m.get("tags", [])
    problems = []
    if not t: problems.append("无标题")
    if len(t) > 80: problems.append("标题超 80 字")
    if not m.get("tid"): problems.append("无分区")
    if not tags: problems.append("无标签")
    if len(tags) > 10: problems.append("标签超 10 个")
    if expect_aigc and not re.search(r"(AIGC|AI 生成|AI生成)", desc + t): problems.append("简介缺少 AIGC 声明")
    if re.search(r"(https?://|二维码|微信|QQ)", desc): problems.append("简介含外链/联系方式")
    if problems:
        fail.append("%s 文案问题: %s" % (label, "；".join(problems)))
    else:
        ok.append("%s 文案合规 ｜ 标题 %d 字 ｜ %d 标签 ｜ 分区 %s" % (label, len(t), len(tags), m.get("tid")))


print("=== 发布包自检 ===")
for day in range(5):
    p = os.path.join(V, "out", "ans-day%d-1080x1920.mp4" % day)
    if day == 0 and not os.path.exists(p):
        p = os.path.join(V, "out", "ans-day0-1080x1920.mp4")
    check_video(day, p)
check_cover(os.path.join(V, "out", "cover-1920x1080.png"), "Day0")
for day in range(1, 5):
    check_cover(os.path.join(V, "out", "ans-day%d-cover.png" % day), "Day%d" % day)
check_meta(os.path.join(V, "publish-meta.json"), "Day0")
for day in range(1, 5):
    check_meta(os.path.join(V, "out", "ans-day%d-meta.json" % day), "Day%d" % day)

# 凭据：未登录是预期状态（人工阻塞点），明确标注而不是失败
r = subprocess.run([PYP, os.path.join(V, "publish.py"), "--check-credential"], capture_output=True, text=True)
if r.returncode == 0:
    ok.append("发布凭据：已就绪（可以直接发）")
else:
    warn.append("发布凭据：未登录 —— 人工步骤：①注册账号 ②bili login 扫码（这是唯一阻塞点）")

rec = os.path.join(V, "ledger", "records.json")
if os.path.exists(rec):
    n = len(json.load(open(rec, encoding="utf-8-sig")))
    ok.append("运营账本就绪 ｜ 已记录视频 %d 条" % n)
else:
    warn.append("运营账本 records.json 缺失")

for line in ok: print("  [OK]  " + line)
for line in warn: print("  [待人工] " + line)
for line in fail: print("  [FAIL] " + line)
print("\n结果：%d 项通过 ｜ %d 项待人工 ｜ %d 项失败" % (len(ok), len(warn), len(fail)))
sys.exit(1 if fail else 0)
