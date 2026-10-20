# -*- coding: utf-8 -*-
"""像素风芯片音乐 BGM + 音效（numpy 合成，无需外部素材）"""
import os, wave
import numpy as np

SR = 44100

def env(n, a=0.005, d=0.08, s=0.6, r=0.12, sus=0.75):
    """ADSR 包络，n 采样点"""
    e = np.zeros(n)
    ai, di = int(SR * a), int(SR * d)
    ri = int(SR * r)
    si = max(1, n - ai - di - ri)
    e[:ai] = np.linspace(0, 1, ai, endpoint=False)
    e[ai:ai + di] = np.linspace(1, sus, di, endpoint=False)
    e[ai + di:ai + di + si] = sus
    e[ai + di + si:] = np.linspace(sus, 0, len(e) - (ai + di + si))
    return e

def note(freq, dur, wave_type="square", vol=0.25, duty=0.5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    if wave_type == "square":
        w = np.where((t * freq) % 1 < duty, 1.0, -1.0)
    elif wave_type == "tri":
        w = 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1
    elif wave_type == "saw":
        w = 2 * ((t * freq) % 1) - 1
    else:
        w = np.sin(2 * np.pi * freq * t)
    return w * env(n) * vol

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def build_bgm(bars=16, bpm=124, out=None):
    """4/4 芯片音乐循环：主旋律 + 低音 + 踩镲噪声"""
    beat = 60.0 / bpm
    step = beat / 4                      # 十六分音符
    total_steps = bars * 16
    n = int(SR * step * total_steps)
    mix = np.zeros(n + SR * 2)

    # 和弦走向（A 小调流行）：Am F C G
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
    # 主旋律（MIDI 音高，-1 = 休止），8 小节循环两遍
    melody = [76,-1,79,81, -1,79,76,-1, 74,-1,76,79, -1,76,74,-1,
              72,-1,74,76, -1,76,74,-1, 71,-1,74,71, -1,69,-1,-1,
              76,-1,79,81, -1,84,81,-1, 79,-1,76,79, -1,74,-1,-1,
              72,-1,74,76, -1,79,76,-1, 74,-1,71,74, -1,69,-1,-1]
    for i in range(total_steps):
        pos = int(i * step * SR)
        bar = (i // 16) % 4
        root, chord = prog[bar]
        # 低音：每拍一下
        if i % 4 == 0:
            seg = note(midi(root - 12), step * 3.6, "tri", 0.30)
            mix[pos:pos + len(seg)] += seg
        # 和弦铺底：每半拍轻击
        if i % 2 == 0:
            for c in chord:
                seg = note(midi(c + 12), step * 1.6, "square", 0.035, duty=0.25)
                mix[pos:pos + len(seg)] += seg
        # 主旋律
        m = melody[i % len(melody)]
        if m > 0:
            seg = note(midi(m), step * 2.4, "square", 0.16, duty=0.5)
            mix[pos:pos + len(seg)] += seg
        # 踩镲
        if i % 4 == 2:
            hn = int(SR * step * 0.5)
            noise = np.random.RandomState(i).randn(hn) * env(hn, 0.001, 0.02, 0.05, 0.03, 0.2) * 0.05
            mix[pos:pos + hn] += noise
    mix = mix[:n]
    mix /= max(1e-9, np.abs(mix).max()) * 1.15
    if out:
        wav_write(out, mix)
    return mix

def sfx_pop(out):
    n = int(SR * 0.12); t = np.arange(n) / SR
    f = np.linspace(900, 1600, n)
    w = np.sin(2 * np.pi * f * t) * env(n, 0.002, 0.04, 0.2, 0.05, 0.1)
    wav_write(out, w * 0.5)

def sfx_whoosh(out):
    n = int(SR * 0.45)
    noise = np.random.RandomState(7).randn(n)
    k = np.linspace(0, 1, n)
    bp = noise * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * k))
    w = bp * np.concatenate([np.linspace(0, 1, n // 3), np.linspace(1, 0, n - n // 3)]) * 0.4
    wav_write(out, w)

def sfx_coin(out):
    n = int(SR * 0.35)
    a = note(midi(88), 0.12, "square", 0.4)
    b = note(midi(95), 0.22, "square", 0.35)
    mix = np.zeros(n); mix[:len(a)] += a; mix[:len(b)] += b
    wav_write(out, mix)

def sfx_tick(out):
    n = int(SR * 0.05)
    t = np.arange(n) / SR
    w = np.sin(2 * np.pi * 2200 * t) * env(n, 0.001, 0.01, 0.05, 0.02, 0.05)
    wav_write(out, w * 0.35)

def sfx_ding(out):
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    w = (np.sin(2 * np.pi * midi(84) * t) * 0.6 + np.sin(2 * np.pi * midi(91) * t) * 0.3) * env(n, 0.002, 0.25, 0.4, 0.3, 0.2)
    wav_write(out, w * 0.45)

def wav_write(path, mono):
    data = np.clip(mono, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "w") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())

if __name__ == "__main__":
    V = os.path.dirname(os.path.abspath(__file__))
    A = os.path.join(V, "audio"); os.makedirs(A, exist_ok=True)
    build_bgm(out=os.path.join(A, "bgm.wav"))
    sfx_pop(os.path.join(A, "pop.wav")); sfx_whoosh(os.path.join(A, "whoosh.wav"))
    sfx_coin(os.path.join(A, "coin.wav")); sfx_tick(os.path.join(A, "tick.wav")); sfx_ding(os.path.join(A, "ding.wav"))
    print("音频生成完毕:", os.listdir(A))
