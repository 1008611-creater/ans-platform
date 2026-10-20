# -*- coding: utf-8 -*-
"""一键可发 · 收尾卡（手机可读的长图）"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
V = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, V)
from engine import bg_gradient, dots_overlay, NAVY, NAVY_2, MINT, CREAM, GOLD, PINK, G1, sprite

FFPROBE = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffprobe.exe"
W, TALL = 1080, 4600
canvas = dots_overlay(bg_gradient(NAVY, NAVY_2, (W, TALL))).convert("RGBA")
d = ImageDraw.Draw(canvas)
def F(s, b=True): return ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc" if b else "C:/Windows/Fonts/msyh.ttc", s)
def wrap(t, fnt, mw):
    out, cur = [], ""
    for ch in t:
        if ch == "\n": out.append(cur); cur = ""; continue
        if d.textlength(cur + ch, font=fnt) <= mw: cur += ch
        else: out.append(cur); cur = ch
    if cur: out.append(cur)
    return out
def block(title, lines, y, color=MINT):
    d.rounded_rectangle([60, y, W - 60, y + 96], radius=18, fill=(14, 22, 44))
    d.text((88, y + 24), title, font=F(42), fill=color)
    y += 120
    for t in lines:
        fnt = F(32, False) if t.startswith((" ", "·")) else F(34)
        for ln in wrap(t, fnt, W - 200):
            d.text((88, y), ln, font=fnt, fill=(212, 226, 246)); y += 48
        y += 6
    return y + 24

# 头部
d.text((60, 60), "大肥鱼在ANS当运营", font=F(64), fill=CREAM)
d.text((60, 150), "开工收尾卡 · 一键可发", font=F(40, False), fill=(170, 200, 235))
d.rounded_rectangle([60, 230, W - 60, 240], radius=5, fill=MINT)
y = 280

# 1 已就绪
vids = []
for day in range(5):
    p = os.path.join(V, "out", ("ans-day%d-1080x1920.mp4" % day) if day else "ans-day0-1080x1920.mp4")
    if os.path.exists(p):
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                           capture_output=True, text=True)
        vids.append("Day %d ｜ %s 秒 ｜ %.1f MB ｜ 1080×1920 竖屏" % (day, r.stdout.strip()[:4], os.path.getsize(p) / 1048576))
y = block("① 已经做完（全自动产出）", vids + [
    "封面 Day1–Day4 + Day0 封面 · B站空间横幅 1920×280 · 头像 1024",
    "发布文案 JSON（标题 / 分区 tid=21 / 8 标签 / 简介含 AIGC 声明 / 粉丝动态）",
    "评分长图（Day1）· 一键发布脚本 publish.ps1（基于 bilibili_api）",
    "全部为真数据实测：15 份原始输出 JSON 已入库，可复核",
], y)

# 2 只差两步
y = block("② 只差两步（必须真人，我做不了）", [
    "第 1 步：注册 B站账号「大肥鱼在ANS当运营」",
    "     需要手机号 + 实名认证；昵称当前无占用，建议立刻抢注",
    "第 2 步：在这台电脑上扫码登录一次",
    "     bili login        （用 B站 App 扫码，看到 ok: true 即可）",
    "然后执行一条命令：",
    r"     pwsh -File E:\codex\ans\docs\bilibili-ans-launch\video\publish.ps1",
], y, GOLD)

# 3 发布排期
y = block("③ 建议排期（对标账号就是靠日更活下来的）", [
    "Day 0  立刻发（首条立人设，钩子在第 0 秒）",
    "Day 1  次日 18:30（五个模型同题实测）",
    "Day 2  第 3 天 18:30（互相改提示词 → 改胖 3.7 倍）",
    "Day 3  第 4 天 18:30（自我推翻：膨胀治住了，分数没回来）",
    "Day 4  第 5 天 18:30（第三条路：建议值 / 尺子不可信）",
    "每条都配封面 + 置顶评论 + 一条动态（文案已写好）",
], y)

# 4 发布后 3 分钟
y = block("④ 发布后 3 分钟必做", [
    "创作中心勾选「AIGC 内容声明」（漏标会被打回/下架）",
    "确认分区 生活·日常（或科技·计算机技术 tid=188）、标签、封面生效",
    "置顶评论：Day 0 打卡。评论区点菜：想看什么表情包，我明天做。数据我每天更新在这条置顶。",
    "把成片发一条动态（文案在 publish-meta.json 的 dynamic 字段）",
    "Day1 记得把「评分长图」贴进动态（方案要求公开原始输出）",
], y, GOLD)

# 5 红线
y = block("⑤ 红线（碰了会限流甚至封号）", [
    "简介不放外链、不放二维码、不写联系方式",
    "不称「官方」，不贬低其他账号，不刷量",
    "新号不要一天连发多条；按上面排期日更即可",
    "我只动 develop 分支，没有碰 main 和 ops 部署信号灯",
], y, PINK)

# 底部
av = sprite(G1, 4, 2, 200)
canvas.alpha_composite(av, (W - 260, y - 60))
y += 180
d.text((60, y), "完整说明见 video/PUBLISH-SOP.md ｜ 发布脚本已 dry-run 校验通过", font=F(28, False), fill=(150, 175, 210))
y += 70
final = canvas.crop((0, 0, W, min(TALL, y)))
out = os.path.join(os.path.dirname(V), "assets", "handover-card.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
final.convert("RGB").save(out)
print("收尾卡 ->", out, final.size)
