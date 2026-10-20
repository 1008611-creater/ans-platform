# -*- coding: utf-8 -*-
"""ANS IP 像素卡通 —— 出图封装（OpenLux / gpt-image-2.5-sunburst-c）
用法:
  python gen_sheet.py --kind memes --name ans-dino-memes4-3x3            # 出图
  python gen_sheet.py --kind idle  --name ans-dino-idle-2x4 --slice      # 出图并切帧
  python gen_sheet.py --kind custom --cols 3 --rows 3 --prompt "..." --name xxx
"""
import argparse, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
ASSETS = os.path.join(SKILL, "assets")
REF = os.path.join(ASSETS, "ans-ip-authority-board.png")  # 权威板（用户指定，不可自行替换）
GEN = r"C:\Users\lsb\.codex\skills\image2.5genskill\scripts\image25_gen.py"
OPENLUX_MODEL = "gpt-image-2.5-sunburst-c"

# ---- 形象规范（Lock）----
SPEC = ("呆萌薄荷绿小恐龙吉祥物。**比例锁（必须严格遵守）**：整体接近正方形；头部是上面的横向宽圆"
        "（**头宽约为整体身高的 0.88 倍**、又宽又扁圆，是全身最宽处），身体是下面的小圆"
        "（宽度约为头宽的 0.8 倍、明显比头小）；**头与身体直接相连、完全没有脖子、没有分界线**；"
        "较大的黑眼珠带白色高光 + 横向奶油白下脸块 + 小 U 微笑 + 淡粉腮红；极短小手小脚；"
        "薄荷绿 #9BE0C5、奶油白 #FBF6E9、深蓝像素描边。")
STYLE = ("像素艺术，像素块清晰硬朗、边缘无抗锯齿、整体圆润呆萌。**每格角色必须完整：头、身体、四肢、"
         "尾巴齐全、结构连贯，绝不出现断裂、漂浮、脱离的手脚或道具，也不要画出格子外**。纯白背景、"
         "每格居中、比例配色完全一致、留均匀留白，不要网格线、不要文字、不要水印、不要阴影。")

PRESETS = {
    "model":   (2, 2, "1024x1024", ["正面站立", "侧面站立", "背面", "坐姿"]),
    "walk":    (2, 4, "1024x1536", ["迈步1", "迈步2", "迈步3", "迈步4", "迈步5", "迈步6", "迈步7", "迈步8"]),
    "idle":    (2, 4, "1024x1536", ["正面站立", "闭眼打盹", "头歪向左", "尾巴上翘", "举手挥手", "坐下休息", "张嘴打哈欠", "轻跳一下"]),
    "actions": (2, 4, "1024x1536", ["用力跳起", "单手挥手", "一屁股坐下", "侧躺睡着", "双手捧黄色小方块", "前倾冲刺跑", "双手举高欢呼", "双手比心"]),
    "memes":   (3, 3, "1024x1024", ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "吃瓜", "摆烂", "震惊", "比心"]),
    "memes2":  (3, 3, "1024x1024", ["敬礼", "双手合十求求", "笑到打滚", "整个人裂开", "满头大汗", "跪地磕头", "探头好奇", "狂吃零食", "举空白木牌"]),
    "memes3":  (3, 3, "1024x1024", ["躺平摸鱼", "搬砖", "敲键盘", "打瞌睡", "暴富金币眼", "点赞", "暗中观察", "石化", "鞠躬谢谢"]),
    "standup": (2, 2, "1024x1024", ["稳稳坐着", "双手撑地前倾", "半站起前倾", "站直举手欢呼"]),
}


def build_prompt(kind, frames, extra=""):
    n = len(frames)
    head = f"{'2 列' if kind in ('walk','idle','actions') else '3 列'} × ..."  # 占位，实际用 cols/rows
    listed = " ".join(f"({chr(0x2460 + i) if i < 20 else i + 1}) {t}" for i, t in enumerate(frames))
    return f"共 {n} 格，依次为：{listed}。{extra}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", default="memes", choices=list(PRESETS) + ["custom"])
    ap.add_argument("--name", required=True)
    ap.add_argument("--cols", type=int); ap.add_argument("--rows", type=int)
    ap.add_argument("--size"); ap.add_argument("--prompt", default="")
    ap.add_argument("--frames", default="")
    ap.add_argument("--ref", default=REF)
    ap.add_argument("--outdir", default=os.path.join(os.path.dirname(SKILL), "..", "..", "docs", "bilibili-ans-launch", "assets", "gen"))
    ap.add_argument("--slice", action="store_true")
    a = ap.parse_args()

    if a.kind == "custom":
        cols, rows, size = a.cols or 3, a.rows or 3, a.size or "1024x1024"
        frames = [x.strip() for x in a.frames.split(",")] if a.frames else []
        body = a.prompt
    else:
        cols, rows, size, frames = PRESETS[a.kind]
        listed = " ".join(str(i + 1) + ". " + t for i, t in enumerate(frames))
        body = f"{cols} 列 × {rows} 行共 {cols * rows} 格，每格姿态依次为 {listed}。"

    prompt = f"{body} {SPEC} {STYLE}"
    out = os.path.abspath(os.path.join(a.outdir, a.name + ".png"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = [sys.executable, GEN, "--model", OPENLUX_MODEL, "--size", size, "--quality", "high",
           "--ref", a.ref, "--prompt", prompt, "--out", out]
    print("[gen]", a.name, f"{cols}x{rows}", size)
    r = subprocess.run(cmd)
    if r.returncode != 0:
        print("[gen] 失败，退出码", r.returncode, file=sys.stderr); return r.returncode
    print("[gen] ->", out)

    if a.slice:
        sf = os.path.join(HERE, "sprite_frames.py")
        print("[slice] 请把这一组加进 sprite_frames.py 的 SETS，然后运行：python", sf)
    return 0


if __name__ == "__main__":
    sys.exit(main())