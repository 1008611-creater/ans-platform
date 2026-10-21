# -*- coding: utf-8 -*-
"""渲染 1080x1920 成片：帧直接管道给 ffmpeg，再按时间轴混音"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

V = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, V)
from engine import (W, H, FPS, G1, G2, ASSETS, font, bg_gradient, dots_overlay, sprite,
                    paste_center, draw_text_block, wrap, CREAM, MINT, MINT_D, NAVY, NAVY_2, PINK, GOLD,
                    screenshot, brand_bar, bg_deco, checklist, mini_atlas)

FFMPEG = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"
OUTDIR = os.path.join(V, "out"); os.makedirs(OUTDIR, exist_ok=True)
DAY_LABEL = os.environ.get("ANS_DAY_LABEL", "DAY 0")
OUT_PREFIX = os.environ.get("ANS_OUT_PREFIX", "ans-day0")
NARRATION = os.environ.get("ANS_NARRATION", "narration.json")
TIMELINE = os.environ.get("ANS_TIMELINE", "timeline.json")
tl = json.load(open(os.path.join(V, TIMELINE), encoding="utf-8"))
SH = tl["shots"]

# ---- 时间轴 ----
t = 0.0
for s in SH:
    s["start"] = round(t, 3)
    s["len"] = round(s["lead"] + s["dur"] + s["hold"], 3)
    t += s["len"]
TOTAL = round(t, 3)
print("成片总时长 %.1fs，%d 镜" % (TOTAL, len(SH)))

def ease(t): return 1 - (1 - t) ** 3
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))

def caption_chunks(text):
    """把口播切成适合竖屏的字幕块"""
    words = [w for w in text.replace("，", "，|").replace("。", "。|").replace("：", "：|").replace("？", "？|").split("|") if w]
    out, cur = [], ""
    for w in words:
        if len(cur) + len(w) <= 14:
            cur += w
        else:
            if cur: out.append(cur)
            cur = w
    if cur: out.append(cur)
    return out

def draw_caption(canvas, text, alpha=255, y_off=0):
    if not text: return
    fnt = font(56)
    d = ImageDraw.Draw(canvas)
    lines = wrap(d, text, fnt, W - 220)
    lh = 78
    block_h = lh * len(lines) + 40
    y0 = H - 330 - block_h
    d.rounded_rectangle([70, y0, W - 70, y0 + block_h], radius=24, fill=(8, 12, 28, int(190 * alpha / 255)))
    y = y0 + 20
    for ln in lines:
        wpx = d.textlength(ln, font=fnt)
        d.text(((W - wpx) / 2 + 3, y + 3), ln, font=fnt, fill=(0, 0, 0, int(170 * alpha / 255)))
        d.text(((W - wpx) / 2, y), ln, font=fnt, fill=(255, 255, 255, alpha))
        y += lh

def badge(canvas, text, cx, cy, fg=MINT, size=44):
    fnt = font(size)
    d = ImageDraw.Draw(canvas)
    wpx = d.textlength(text, font=fnt)
    d.rounded_rectangle([cx - wpx / 2 - 24, cy - size * 0.85, cx + wpx / 2 + 24, cy + size * 0.85],
                        radius=999, fill=(8, 12, 28, 200), outline=fg + (255,), width=3)
    d.text((cx - wpx / 2, cy - size * 0.6), text, font=fnt, fill=fg)

def dino(canvas, frames, row, col, h, cx, cy, float_dy=0):
    im = sprite(frames, row, col, h)
    paste_center(canvas, im, cx, cy + float_dy)

# ---------------- 各镜画面 ----------------
def v_hook(canvas, p, f):
    """0-3s：大字 + 恐龙跳入"""
    d = ImageDraw.Draw(canvas)
    p1 = clamp(p / 0.35)
    size = int(120 * (0.7 + 0.3 * ease(p1)))
    txt = "这个账号的运营"
    fnt = font(size)
    wpx = d.textlength(txt, font=fnt)
    d.text(((W - wpx) / 2 + 5, 470), txt, font=fnt, fill=(0, 0, 0, 190))
    d.text(((W - wpx) / 2, 465), txt, font=fnt, fill=CREAM)
    txt2 = "不是人"
    fnt2 = font(int(size * 1.25))
    wpx2 = d.textlength(txt2, font=fnt2)
    if p > 0.35:
        a = int(255 * clamp((p - 0.35) / 0.25))
        d.text(((W - wpx2) / 2 + 5, 640), txt2, font=fnt2, fill=(0, 0, 0, a))
        d.text(((W - wpx2) / 2, 635), txt2, font=fnt2, fill=PINK + (a,))
    badge(canvas, DAY_LABEL, W / 2, 330, MINT, 52)
    if p > 0.45:
        q = clamp((p - 0.45) / 0.5)
        x = W + 300 - (W + 300 - W / 2) * ease(q)
        dino(canvas, G1, 6, int(p * 30) % 8, 520, x, 1330, float_dy=int(np.sin(p * 30) * 8))

def v_idle(canvas, p, f):
    dino(canvas, G1, 0, f, 620, W / 2, 1080, float_dy=int(np.sin(f * 0.6) * 6))
    badge(canvas, "大肥鱼 · ANS 家的大小姐", W / 2, 380, MINT, 40)

def v_work(canvas, p, f):
    idx = int(p * 8) % 8
    dino(canvas, G1, 3, idx, 520, W / 2, 1180)
    items = ["写脚本", "做配音", "生成 128 个动作帧", "做封面", "排版发出去"]
    done = int(p * (len(items) + 0.4))
    checklist(canvas, items, done, W / 2, 560)

def v_meme(canvas, p, f):
    """4 连快切表情"""
    picks = [("暴富", 7, 0), ("石化", 7, 2), ("冒烟", 7, 5), ("被追跑", 3, 7)]
    seg = int(p * 4) % 4
    label, row, col = picks[seg]
    dino(canvas, G1, row, col, 600, W / 2, 1050)
    badge(canvas, label, W / 2, 1490, GOLD, 56)

PREFERRED = [
    ("home-desktop-light.png", "首页 · ANS"),
    ("kids-map-desktop-light.png", "像素世界地图"),
    ("competitions-aigc-desktop-light.png", "AI 赛事中心"),
    ("book-desktop-light.png", "互动提示词工程之书"),
    ("kids-desktop-light.png", "Promi 提示词学校"),
    ("home-scrolled-desktop-light.png", "学习流程"),
    ("competitions-agrihackathon-desktop-light.png", "农客松赛事"),
]

def _available():
    out = []
    for name, label in PREFERRED:
        if os.path.exists(os.path.join(ASSETS, "shots", name)):
            out.append((name, label))
    return out[:4]

def v_shots(canvas, p, f):
    """ANS 真实截图轮播（动态选取存在的截图）"""
    from engine import paste_screenshot
    avail = _available()
    if not avail:
        badge(canvas, "ANS · AI 学习与协作平台", W / 2, 950, MINT, 46)
        badge(canvas, "截图准备中", W / 2, 1080, (150, 200, 255), 36)
        return
    n = len(avail)
    seg = min(n - 1, int(p * n))
    local = (p * n) % 1
    name, label = avail[seg]
    y = 980 - 40 * ease(clamp(local / 0.4))
    # 轻微推近，避免静态呆板
    paste_screenshot(canvas, name, W / 2, y, 880)
    badge(canvas, label, W / 2, 320, CREAM, 46)
    badge(canvas, "ANS · AI 学习与协作平台", W / 2, 1760, MINT, 34)

def v_form(canvas, p, f):
    """双形态：左像素 / 右立体（用线框立方体代表 3D，不使用旧伪 3D 图）"""
    d = ImageDraw.Draw(canvas)
    # 2D 像素形态
    dino(canvas, G1, 0, f, 430, W / 2 - 210, 1000)
    badge(canvas, "2D 像素", W / 2 - 210, 1330, MINT, 40)
    # 3D 形态：线框立方体
    cx, cy, s = W / 2 + 210, 1000, 150
    ang = p * 6
    pts = []
    for dx, dy, dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        rx = dx * np.cos(ang) - dz * np.sin(ang)
        rz = dx * np.sin(ang) + dz * np.cos(ang)
        k = 1 / (1 + rz * 0.18)
        pts.append((cx + rx * s * k, cy + dy * s * k))
    edges = [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),(0,4),(1,5),(2,6),(3,7)]
    for a, b in edges:
        d.line([pts[a], pts[b]], fill=(150, 200, 255), width=5)
    badge(canvas, "3D 立体", W / 2 + 210, 1330, (150, 200, 255), 40)
    # 切换箭头
    badge(canvas, "⇄ 一键切换", W / 2, 700, GOLD, 46)

def v_worker(canvas, p, f):
    idx = int(p * 8) % 8
    dino(canvas, G1, 3, idx, 560, W / 2, 1120)
    labels = ["摸鱼", "搬砖", "敲键盘", "开会打盹", "接电话", "喝水", "举牌", "被追跑"]
    hours = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    badge(canvas, hours[idx] + "  " + labels[idx], W / 2, 350, MINT, 44)
    # 进度条
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([90, 1670, W - 90, 1690], radius=10, fill=(40, 52, 80))
    d.rounded_rectangle([90, 1670, 90 + (W - 180) * clamp(p), 1690], radius=10, fill=MINT)

def v_grid(canvas, p, f):
    """128 格图集：迷你矩阵逐格亮起 + 大图展示当前帧"""
    idx = int(p * 128) % 128
    frames = G1 if idx < 64 else G2
    i = idx % 64
    mini_atlas(canvas, (G1 if idx < 64 else G2), W / 2, 700, cell=88, lit=i)
    dino(canvas, frames, i // 8, i % 8, 620, W / 2, 1290)
    badge(canvas, "128 个动作表情", W / 2, 330, GOLD, 48)
    badge(canvas, "第 " + str(idx + 1) + " / 128", W / 2, 1620, MINT, 40)

def v_walk(canvas, p, f):
    x = 180 + (W - 360) * ((p * 1.2) % 1.0)
    dino(canvas, G1, 1, f, 480, x, 1100)
    badge(canvas, "Day 1 · Day 2 · Day 3 …", W / 2, 340, MINT, 44)
    badge(canvas, "我会每天汇报", W / 2, 1600, CREAM, 44)

def v_cta(canvas, p, f):
    dino(canvas, G1, 5, int(p * 40) % 8, 520, W / 2, 1080)
    d = ImageDraw.Draw(canvas)
    scale = 1 + 0.04 * np.sin(p * 12)
    fnt = font(int(120 * scale))
    txt = "关注我"
    wpx = d.textlength(txt, font=fnt)
    d.text(((W - wpx) / 2 + 5, 320), txt, font=fnt, fill=(0, 0, 0, 200))
    d.text(((W - wpx) / 2, 315), txt, font=fnt, fill=MINT)
    badge(canvas, "大肥鱼在ANS当运营", W / 2, 1620, CREAM, 42)
    badge(canvas, "评论区点菜：想看什么表情包", W / 2, 1720, GOLD, 34)

VIS = {"hook": v_hook, "idle": v_idle, "work": v_work, "meme": v_meme, "shots": v_shots,
       "form": v_form, "worker": v_worker, "grid": v_grid, "walk": v_walk, "cta": v_cta}

# Day1 专用场景（白板规则 / 考题 / 速度 / 条形图 / 模型卡 / 裁判 / 原始输出）
try:
    import scenes_day1 as S1
    def v_hook2(canvas, p, f):
        d = ImageDraw.Draw(canvas)
        d.text((90, 420), "五个模型", font=font(120), fill=CREAM)
        d.text((90, 570), "同考一道题", font=font(120), fill=MINT)
        badge(canvas, DAY_LABEL, W / 2, 300, MINT, 52)
        if p > 0.4:
            q = clamp((p - 0.4) / 0.5)
            x = -300 + (W / 2 + 300) * ease(q)
            dino(canvas, G1, 2, int(p * 30) % 8, 420, x, 1250)

    def v_exam(canvas, p, f):
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle([80, 380, W - 80, 900], radius=30, fill=(246, 244, 236, 235))
        d.text((120, 420), "考题", font=font(54), fill=(30, 40, 60))
        fnt = font(46)
        lines = ["把家里宠物的照片，", "做成一个三维打印的纪念手办。", "", "要求：能直接交给制作方"]
        for i, t in enumerate(lines):
            d.text((120, 520 + i * 72), t, font=fnt, fill=(35, 45, 70))
        dino(canvas, G2, 0, int(p * 8) % 8, 520, W / 2, 1350)

    def v_speed(canvas, p, f):
        d = ImageDraw.Draw(canvas)
        d.text((80, 300), "交卷速度", font=font(56), fill=CREAM)
        rows = [("DeepSeek V4.1 Flash", "17s", 0.06), ("Kimi K2.7", "25s", 0.09), ("GLM-5.3", "43s", 0.15),
                ("Qwen3.8-27B", "70s", 0.25), ("Hunyuan Hy4", "228s", 0.80)]
        for i, (name, lab, ratio) in enumerate(rows):
            y = 420 + i * 200
            d.text((80, y + 20), name, font=font(40), fill=CREAM)
            w = (W - 380) * min(1.0, ratio * 1.2) * min(1.0, max(0.05, p * 1.6 - i * 0.1))
            d.rounded_rectangle([380, y + 10, W - 90, y + 90], radius=14, fill=(26, 36, 62))
            d.rounded_rectangle([380, y + 10, 380 + w, y + 90], radius=14, fill=GOLD if i == 0 else (110, 170, 210))
            d.text((W - 84, y + 22), lab, font=font(38), fill=CREAM)

    def v_judge(canvas, p, f):
        d = ImageDraw.Draw(canvas)
        d.text((90, 380), "盲评：请第六个模型当裁判", font=font(52), fill=CREAM)
        d.text((90, 470), "模型名全部隐去，只留答案", font=font(40, False), fill=(170, 195, 225))
        for i, a in enumerate(["甲", "乙", "丙", "丁", "戊"]):
            x = 150 + i * 170
            d.rounded_rectangle([x, 620, x + 140, 760], radius=20, fill=(16, 24, 48), outline=MINT + (200,), width=3)
            d.text((x + 46, 655), a, font=font(58), fill=MINT)
        dino(canvas, G1, 5, int(p * 20) % 8, 380, W / 2, 1150)
        d.text((90, 1500), "评分标准公开 · 不接受「我说了算」", font=font(34, False), fill=(150, 175, 210))

    def v_cta2(canvas, p, f):
        d = ImageDraw.Draw(canvas)
        d.text((80, 300), "下期投票", font=font(64), fill=GOLD)
        opts = [("A", "让它们互相改提示词"), ("B", "让它们自己复盘")]
        for i, (k, t) in enumerate(opts):
            y = 460 + i * 260
            d.rounded_rectangle([80, y, W - 80, y + 200], radius=28, fill=(14, 22, 44), outline=MINT + (180,), width=3)
            d.text((120, y + 40), k, font=font(80), fill=MINT)
            d.text((260, y + 70), t, font=font(44), fill=CREAM)
        dino(canvas, G1, 7, 0, 420, W / 2, 1420)
        badge(canvas, "评论区投票 · 明天见", W / 2, 1700, GOLD, 40)

    VIS.update({"hook2": v_hook2, "exam": v_exam, "speed": v_speed, "judge": v_judge, "cta2": v_cta2,
                "rule": S1.v_rule, "cards": S1.v_cards, "bars": S1.v_bars, "raw": S1.v_raw})
    print("[day1] 已加载 Day1 场景")
except Exception as e:
    print("[day1] 场景加载失败:", e)

# 自动发现所有 scenes_day*.py 里的 v_* 场景：新增期数不用再改这个文件
import glob as _glob, importlib as _importlib
_HERE = os.path.dirname(os.path.abspath(__file__))
for _p in sorted(_glob.glob(os.path.join(_HERE, "scenes_day*.py"))):
    _mod = os.path.splitext(os.path.basename(_p))[0]
    try:
        _m = _importlib.import_module(_mod)
        _n = 0
        for _name in dir(_m):
            if _name.startswith("v_"):
                VIS[_name[2:]] = getattr(_m, _name)
                _n += 1
        if _n:
            print("[%s] 已加载场景 %d 个" % (_mod, _n))
    except Exception as _e:
        print("[%s] 场景加载失败:" % _mod, _e)

# ---------------- 渲染 ----------------
def render_video(path):
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    frame_no = 0
    for s in SH:
        chunks = caption_chunks(s["vo"])
        n = int(round(s["len"] * FPS))
        fn = VIS[s["visual"]]
        for k in range(n):
            p = k / max(1, n - 1)
            tsec = k / FPS
            canvas = dots_overlay(bg_gradient(NAVY, NAVY_2))
            canvas = canvas.convert("RGBA")
            bg_deco(canvas, tsec)
            fn(canvas, p, frame_no)
            # 字幕：按时间推进，和口播大致同步
            ci = min(len(chunks) - 1, int(p * len(chunks)))
            cap_p = (p * len(chunks)) % 1
            alpha = 255 if cap_p < 0.9 else int(255 * (1 - (cap_p - 0.9) / 0.1))
            draw_caption(canvas, chunks[ci], alpha)
            brand_bar(canvas, frame_no / max(1, int(TOTAL * FPS) - 1))
            # 转场：每镜前 0.12s 轻微白闪，结尾 0.12s 淡出
            if p < 0.06:
                a = int(90 * (1 - p / 0.06))
                canvas = Image.alpha_composite(canvas, Image.new("RGBA", (W, H), (255, 255, 255, a)))
            proc.stdin.write(canvas.convert("RGB").tobytes())
            frame_no += 1
    proc.stdin.close()
    proc.wait()
    print("视频轨完成:", path, frame_no, "帧")

def mix_audio(path):
    inputs, filters, labels = [], [], []
    # BGM 循环铺底
    inputs += ["-stream_loop", "-1", "-i", os.path.join(V, "audio", "bgm.wav")]
    filters.append(f"[0:a]volume=0.16,atrim=0:{TOTAL},afade=t=out:st={TOTAL-2}:d=2[bgm]")
    labels.append("[bgm]")
    idx = 1
    VO_DIR = os.path.join(V, "vo", os.path.splitext(TIMELINE)[0])
    for s in SH:
        vo = os.path.join(VO_DIR, f"vo-{s['id']}.wav")
        inputs += ["-i", vo]
        delay = int(s["start"] * 1000)
        filters.append(f"[{idx}:a]adelay={delay}|{delay},volume=1.0[v{idx}]")
        labels.append(f"[v{idx}]")
        idx += 1
        if s.get("sfx"):
            sp = os.path.join(V, "audio", s["sfx"] + ".wav")
            if os.path.exists(sp):
                inputs += ["-i", sp]
                d2 = int((s["start"] + max(0, s["lead"] - 0.2)) * 1000)
                filters.append(f"[{idx}:a]adelay={d2}|{d2},volume=0.45[s{idx}]")
                labels.append(f"[s{idx}]")
                idx += 1
    filters.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.95[aout]")
    cmd = [FFMPEG, "-y", "-loglevel", "error"] + inputs + [
        "-filter_complex", ";".join(filters), "-map", "[aout]", "-t", str(TOTAL),
        "-ar", "44100", "-ac", "2", path]
    subprocess.run(cmd, check=True)
    print("音轨完成:", path)

if __name__ == "__main__":
    vid = os.path.join(OUTDIR, "video-only.mp4")
    aud = os.path.join(OUTDIR, "audio-mix.wav")
    render_video(vid)
    mix_audio(aud)
    final = os.path.join(OUTDIR, OUT_PREFIX + "-1080x1920.mp4")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", vid, "-i", aud, "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", final], check=True)
    print("成片:", final)
