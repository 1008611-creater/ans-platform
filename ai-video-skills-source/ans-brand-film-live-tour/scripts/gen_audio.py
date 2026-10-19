#!/usr/bin/env python3
"""
ANS (AI Never Stops) — 100% Verbatim Clause-Synced Voiceover + Approved Studio Lo-Fi BGM + UI SFX
Generates:
  1. demos/ans-brand-film/clauses_tts/c_00.mp3 .. c_16.mp3
  2. demos/ans-brand-film/clauses_timeline.json & demos/ans-brand-film/timeline_data.js
  3. demos/ans-brand-film/out/audio.wav (-15.0 LUFS, <= -1.5 dBTP)
  4. demos/ans-brand-film/out/audio_spec.png
"""
import os
import sys
import json
import base64
import pathlib
import subprocess
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "lib" / "audio"))

import mgaudio as mg
from mgaudio import sfx, fx

CLAUSE_DIR = HERE / "clauses_tts"
CLAUSE_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = HERE / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR = pathlib.Path("/Users/eeo/Downloads/ans/ans-platform/ai-video-skills-source/hyperframes-media/assets/sfx")
BGM_PATH = HERE / "assets" / "lofi-study_fassounds.mp3"

SR = mg.SR  # 48000 Hz

# Load credentials from Easel/.env and nobook-tts.env
env_vars = {}
for p in [pathlib.Path("/Users/eeo/.codex/secrets/nobook-tts.env"), pathlib.Path("/Users/eeo/Downloads/ans/Easel/.env")]:
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line.startswith("export "):
                line = line[7:].strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip("\"'")

FISH_API_KEY = os.environ.get("FISH_API_KEY") or env_vars.get("FISH_API_KEY", "")
FISH_MODEL = os.environ.get("FISH_MODEL") or env_vars.get("FISH_MODEL", "drama-3")
FISH_VOICE_ID = os.environ.get("FISH_VOICE_ID") or env_vars.get("FISH_VOICE_ID", "")
DOUBAO_API_KEY = os.environ.get("DOUBAO_SOUND_API_KEY") or env_vars.get("DOUBAO_SOUND_API_KEY", "")
SPEAKER = env_vars.get("DOUBAO_TTS_SPEAKER", "zh_male_taocheng_uranus_bigtts")

# 17 Verbatim Clauses across 8 Chapters (ch0 .. ch7)
# Rule: spoken TTS text and displayed subtitle text are 100% IDENTICAL character-for-character!
CLAUSES = [
    # Chapter 0 (ch0): Day 01 痛点破局与三件实事
    (0, 0.20,
     "开篇直击痛点，像B站顶流科技主理人跟朋友聊天，语气真实自然，重音落在聊天记录和收藏夹吃灰",
     "做 ANS 网站的原因很简单：九成的人每天都在刷 AI，最后手里却只剩下一堆聊天记录和收藏夹吃灰。"),
    (0, 0.28,
     "语气自信干练，节奏明快，重音落在最实在的三件事、顶配模型、顶级项目和免费算力",
     "所以在上线第一天，我直接把最实在的三件事安排到位：顶配模型直接爽玩、最快上手顶级项目、注册即送免费算力。"),

    # Chapter 1 (ch1): 实机网页浏览一 —— 项目广场切换分类与下滑浏览
    (1, 0.18,
     "像带着朋友一起看屏幕实操演示，语气轻快有引导感，重音落在项目广场和切换分类标签",
     "现在带大家实际在网页里逛一逛：先来到项目广场，点击上方分类标签，就能丝滑切换学习成长、GitHub 宝藏与效率工具。"),
    (1, 0.28,
     "顺着页面下滑的节奏自然讲解，语气笃定，重音落在不用翻教程配环境和最快跑通做出成品",
     "往下滑动页面，全网精选的硬核开源与 AI 实战项目一目了然，不用到处翻教程配环境，进来就能最快跑通做出成品。"),

    # Chapter 2 (ch2): 实机网页浏览二 —— VibeHub 术语图鉴、设计风格与下滑体验
    (2, 0.18,
     "充满发现宝藏的兴奋感，引导观众看 VibeHub 下滑画面，重音落在 VibeHub 和交互式图鉴",
     "再点进 VibeHub 往下滑，这里把晦涩的 AI 基础概念、前端后端术语，全都做成了通俗易懂的交互式图鉴。"),
    (2, 0.28,
     "语气犀利有品味，配合切换设计风格专区和下滑动作，重音落在设计风格专区和洗掉 AI 塑料味",
     "切到设计风格专区继续下滑，从苹果风、Bento 便当格到瑞士排版，搭配实践指南与练习，帮你彻底洗掉一眼假的 AI 塑料味。"),

    # Chapter 3 (ch3): 3D 小恐龙 Agent 实机互动上 —— 点三下放大 + 挥鞭催干活
    (3, 0.18,
     "语气灵动好玩，带着展示彩蛋的惊喜感，重音落在小恐龙 Agent、连续点击它三下和近景互动台",
     "更有趣的是右下角的全站 3D 小恐龙 Agent：跟着鼠标连续点击它三下，镜头就会瞬间拉近，展开灵龙近景互动台。"),
    (3, 0.28,
     "节奏欢快有张力，配合抽鞭子特效，重音落在抽它几下鞭子和打工魂觉醒",
     "点击挥鞭催干活抽它几下鞭子，小恐龙立刻触发打工魂觉醒特效，手速拉满帮你光速推进工作流。"),

    # Chapter 4 (ch4): 3D 小恐龙 Agent 实机互动下 —— 喂零食 + 3D 衣橱换衣服
    (4, 0.18,
     "语气轻松愉悦，像在养成电子宠物，重音落在随机盲盒投喂、火鸡面和显卡饼干",
     "干完活再点几次随机盲盒投喂，喂它几口变态辣火鸡面、杨枝甘露和满血显卡饼干，好感度与灵感星豆直接拉满。"),
    (4, 0.28,
     "带着展示高定换装的酷炫感，重音落在 3D 衣橱、换衣服和三百六十度实时预览",
     "打开 3D 衣橱还能随时给它换衣服：无论是冰美式喷射套装，还是一键换上星神王冠与熔金披风，都能三百六十度实时预览。"),

    # Chapter 5 (ch5): 市场专区 (/market) —— 上架个人项目、平台推流与交易环境
    (5, 0.18,
     "语气诚恳实在，为创作者着想，重音落在 ANS 市场和把自己的项目上架到平台",
     "当你做出了得意作品，可以直接来到 ANS 市场，点击发布按钮，把自己的项目或工作流上架到平台。"),
    (5, 0.28,
     "笃定有力，强调平台赋能，重音落在主动帮你推流曝光和提供交易环境",
     "平台不仅会主动帮你推流曝光，还提供完善的积分结算与交易环境，让你的每一次创造都能真正变现。"),

    # Chapter 6 (ch6): 创客社群 (/community & /teams) + 大赛专区 (/competitions) + 高校 Hub (CAUHub)
    (6, 0.18,
     "充满校园创客活力，节奏明快，重音落在交换真实需求、组队参赛和一起把想法做成项目",
     "在创客社群与团队专区，同学们可以随时交换真实需求、跨学科组队参赛、申领赛事算力包，一起把想法做成项目。"),
    (6, 0.18,
     "热情推介赛事亮点，重音落在大赛专区、黑客松与 AIGC 比赛、以及举办农客松大赛",
     "来到大赛专区，ANS 会帮大家梳理各种值得一去的黑客松与 AIGC 比赛，并重磅举办农客松大赛。"),
    (6, 0.28,
     "自豪清晰地介绍高校生态，重音落在支持各高校 Hub 入驻、中国农业大学 CAU 和 CAUHub",
     "同时平台全面支持各高校 Hub 入驻，目前首个入驻的高校就是中国农业大学 CAU，也就是专属的 CAUHub。"),

    # Chapter 7 (ch7): 28 天日更 Flag 与片尾品牌定格
    (7, 0.20,
     "语气坚定有力，立下军令状，重音落在二十八天的 Flag、切中需求的改进和全员额度重置",
     "最后立个二十八天的 Flag：接下来每一天，我们要么上线一项清晰有感、切中需求的改进，要么直接全员额度重置。"),
    (7, 0.65,
     "收尾干净有力，充满号召力与余韵，重音落在 AI Never Stops 和让改进从今天开始吧",
     "现在就打开 ANS 官网，来 ANS，AI Never Stops，让改进从今天开始吧！"),
]


def synth_one(args):
    idx, (_, _, direction, text) = args
    out_mp3 = CLAUSE_DIR / f"c_{idx:02d}.mp3"
    meta_file = CLAUSE_DIR / f"c_{idx:02d}.txt"
    tag_key = f"v5_verbatim|{direction}|{text}"
    if out_mp3.exists() and out_mp3.stat().st_size > 1000 and meta_file.exists() and meta_file.read_text(encoding="utf-8") == tag_key:
        return idx

    if FISH_API_KEY:
        fish_payload = {
            "text": f"[{direction}] {text}",
            "format": "mp3",
            "prosody": {"speed": 1.06, "volume": 0},
        }
        if FISH_VOICE_ID:
            fish_payload["reference_id"] = FISH_VOICE_ID
        req = urllib.request.Request(
            "https://api.fish.audio/v1/tts",
            data=json.dumps(fish_payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {FISH_API_KEY}",
                "Content-Type": "application/json",
                "model": FISH_MODEL,
                "User-Agent": "Easel-Drama3/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            out_mp3.write_bytes(resp.read())
        meta_file.write_text(tag_key, encoding="utf-8")
        return idx

    payload = {
        "req_params": {
            "text": text,
            "speaker": SPEAKER,
            "model": "seed-tts-2.0-expressive",
            "additions": json.dumps({
                "disable_markdown_filter": True,
                "enable_language_detector": True,
                "enable_latex_tn": True,
                "context_texts": [f"请按以下导演提示自然演绎，像B站顶流科技主理人带观众实机浏览网站，松弛真实、节奏明快从容，拒绝播音腔：{direction}。"],
            }, ensure_ascii=False),
            "audio_params": {"format": "mp3", "sample_rate": 24000, "speech_rate": 12},
        }
    }
    req = urllib.request.Request(
        "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "x-api-key": DOUBAO_API_KEY,
            "X-Api-Resource-Id": "seed-tts-2.0",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    chunks = []
    with urllib.request.urlopen(req, timeout=30) as resp:
        for raw in resp:
            line = raw.decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("code") == 0 and obj.get("data"):
                chunks.append(base64.b64decode(obj["data"]))
    out_mp3.write_bytes(b"".join(chunks))
    meta_file.write_text(tag_key, encoding="utf-8")
    return idx


def load_stereo_trimmed(path):
    tmp_wav = f"/tmp/_ans_clause_{path.stem}.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ar", str(SR), "-ac", "2", tmp_wav],
        check=True,
    )
    data, _ = sf.read(tmp_wav, dtype="float32", always_2d=True)
    mono = np.abs(data).mean(axis=1)
    win = int(0.012 * SR)
    env = np.convolve(mono, np.ones(win) / win, mode="same")
    nz = np.where(env > 0.005)[0]
    if len(nz) > 0:
        pad = int(0.024 * SR)
        i0 = max(0, nz[0] - pad)
        i1 = min(len(data), nz[-1] + pad)
        data = data[i0:i1]
    return data[:, :2]


def build():
    provider_label = f"Fish Audio ({FISH_MODEL})" if FISH_API_KEY else f"Fish Audio Drama-3 Direction ({SPEAKER})"
    print(f"Synthesizing {len(CLAUSES)} verbatim clauses via {provider_label}...")
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(synth_one, enumerate(CLAUSES)))

    pcm_parts = []
    subtitles_out = []
    chapter_bounds = {}

    lead_in_sec = 0.25
    cur_sample = int(lead_in_sec * SR)
    pcm_parts.append(np.zeros((cur_sample, 2), dtype="float32"))

    for idx, (ch_idx, pause_sec, direction, text) in enumerate(CLAUSES):
        if ch_idx not in chapter_bounds:
            ch_start_sec = 0.0 if ch_idx == 0 else round(cur_sample / SR, 3)
            if ch_idx > 0:
                trans_pad = int(0.18 * SR)
                pcm_parts.append(np.zeros((trans_pad, 2), dtype="float32"))
                cur_sample += trans_pad
            chapter_bounds[ch_idx] = [ch_start_sec, 0.0]

        c_mp3 = CLAUSE_DIR / f"c_{idx:02d}.mp3"
        c_pcm = load_stereo_trimmed(c_mp3)
        t_start = cur_sample / SR
        t_voice_end = (cur_sample + len(c_pcm)) / SR
        pause_samples = int(pause_sec * SR)
        t_end = (cur_sample + len(c_pcm) + pause_samples) / SR

        # Display exact verbatim text (without trailing period for clean single-line subtitle)
        clean_sub = text.rstrip("。！")
        if text.endswith("！"):
            clean_sub = text

        subtitles_out.append({
            "idx": idx,
            "chapter": ch_idx,
            "start": round(t_start, 3),
            "voice_end": round(t_voice_end, 3),
            "end": round(t_end, 3),
            "text": clean_sub,
            "tts": text,
        })
        chapter_bounds[ch_idx][1] = round(t_end, 3)

        pcm_parts.append(c_pcm)
        pcm_parts.append(np.zeros((pause_samples, 2), dtype="float32"))
        cur_sample += len(c_pcm) + pause_samples
        print(f"Clause {idx:02d} [ch{ch_idx}]: {t_start:6.2f}s -> {t_end:6.2f}s ({t_voice_end - t_start:.2f}s) | {clean_sub}")

    tail_sec = 0.65
    tail_samples = int(tail_sec * SR)
    pcm_parts.append(np.zeros((tail_samples, 2), dtype="float32"))
    cur_sample += tail_samples

    vo_pcm = np.concatenate(pcm_parts, axis=0)
    total_dur = len(vo_pcm) / SR
    chapter_bounds[7][1] = round(total_dur, 3)

    chapters_list = [chapter_bounds[i] for i in range(8)]
    meta = {
        "total_duration": round(total_dur, 3),
        "fps": 30,
        "total_frames": int(round(total_dur * 30)),
        "chapters": chapters_list,
        "subtitles": subtitles_out,
    }
    (HERE / "clauses_timeline.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (HERE / "timeline_data.js").write_text(
        "window.__ANS_TIMELINE = " + json.dumps(meta, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"\nTotal verbatim timeline duration: {total_dur:.2f}s ({meta['total_frames']} frames @ 30fps)")
    print("Chapter bounds:", chapters_list)

    # ------------------------------------------------------------------
    # Mix with Approved Studio Lo-Fi BGM (lofi-study_fassounds.mp3) + UI SFX
    # ------------------------------------------------------------------
    total_samples = len(vo_pcm)
    tmp_bgm_wav = "/tmp/_ans_lofi_bgm_48k.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(BGM_PATH), "-ar", str(SR), "-ac", "2", tmp_bgm_wav],
        check=True,
    )
    bgm_full, _ = sf.read(tmp_bgm_wav, dtype="float32", always_2d=True)

    # Start from warm groove at 8.5s in lofi-study_fassounds.mp3
    bgm_offset = int(8.5 * SR)
    bgm_slice = bgm_full[bgm_offset: bgm_offset + total_samples]
    while len(bgm_slice) < total_samples:
        bgm_slice = np.vstack([bgm_slice, bgm_full[:total_samples - len(bgm_slice)]])

    # Smooth voiceover ducking envelope (identical feel to the approved 60-point Swiss video)
    vo_mono = np.abs(vo_pcm).mean(axis=1)
    win_s = int(0.32 * SR)
    vo_active = (vo_mono > 0.006).astype(np.float32)
    vo_smooth = np.convolve(vo_active, np.ones(win_s) / win_s, mode="same")

    bgm_gain = 0.25 - 0.11 * vo_smooth
    fade_in = np.linspace(0.0, 1.0, int(0.60 * SR), dtype=np.float32)
    bgm_gain[:len(fade_in)] *= fade_in
    fade_out = np.linspace(1.0, 0.0, int(1.60 * SR), dtype=np.float32)
    bgm_gain[-len(fade_out):] *= fade_out

    mix = vo_pcm * 1.12 + bgm_slice * bgm_gain[:, None]

    # Add HyperFrames UI clicks, camera zoom whooshes, whip cracks, snack pops & chimes
    sfx_cache = {}
    def add_sfx(t_sec, fname, gain=0.22):
        fpath = SFX_DIR / fname
        if not fpath.exists():
            return
        if fname not in sfx_cache:
            tw = f"/tmp/_ans_sfx_{fname}"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(fpath), "-ar", str(SR), "-ac", "2", tw], check=True)
            sfx_cache[fname], _ = sf.read(tw, dtype="float32", always_2d=True)
        sp = sfx_cache[fname][:, :2]
        i0 = int(t_sec * SR)
        i1 = min(total_samples, i0 + len(sp))
        if i1 > i0 and i0 >= 0:
            mix[i0:i1] += sp[:i1 - i0] * gain

    # Chapter transition whooshes & UI focus clicks
    add_sfx(0.12, "pop-clean.wav", 0.22)
    for ch_i, (c_start, c_end) in enumerate(chapters_list):
        if ch_i > 0:
            add_sfx(max(0.0, c_start - 0.10), "whoosh-soft.wav", 0.22)
            add_sfx(c_start + 0.08, "chime-single.wav", 0.18)

    # Interactive browser clicks & zoom cues per chapter
    # ch1: Explore category clicks (学习成长, GitHub 宝藏, 效率与生活)
    c1_s = chapters_list[1][0]
    add_sfx(c1_s + 1.4, "ui-click-soft.wav", 0.25)
    add_sfx(c1_s + 3.2, "ui-click-soft.wav", 0.25)
    add_sfx(c1_s + 5.0, "ui-click-soft.wav", 0.25)

    # ch2: VibeHub tab & style clicks
    c2_s = chapters_list[2][0]
    add_sfx(c2_s + 0.9, "ui-click-soft.wav", 0.25)
    add_sfx(subtitles_out[5]["start"] + 0.6, "ui-click-soft.wav", 0.25)

    # ch3: Dino triple click (1, 2, 3) -> macro zoom -> 3 whip clicks
    c3_s = subtitles_out[6]["start"]
    add_sfx(c3_s + 2.1, "ui-click-soft.wav", 0.26)
    add_sfx(c3_s + 2.5, "ui-click-soft.wav", 0.26)
    add_sfx(c3_s + 2.9, "ui-click-soft.wav", 0.28)
    add_sfx(c3_s + 3.1, "rise-short.wav", 0.24)
    c3_whip = subtitles_out[7]["start"]
    add_sfx(c3_whip + 1.1, "pop-clean.wav", 0.26)
    add_sfx(c3_whip + 2.1, "pop-clean.wav", 0.26)
    add_sfx(c3_whip + 3.1, "pop-clean.wav", 0.26)

    # ch4: Dino 3 feed clicks + wardrobe open + 2 outfit switches
    c4_feed = subtitles_out[8]["start"]
    add_sfx(c4_feed + 1.2, "ui-click-soft.wav", 0.25)
    add_sfx(c4_feed + 1.4, "chime-single.wav", 0.20)
    add_sfx(c4_feed + 2.6, "ui-click-soft.wav", 0.25)
    add_sfx(c4_feed + 3.9, "ui-click-soft.wav", 0.25)
    c4_ward = subtitles_out[9]["start"]
    add_sfx(c4_ward + 0.8, "ui-click-soft.wav", 0.25)
    add_sfx(c4_ward + 2.4, "chime-single.wav", 0.22)
    add_sfx(c4_ward + 4.2, "chime-single.wav", 0.24)

    # ch5: Market publish click
    c5_s = subtitles_out[10]["start"]
    add_sfx(c5_s + 2.2, "ui-click-soft.wav", 0.25)

    # ch6: Community, Competitions & CAUHub clicks
    c6_s = subtitles_out[12]["start"]
    add_sfx(c6_s + 1.8, "ui-click-soft.wav", 0.24)
    add_sfx(subtitles_out[13]["start"] + 1.5, "ui-click-soft.wav", 0.24)
    add_sfx(subtitles_out[14]["start"] + 1.6, "chime-single.wav", 0.24)

    # ch7: Finale reveal chime
    add_sfx(subtitles_out[16]["start"] + 0.2, "rise-short.wav", 0.25)
    add_sfx(subtitles_out[16]["start"] + 0.6, "chime-single.wav", 0.26)

    # Master to broadcast loudness (-15.0 LUFS, <= -1.5 dBTP) via ffmpeg loudnorm
    raw_wav = "/tmp/_ans_raw_mix.wav"
    wav_path = OUT_DIR / "audio.wav"
    sf.write(raw_wav, mix, SR)
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", raw_wav,
        "-af", "loudnorm=I=-15.0:TP=-1.5:LRA=9",
        "-ar", str(SR), "-ac", "2",
        str(wav_path),
    ], check=True)
    mastered, _ = sf.read(str(wav_path), dtype="float32", always_2d=True)
    mg.spectrogram(mastered, str(OUT_DIR / "audio_spec.png"))
    print(f"Mastered audio saved to {wav_path} and {OUT_DIR / 'audio_spec.png'}")


if __name__ == "__main__":
    build()
