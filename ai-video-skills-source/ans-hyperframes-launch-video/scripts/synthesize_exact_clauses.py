#!/usr/bin/env python3
import os, re, json, base64, pathlib, subprocess, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import soundfile as sf

BASE_DIR = pathlib.Path("/Users/eeo/Downloads/ans/Easel/outputs/ans_preflight_verify/video_day01_indie_site")
CLAUSE_DIR = BASE_DIR / "clauses_tts_macro"
CLAUSE_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR = pathlib.Path("/Users/eeo/Downloads/ans/ans-platform/ai-video-skills-source/hyperframes-media/assets/sfx")
BGM_PATH = "/tmp/lofi-study_fassounds.mp3"
SR = 44100

env_vars = {}
for p in [pathlib.Path("/Users/eeo/.codex/secrets/nobook-tts.env"), pathlib.Path("/Users/eeo/Downloads/ans/Easel/.env")]:
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line.startswith("export "): line = line[7:].strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip("\"'")

FISH_API_KEY = os.environ.get("FISH_API_KEY") or env_vars.get("FISH_API_KEY", "")
FISH_MODEL = os.environ.get("FISH_MODEL") or env_vars.get("FISH_MODEL", "drama-3")
FISH_VOICE_ID = os.environ.get("FISH_VOICE_ID") or env_vars.get("FISH_VOICE_ID", "")
DOUBAO_API_KEY = os.environ.get("DOUBAO_SOUND_API_KEY") or env_vars["DOUBAO_SOUND_API_KEY"]
SPEAKER = "zh_male_taocheng_uranus_bigtts"

# 16 High-Dimension Macro Clauses with Drama-3 Performance Directions:
# (scene_id, pause_after_sec, drama3_direction, spoken_tts_text, clean_subtitle_text)
CLAUSES = [
    # Act 01 (s1): 破局钩子与范式革命 —— 从「对话框闲聊」到「可复现的作品生产系统」
    ("s1", 0.22,
     "开篇反问，像B站顶流科技主理人一针见血点破痛点，语速干脆有张力，重音落在聊天记录上",
     "为什么九成的人每天都在刷 AI，最后手里却只剩下一堆聊天记录？",
     "为什么九成的人每天都在刷 AI 最后手里却只剩下一堆聊天记录"),
    ("s1", 0.26,
     "语气笃定有力，对比鲜明，重音落在可复现的生产系统上，拒绝播音腔",
     "因为大多数人只把 AI 当聊天框，而真正的高手，把 AI 当成可复现的生产系统。",
     "因为大多数人只把 AI 当聊天框 而真正的高手把 AI 当成可复现的生产系统"),
    ("s1", 0.10,
     "自信亮出核心品牌，干脆利落，充满创客自豪感",
     "这就是我搭建 ANS，AI Never Stops 的根本原因——",
     "这就是我搭建 ANS · AI Never Stops 的根本原因"),
    ("s1", 0.34,
     "铿锵有力，重音落在可验证、可交付作品上",
     "一个把散乱的提示词，真正变成可验证、可交付作品的 AI 创客空间。",
     "一个把散乱的提示词 真正变成可验证可交付作品的 AI 创客空间"),

    # Act 02 (s2): 根本优势一 —— 工程化工作流闭环，终结「盲盒式抽卡」
    ("s2", 0.22,
     "像顶尖架构师拆解核心逻辑，节奏明快，重音落在终结盲盒式抽卡",
     "ANS 的第一个根本优势，是用标准化的工程管线，终结盲盒式抽卡。",
     "第一个根本优势：用标准化的工程管线 终结盲盒式抽卡"),
    ("s2", 0.22,
     "清晰干练，强调分工边界，像跟同行分享架构心得",
     "在这里，确定性的脏活全部交给底层脚本，创造性的判断交给多智能体协同。",
     "确定性的脏活交给底层脚本 创造性的判断交给多智能体协同"),
    ("s2", 0.10,
     "语气上扬，充满掌控感与秩序感",
     "每条工作流都标清了输入要求、成本边界与真实交付物，",
     "每条工作流都标清了输入要求 成本边界与真实交付物"),
    ("s2", 0.34,
     "干脆收束，重音落在稳定产出工业级作品",
     "让你从第一秒就知道怎么跑通闭环、稳定产出工业级作品。",
     "让你从第一秒就知道怎么跑通闭环 稳定产出工业级作品"),

    # Act 03 (s3): 根本优势二 —— 内行审美编码进底层，彻底洗掉「AI 塑料模板感」
    ("s3", 0.22,
     "语气犀利有态度，直击AI塑料感痛点，重音落在洗掉AI塑料味",
     "第二个根本优势，是把内行审美编码进底层，彻底洗掉一眼假的 AI 塑料味。",
     "第二个根本优势：把内行审美编码进底层 彻底洗掉 AI 塑料味"),
    ("s3", 0.22,
     "松弛自信，一语道破本质原因",
     "普通 AI 做出来的界面和文案之所以廉价雷同，是因为缺少专业的设计约束。",
     "普通 AI 界面和文案之所以廉价雷同 是因为缺少专业的设计约束"),
    ("s3", 0.10,
     "语速流畅有节奏感，展现沉淀的技术厚度",
     "ANS 把三百多个内行术语、二十四套工业级设计规范与去 AI 味准则做成积木，",
     "ANS 把 300+ 内行术语 24 套设计规范与去 AI 味准则做成积木"),
    ("s3", 0.34,
     "尾音干净利落，带着一键解决痛点的爽快感",
     "哪怕你不懂专业术语，也能一键把大白话转写成大师级的精准指令。",
     "哪怕不懂专业术语 也能一键把大白话转写成大师级精准指令"),

    # Act 04 (s4): 根本优势三 —— 3D 小恐龙原生交互舞台 × 100% 样本验真与透明算力生态
    ("s4", 0.22,
     "语气轻快跃动，带着展示3D小恐龙黑科技的兴奋感",
     "第三个根本优势，是全站原生的 3D 小恐龙交互舞台与百分百验真的算力生态。",
     "第三个根本优势：原生 3D 小恐龙交互舞台与 100% 验真算力生态"),
    ("s4", 0.14,
     "生动自然，画面感拉满，语速明快",
     "从网页端零算力实时互动的 3D 小恐龙展厅，到多模型成本透明路由，",
     "从网页端零算力实时互动的 3D 小恐龙展厅 到多模型成本透明路由"),
    ("s4", 0.28,
     "诚恳坚定，强调百分百验真底线，极具信任感",
     "凡是开放交付的工作流全部公开真实样本切片；做不到百分百自动交付的，绝不开放购买。",
     "开放交付的工作流全部公开真实样本切片 100% 能交付才开放购买"),
    ("s4", 0.55,
     "热情号召，充满年轻创客的感染力与余韵",
     "现在就打开 ans.cauai.fun，二十八天日更挑战第一天，和小恐龙一起把灵感变成真作品！",
     "打开 ans.cauai.fun · 28 天挑战 Day 01 和小恐龙一起把灵感变成真作品"),
]

def synth_one(args):
    idx, (_, _, direction, tts_txt, _) = args
    out_mp3 = CLAUSE_DIR / f"c_{idx:02d}.mp3"

    # Prefer Fish Audio Drama 3 if FISH_API_KEY is configured
    if FISH_API_KEY:
        fish_payload = {
            "text": f"[{direction}] {tts_txt}",
            "format": "mp3",
            "prosody": {"speed": 1.04, "volume": 0},
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
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            out_mp3.write_bytes(resp.read())
        return idx

    # Expressive per-line direction via Seed-TTS 2.0 Expressive
    payload = {
        "req_params": {
            "text": tts_txt,
            "speaker": SPEAKER,
            "model": "seed-tts-2.0-expressive",
            "additions": json.dumps({
                "disable_markdown_filter": True,
                "enable_language_detector": True,
                "enable_latex_tn": True,
                "context_texts": [f"请按以下导演提示自然演绎，拒绝机械播音腔：{direction}。"],
            }, ensure_ascii=False),
            "audio_params": {"format": "mp3", "sample_rate": 24000, "speech_rate": 6}
        }
    }
    req = urllib.request.Request(
        "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"x-api-key": DOUBAO_API_KEY, "X-Api-Resource-Id": "seed-tts-2.0", "Content-Type": "application/json"},
        method="POST"
    )
    chunks = []
    with urllib.request.urlopen(req, timeout=25) as resp:
        for raw in resp:
            line = raw.decode("utf-8", errors="ignore").strip()
            if not line: continue
            obj = json.loads(line)
            if obj.get("code") == 0 and obj.get("data"):
                chunks.append(base64.b64decode(obj["data"]))
    out_mp3.write_bytes(b"".join(chunks))
    return idx

provider_label = f"Fish Audio ({FISH_MODEL})" if FISH_API_KEY else "Seed-TTS 2.0 Expressive (Drama-3 Per-Line Direction)"
print(f"Synthesizing 16 macro clauses via {provider_label}...")
with ThreadPoolExecutor(max_workers=4) as ex:
    list(ex.map(synth_one, enumerate(CLAUSES)))

def load_stereo_trimmed(path):
    tmp_wav = f"/tmp/_cm_{path.stem}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ar", str(SR), "-ac", "2", tmp_wav], check=True)
    data, _ = sf.read(tmp_wav, dtype="float32", always_2d=True)
    mono = np.abs(data).mean(axis=1)
    win = int(0.012 * SR)
    env = np.convolve(mono, np.ones(win)/win, mode="same")
    nz = np.where(env > 0.006)[0]
    if len(nz) > 0:
        pad = int(0.024 * SR)
        i0 = max(0, nz[0] - pad)
        i1 = min(len(data), nz[-1] + pad)
        data = data[i0:i1]
    return data[:, :2]

pcm_parts = []
subtitles_out = []
scene_bounds = {}
cur_sample = int(0.12 * SR)
pcm_parts.append(np.zeros((cur_sample, 2), dtype="float32"))

for idx, (sc_id, pause_sec, direction, tts_txt, sub_txt) in enumerate(CLAUSES):
    c_mp3 = CLAUSE_DIR / f"c_{idx:02d}.mp3"
    c_pcm = load_stereo_trimmed(c_mp3)
    t_start = cur_sample / SR
    t_end = (cur_sample + len(c_pcm)) / SR
    pause_samples = int(pause_sec * SR)
    sub_end = (cur_sample + len(c_pcm) + pause_samples) / SR
    subtitles_out.append([round(t_start, 3), round(sub_end, 3), sub_txt])
    if sc_id not in scene_bounds:
        scene_bounds[sc_id] = [round(t_start, 3), round(sub_end, 3)]
    else:
        scene_bounds[sc_id][1] = round(sub_end, 3)

    pcm_parts.append(c_pcm)
    pcm_parts.append(np.zeros((pause_samples, 2), dtype="float32"))
    cur_sample += len(c_pcm) + pause_samples
    print(f"Clause {idx:02d} [{sc_id}]: {t_start:6.3f}s -> {sub_end:6.3f}s ({t_end - t_start:.2f}s) | {sub_txt}")

vo_pcm = np.concatenate(pcm_parts, axis=0)
total_samples = len(vo_pcm)
total_dur = total_samples / SR
print(f"\nTotal exact macro timeline duration: {total_dur:.3f}s ({total_samples} samples)")
print("Scene bounds:", json.dumps(scene_bounds, ensure_ascii=False))

meta_json = {
    "total_duration": round(total_dur, 3),
    "scene_bounds": scene_bounds,
    "subtitles": subtitles_out,
}
(BASE_DIR / "clauses_timeline.json").write_text(json.dumps(meta_json, ensure_ascii=False, indent=2), encoding="utf-8")

# Mix with approved Studio BGM (/tmp/lofi-study_fassounds.mp3)
tmp_bgm_wav = "/tmp/_bgm_44k.wav"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", BGM_PATH, "-ar", str(SR), "-ac", "2", tmp_bgm_wav], check=True)
bgm_full, _ = sf.read(tmp_bgm_wav, dtype="float32", always_2d=True)

browser_reveal_t = subtitles_out[2][0]
bgm_offset = max(0, int((9.00 - browser_reveal_t) * SR))
bgm_slice = bgm_full[bgm_offset : bgm_offset + total_samples]
if len(bgm_slice) < total_samples:
    bgm_slice = np.vstack([bgm_slice, bgm_full[:total_samples - len(bgm_slice)]])

vo_mono = np.abs(vo_pcm).mean(axis=1)
win_s = int(0.30 * SR)
vo_active = (vo_mono > 0.007).astype(np.float32)
vo_smooth = np.convolve(vo_active, np.ones(win_s)/win_s, mode="same")

bgm_gain = 0.24 - 0.11 * vo_smooth
fade_in = np.linspace(0.0, 1.0, int(0.45 * SR), dtype=np.float32)
bgm_gain[:len(fade_in)] *= fade_in
fade_out = np.linspace(1.0, 0.0, int(1.4 * SR), dtype=np.float32)
bgm_gain[-len(fade_out):] *= fade_out

mix = vo_pcm * 1.10 + bgm_slice * bgm_gain[:, None]

# Add HyperFrames motion & UI SFX aligned to exact clause cues
sfx_cache = {}
def add_sfx(t_sec, fname, gain):
    fpath = SFX_DIR / fname
    if not fpath.exists(): return
    if fname not in sfx_cache:
        tw = f"/tmp/_sfx_{fname}"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(fpath), "-ar", str(SR), "-ac", "2", tw], check=True)
        sfx_cache[fname], _ = sf.read(tw, dtype="float32", always_2d=True)
    sp = sfx_cache[fname][:, :2]
    i0 = int(t_sec * SR)
    i1 = min(total_samples, i0 + len(sp))
    if i1 > i0:
        mix[i0:i1] += sp[:i1 - i0] * gain

# Hook pops & ANS brand reveal
add_sfx(0.10, "pop-clean.wav", 0.24)
add_sfx(subtitles_out[1][0], "whoosh-soft.wav", 0.22)
add_sfx(subtitles_out[2][0], "rise-short.wav", 0.26)
add_sfx(subtitles_out[2][0] + 0.08, "chime-single.wav", 0.24)

# Fundamental Advantage 01, 02, 03 transitions & interactive clicks
for idx_c in [4, 5, 6, 8, 10, 11, 12, 13, 14, 15]:
    add_sfx(subtitles_out[idx_c][0], "whoosh-soft.wav", 0.22)
    add_sfx(subtitles_out[idx_c][0] + 0.55, "ui-click-soft.wav", 0.24)

add_sfx(subtitles_out[7][0] + 0.25, "chime-single.wav", 0.22)
add_sfx(subtitles_out[11][0] + 0.25, "chime-single.wav", 0.24)
add_sfx(subtitles_out[14][0] + 0.25, "chime-single.wav", 0.22)
add_sfx(subtitles_out[15][0] + 0.25, "chime-single.wav", 0.26)

peak = np.max(np.abs(mix))
if peak > 0.96:
    mix = mix * (0.95 / peak)

tmp_mix_wav = str(BASE_DIR / "_oil_mixed_audio.wav")
out_m4a = str(BASE_DIR / "_oil_mixed_audio.m4a")
sf.write(tmp_mix_wav, mix, SR)
subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-i", tmp_mix_wav,
    "-af", "loudnorm=I=-15:TP=-1.5:LRA=9",
    "-c:a", "aac", "-b:a", "192k",
    out_m4a
], check=True)
print("Saved exact macro clause-synced master audio:", out_m4a)
