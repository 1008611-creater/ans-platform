# -*- coding: utf-8 -*-
"""每日自动出片：一条命令产出一整天的视频 + 封面 + 发布文案

用法：python make_day.py --day 1 --title "..." --topic "今天我把表情包丢进了评论区"
输入：days/day<N>.json  （结构与 narration.json 相同）
产出：out/day<N>-1080x1920.mp4 / out/day<N>-cover.png / out/day<N>-meta.json
"""
import argparse, json, os, subprocess, sys
V = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
FFMPEG = r"C:\Users\lsb\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe"

def run(script, env):
    e = dict(os.environ); e.update(env); e["PYTHONIOENCODING"] = "utf-8"
    r = subprocess.run([PY, os.path.join(V, script)], env=e)
    if r.returncode != 0:
        print("[fail]", script, r.returncode); sys.exit(r.returncode)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", required=True)
    ap.add_argument("--title", default="")
    ap.add_argument("--tags", default="AI,人工智能,AI运营,像素,表情包,独立开发,vlog")
    ap.add_argument("--tid", type=int, default=21)
    a = ap.parse_args()

    narr = os.path.join(V, "days", "day" + a.day + ".json")
    if not os.path.exists(narr):
        print("[err] 缺少分镜脚本:", narr, file=sys.stderr); return 2
    env = {
        "ANS_NARRATION": os.path.join("days", "day" + a.day + ".json"),
        "ANS_TIMELINE": "timeline-day" + a.day + ".json",
        "ANS_DAY_LABEL": "DAY " + a.day,
        "ANS_OUT_PREFIX": "ans-day" + a.day,
    }
    print("=== 1/4 配音 ===");  run("build_vo.py", env)
    print("=== 2/5 渲染 ===");  run("render.py", env)
    print("=== 3/5 响度归一（-14 LUFS）==="); run("loudness.py", env)
    print("=== 4/5 抽帧质检 ==="); run("qc.py", env)
    print("=== 5/5 封面 ===")
    cover_dst = os.path.join(V, "out", "ans-day" + a.day + "-cover.png")
    cv = dict(env)
    cv.update(json.loads(os.environ.get("ANS_COVER_JSON", "{}")) if os.environ.get("ANS_COVER_JSON") else {})
    cv["ANS_COVER_OUT"] = "ans-day" + a.day + "-cover.png"
    run("make_cover.py", cv)
    print("=== 4/4 发布文案 ===")
    meta = {
        "title": a.title or ("【Day " + a.day + "】大肥鱼在ANS当运营 · 今日汇报"),
        "tid": a.tid,
        "tags": [t for t in a.tags.split(",") if t][:10],
        "neutral_mark": "本视频由 AI 生成：画面、配音、音乐与脚本均由 AI 与代码自动产出",
        "dynamic": (a.title or "【Day " + a.day + "】") + " 今日汇报已更新，评论区点菜继续。",
        "desc": "【AIGC 声明】本视频的画面、配音、音乐、剪辑全部由 AI 与代码自动产出。\n\n我是大肥鱼，ANS 家的大小姐，这个 B站账号由我运营。\n\nANS 是一个 AI 学习和协作的平台：学 AI、做项目、存提示词、管版本。\n\n#AI #人工智能 #像素",
    }
    mp = os.path.join(V, "out", "ans-day" + a.day + "-meta.json")
    json.dump(meta, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    final = os.path.join(V, "out", env["ANS_OUT_PREFIX"] + "-1080x1920.mp4")
    size = os.path.getsize(final) / 1048576 if os.path.exists(final) else 0
    print("\n完成：%s (%.1f MB) ｜ 封面 %s ｜ 文案 %s" % (final, size, cover_dst, mp))
    print("发布：python publish.py --video \"" + final + "\" --cover \"" + cover_dst + "\" --meta \"" + mp + "\"")
    return 0

if __name__ == "__main__":
    sys.exit(main())
