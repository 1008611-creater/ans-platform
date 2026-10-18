"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useSettingsRequest } from "@/components/settings/account-request";
import { detectIntentAndMatchTerms, upgradeToStructuredBrief } from "@/domain/vibehub/ans-site-optimizers";


export interface CodexWorkbenchProps {
  actorId: string;
  current: string;
  codexWorkbench?: boolean;
  points?: number;
  xp?: number;
  levelName?: string;
  runCount?: number;
  teamCount?: number;
  locale?: string;
  initialPrompt?: string;
}

interface CodexTaskLink {
  labelZh: string;
  labelEn?: string;
  href: string;
}

interface CodexTask {
  id: string;
  title: string;
  tag: string;
  model: string;
  status: "completed" | "running" | "ready";
  prompt: string;
  trace: string[];
  summary: string;
  links?: CodexTaskLink[];
  artifactType: "html" | "markdown" | "python";
  artifactFile: string;
  artifactCode: string;
}

const INITIAL_CODEX_TASKS: CodexTask[] = [
  {
    id: "task-3d-agri-dashboard",
    title: "🌐 智慧农田数字孪生监测微站 (可交互 HTML/Canvas)",
    tag: "Web / Live Preview",
    model: "deepseek-v4.1-flash",
    status: "completed",
    prompt: "用单文件 HTML5 + Canvas 生成一个可交互的中国农大智慧农田数字孪生监测看板，包含实时传感器曲线、土壤墒情热力粒子与 AI 灌溉决策按钮。",
    trace: [
      "✓ [1/3] repo.analyze_context — 加载 ANS × 农客松前端视觉规范 (95ms)",
      "✓ [2/3] codex.generate_code — 生成单文件响应式 HTML5 + Canvas 粒子看板 (218 lines)",
      "✓ [3/3] sandbox.mount_iframe — 已挂载至右侧实时预览画布 (0 errors)",
    ],
    summary: "已为你生成单文件可交互《CAU × ANS 智慧农田数字孪生监测大屏》（含 Canvas 实时动态传感器波形、地块墒情矩阵与一键 AI 处方生成）。你可在右侧「👁️ 实时预览」直接点击交互，或切换到「💻 源码编辑」实时修改代码！",
    artifactType: "html",
    artifactFile: "agri-digital-twin-dashboard.html",
    artifactCode: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>CAU × ANS 智慧农田数字孪生监测台</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #060b16; color: #e2e8f0; padding: 16px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(52,211,153,0.25); padding-bottom: 12px; margin-bottom: 14px; }
  .badge { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #6ee7b7; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .card { background: rgba(15,23,42,0.9); border: 1px solid rgba(148,163,184,0.2); border-radius: 12px; padding: 12px; }
  .card small { color: #94a3b8; font-size: 11px; }
  .card strong { display: block; font-size: 20px; margin-top: 4px; color: #34d399; }
  canvas { width: 100%; height: 150px; background: #091326; border-radius: 12px; border: 1px solid rgba(56,189,248,0.25); display: block; margin-bottom: 12px; }
  .actions { display: flex; gap: 8px; align-items: center; justify-content: space-between; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); padding: 10px 12px; border-radius: 12px; }
  button { background: linear-gradient(135deg, #10b981, #059669); color: #022c22; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; }
  button:hover { filter: brightness(1.1); }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:15px;font-weight:800;">🌾 CAU × ANS 智慧农田数字孪生监测台</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px;">实验地块：涿州教学实验场 A-03 区 · Pi-Codex 实时渲染</div>
    </div>
    <span class="badge" id="statusBadge">🟢 传感器在线 · 60fps</span>
  </div>
  <div class="grid">
    <div class="card"><small>土壤含水率 (20cm)</small><strong id="valMoist">64.8%</strong></div>
    <div class="card"><small>冠层光合有效辐射</small><strong id="valPar" style="color:#38bdf8;">1,180 μmol</strong></div>
    <div class="card"><small>AI 产量预测指数</small><strong id="valYield" style="color:#fbbf24;">+14.2% ↑</strong></div>
  </div>
  <canvas id="waveCanvas" width="600" height="160"></canvas>
  <div class="actions">
    <div id="aiAdvice" style="font-size:12px;color:#a7f3d0;">🤖 Pi-Codex 诊断：当前根系水分充足，建议 18:00 后开启微喷水肥一体化 15 分钟。</div>
    <button onclick="triggerIrrigate()">⚡ 一键下发 AI 灌溉处方</button>
  </div>
  <script>
    const canvas = document.getElementById("waveCanvas");
    const ctx = canvas.getContext("2d");
    let t = 0, boost = 1;
    function triggerIrrigate() {
      boost = 2.4;
      document.getElementById("valMoist").textContent = (66 + Math.random()*4).toFixed(1) + "%";
      document.getElementById("aiAdvice").textContent = "✅ 已下发水肥处方！滴灌电磁阀 V-03 已开启，预计节水 22.5%。";
      setTimeout(() => { boost = 1; }, 2500);
    }
    function loop() {
      t += 0.04 * boost;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 4) {
        const y = 80 + Math.sin(x * 0.02 + t) * 32 * boost + Math.cos(x * 0.05 - t) * 12;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 4) {
        const y = 90 + Math.cos(x * 0.018 - t * 0.8) * 26;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`,
  },
  {
    id: "task-toonflow-director",
    title: "🎬 Toonflow · AI 漫剧分镜导演与提示词工坊",
    tag: "AIGC 漫剧",
    model: "gpt-6-astra",
    status: "completed",
    prompt: "生成一个可交互的 AI 漫剧 4 镜头故事板导演台，支持点击分镜卡实时合成运镜提示词（Camera Motion + Character Seed）并一键复制。",
    trace: [
      "✓ [1/3] script.breakdown — 拆解 4 个核心漫剧分镜与角色一致性 Seed #4092",
      "✓ [2/3] camera.compose_motion — 注入 Dolly In / Orbit / Tracking / Crane Up 运镜参数",
      "✓ [3/3] sandbox.mount_iframe — 分镜导演台已挂载至右侧实时预览画布",
    ],
    summary: "已构建《Toonflow · AI 漫剧分镜导演与角色锁定台》，包含 4 个可点击切换的分镜故事板卡片与实时 Sora / Toonflow 提示词合成器。",
    artifactType: "html",
    artifactFile: "toonflow-storyboard-director.html",
    artifactCode: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #130b24; color: #f5f3ff; padding: 22px; }
  .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(167,139,250,0.25); padding-bottom: 12px; }
  .shots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px; }
  .shot { background: rgba(30,27,75,0.65); border: 1px solid rgba(167,139,250,0.3); border-radius: 12px; padding: 12px; cursor: pointer; transition: border-color .2s; }
  .shot:hover { border-color: #f59e0b; }
  .shot .num { font-size: 11px; color: #fbbf24; font-weight: 800; }
  .shot h4 { font-size: 14px; margin-top: 4px; }
  .shot p { font-size: 11.5px; color: #c4b5fd; margin-top: 4px; line-height: 1.45; }
  .prompt-box { margin-top: 14px; background: rgba(15,23,42,0.85); border: 1px solid rgba(251,191,36,0.4); border-radius: 12px; padding: 14px; }
  button { margin-top: 10px; cursor: pointer; border: none; border-radius: 8px; padding: 8px 14px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: white; font-weight: 700; font-size: 12px; }
</style>
</head>
<body>
  <div class="top">
    <div><h2 style="font-size:19px">🎬 Toonflow · AI 漫剧分镜导演与角色锁定台</h2><p style="font-size:12px;color:#c4b5fd;margin-top:3px">点击任意分镜卡实时合成运镜提示词 (Camera Motion + Character Seed)</p></div>
    <span style="background:rgba(245,158,11,0.2);border:1px solid #f59e0b;color:#fde68a;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700">4 镜头就绪</span>
  </div>
  <div class="shots">
    <div class="shot" onclick="setShot('Shot 01 · 远景推镜 (Dolly In)：赛博农大玻璃温室夜景，霓虹光雨洒在基因作物叶片上，少女研究员林夏回头，8k Anime Style, Seed #4092')"><div class="num">SHOT 01 · 远景推镜 (Dolly In)</div><h4>赛博温室 · 霓虹夜雨开场</h4><p>镜头缓缓推进玻璃穹顶，发光麦穗随呼吸闪烁，锁定主角林夏面部特征。</p></div>
    <div class="shot" onclick="setShot('Shot 02 · 特写环绕 (Orbit Close-up)：全息光屏浮现叶绿素突变曲线，林夏瞳孔倒映金色数据流，浅景深, Cinematic Lighting, Seed #4092')"><div class="num">SHOT 02 · 特写环绕 (Orbit)</div><h4>全息光谱 · 突变曲线觉醒</h4><p>360 度环绕特写，全息屏金光映照主角瞳孔，强化悬疑张力。</p></div>
    <div class="shot" onclick="setShot('Shot 03 · 跟随仰拍 (Low-Angle Tracking)：小恐龙机甲伴侣 Minty 展开全息护盾冲出温室走廊，粒子尾迹，Dynamic Motion')"><div class="num">SHOT 03 · 跟随仰拍 (Tracking)</div><h4>小恐龙 Minty · 机甲护盾展开</h4><p>低机位高速跟拍，小恐龙吉祥物化身为量子护盾伴侣腾空跃起。</p></div>
    <div class="shot" onclick="setShot('Shot 04 · 航拍拉远 (Crane Up)：整座智慧农业浮空岛点亮金色能量矩阵，漫天星轨汇聚成 ANS 徽章，Epic Finale')"><div class="num">SHOT 04 · 航拍拉远 (Crane Up)</div><h4>浮空农庄 · 能量矩阵终章</h4><p>高空摇臂拉远，整座未来农庄被金色星轨点亮，形成视觉高潮。</p></div>
  </div>
  <div class="prompt-box">
    <div style="font-size:11px;color:#fde68a;font-weight:700">📋 当前合成的 Toonflow / Sora 视频生成指令：</div>
    <p id="out" style="font-family:monospace;font-size:12px;color:#f8fafc;margin-top:6px;line-height:1.5">Shot 01 · 远景推镜 (Dolly In)：赛博农大玻璃温室夜景，霓虹光雨洒在基因作物叶片上，少女研究员林夏回头，8k Anime Style, Seed #4092</p>
    <button onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('out').textContent);this.textContent='✅ 已复制分镜 Prompt！可粘贴至 Toonflow'">✨ 一键复制分镜 Prompt</button>
  </div>
  <script>function setShot(t){document.getElementById('out').textContent=t;}</script>
</body>
</html>`,
  },
  {
    id: "task-cyber-snake",
    title: "🎮 极客摸鱼 · 赛博霓虹贪吃蛇 (Canvas 60FPS)",
    tag: "Canvas 游戏",
    model: "deepseek-v4.1-flash",
    status: "completed",
    prompt: "用纯 HTML5 Canvas 编写一个 60fps 可玩版赛博霓虹贪吃蛇小游戏，支持键盘方向键与屏幕按钮操控、穿墙模式与实时计分。",
    trace: [
      "✓ [1/2] game.loop_setup — 构建 20x16 网格状态机与赛博霓虹渲染管线",
      "✓ [2/2] input.bind_controls — 已绑定键盘方向键与触控按钮，右侧预览可直接畅玩",
    ],
    summary: "已生成单文件 HTML5 赛博霓虹贪吃蛇游戏，右侧预览窗口即可直接用方向键或屏幕按钮开始游玩！",
    artifactType: "html",
    artifactFile: "cyber-neon-snake.html",
    artifactCode: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #060913; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 14px; }
  .hud { display: flex; align-items: center; justify-content: space-between; width: 420px; margin-bottom: 10px; }
  canvas { background: #0f172a; border: 2px solid #6366f1; border-radius: 14px; box-shadow: 0 0 30px rgba(99,102,241,0.35); }
  .controls { margin-top: 10px; display: flex; gap: 8px; }
  button { cursor: pointer; border: 1px solid rgba(99,102,241,0.5); background: rgba(30,41,59,0.9); color: #e2e8f0; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; }
  button:hover { background: #4f46e5; color: white; }
</style>
</head>
<body>
  <div class="hud">
    <div><strong>🎮 赛博霓虹贪吃蛇</strong> <span style="font-size:11px;color:#94a3b8">(方向键或下方按钮控制)</span></div>
    <div style="color:#34d399;font-weight:800">得分: <span id="score">0</span></div>
  </div>
  <canvas id="game" width="420" height="320"></canvas>
  <div class="controls">
    <button onclick="setDir(0,-1)">⬆️ 上</button>
    <button onclick="setDir(0,1)">⬇️ 下</button>
    <button onclick="setDir(-1,0)">⬅️ 左</button>
    <button onclick="setDir(1,0)">➡️ 右</button>
    <button onclick="resetGame()" style="background:#059669;border-color:#10b981">🔄 重新开始</button>
  </div>
<script>
  const cvs = document.getElementById('game'), ctx = cvs.getContext('2d');
  const S = 20, W = cvs.width / S, H = cvs.height / S;
  let snake, dir, food, score;
  function resetGame() {
    snake = [{x: 10, y: 8}, {x: 9, y: 8}, {x: 8, y: 8}];
    dir = {x: 1, y: 0}; score = 0;
    document.getElementById('score').textContent = score;
    spawnFood();
  }
  function spawnFood() { food = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) }; }
  window.setDir = (x, y) => { if (x !== -dir.x || y !== -dir.y) dir = {x, y}; };
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') setDir(0, -1);
    if (e.key === 'ArrowDown') setDir(0, 1);
    if (e.key === 'ArrowLeft') setDir(-1, 0);
    if (e.key === 'ArrowRight') setDir(1, 0);
  });
  resetGame();
  setInterval(() => {
    const head = { x: (snake[0].x + dir.x + W) % W, y: (snake[0].y + dir.y + H) % H };
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) { resetGame(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10; document.getElementById('score').textContent = score; spawnFood();
    } else { snake.pop(); }
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#f43f5e'; ctx.beginPath();
    ctx.arc(food.x * S + S/2, food.y * S + S/2, S/2 - 2, 0, Math.PI * 2); ctx.fill();
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#34d399' : '#6366f1';
      ctx.fillRect(seg.x * S + 2, seg.y * S + 2, S - 4, S - 4);
    });
  }, 130);
</script>
</body>
</html>`,
  },
  {
    id: "task-agrihackathon-kit",
    title: "🌾 农客松参赛立项 + 架构与 FastAPI 启动代码",
    tag: "Hackathon / Full-Stack",
    model: "deepseek-v4.1-flash",
    status: "completed",
    prompt: "生成中国农大智耕黑客松（AgriHackathon）参赛立项方案、系统架构与 FastAPI 多模态病虫害推理后端代码。",
    trace: [
      "✓ [1/3] rules.align_scoring — 对齐农客松 5 大评分维度（创新性/技术深度/完整度/痛点/契合度）",
      "✓ [2/3] codex.scaffold_repo — 生成 FastAPI + 多模态 Agent 后端服务与路演大纲",
      "✓ [3/3] canvas.write_artifact — 已输出可复制工程代码与立项书",
    ],
    summary: "已生成《智耕黑客松参赛立项方案与 FastAPI 多模态后端骨架》，对齐农客松 5 大评分标准，可直接复制源码或一键前往项目广场提交参赛。",
    artifactType: "python",
    artifactFile: "agrihackathon_agent_server.py",
    artifactCode: `# CAU AgriHackathon 2026 · 智慧植保多模态 Agent 后端骨架 (FastAPI)
from fastapi import FastAPI, pydantic
from pydantic import BaseModel
import datetime

app = FastAPI(title="AgriGuard Pi-Codex Agent API", version="1.0.0")

class CropDiagnosisRequest(BaseModel):
    crop_type: str = "冬小麦 (Winter Wheat)"
    leaf_symptom: str = "叶片中下部出现梭形褐斑，边缘黄色晕圈"
    soil_moisture: float = 62.5
    temperature_c: float = 21.8

@app.post("/api/v1/diagnose")
async def diagnose_crop(req: CropDiagnosisRequest):
    """对齐农客松技术完整度评分：融合表型特征与农田微气象数据输出防治处方"""
    risk_score = 0.86 if req.soil_moisture > 60 and 18 <= req.temperature_c <= 25 else 0.42
    return {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "crop": req.crop_type,
        "diagnosis": "小麦条锈病 / 叶枯病早期复合风险" if risk_score > 0.7 else "生理性叶尖黄化",
        "confidence": risk_score,
        "prescription": [
            "1. 无人机变量喷施：戊唑醇·嘧菌酯悬浮剂 15ml/亩",
            "2. 农田微气象调控：未来48h暂停漫灌，降低冠层湿度",
        ],
    }
`,
  },
];

export function DisplayNameEditor(props: CodexWorkbenchProps) {
  if (props.codexWorkbench) {
    return <PiCodexWorkbench {...props} />;
  }
  return <LegacyDisplayNameEditor actorId={props.actorId} current={props.current} />;
}

function LegacyDisplayNameEditor(props: { actorId: string; current: string }) {
  const { data, status } = useSession();
  if (status !== "authenticated" || data?.user?.id !== props.actorId) return null;
  return <DisplayNameForm key={props.actorId} {...props} />;
}

function DisplayNameForm({ current, actorId }: { current: string; actorId: string }) {
  const { request, isActive } = useSettingsRequest(actorId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    const nickname = value.trim();
    if (nickname.length < 2 || nickname.length > 40) {
      toast.error("昵称需为 2-40 个字符");
      return;
    }
    if (nickname === current) { setOpen(false); return; }
    setSaving(true);
    try {
      const profile = await request<{ name?: string; username: string }>("/api/user/profile");
      if (!isActive()) return;
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-ans-actor": actorId },
        cache: "no-store", credentials: "same-origin",
        body: JSON.stringify({
          name: profile.name ?? nickname,
          username: profile.username,
          nickname,
        }),
      });
      const result = await response.json();
      if (!isActive()) return;
      if (!response.ok) {
        const retry = Number(response.headers.get("Retry-After") || 0);
        toast.error(`${result.message || "修改失败"}${retry ? `（约 ${Math.ceil(retry / 60)} 分钟后可再次修改）` : ""}`);
        return;
      }
      toast.success("昵称已更新（30 天后可再次修改）");
      setOpen(false);
      window.location.reload();
    } catch {
      if (isActive()) toast.error("修改失败，请稍后重试");
    } finally {
      if (isActive()) setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="ms-2 h-7 gap-1 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" /> 改昵称
      </Button>
    );
  }

  return (
    <span className="ms-2 inline-flex items-center gap-1.5 align-middle">
      <Input
        value={value}
        maxLength={40}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") setOpen(false); }}
        className="h-7 w-40 text-sm"
        aria-label="新昵称"
      />
      <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => void save()}>
        {saving ? "保存中…" : "保存"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setOpen(false)}>取消</Button>
    </span>
  );
}

function PiCodexWorkbench({
  actorId,
  current,
  points = 0,
  levelName = "Lv.1",
  initialPrompt = "",
}: CodexWorkbenchProps) {
  const [tasks, setTasks] = useState<CodexTask[]>(INITIAL_CODEX_TASKS);
  const [activeId, setActiveId] = useState<string>(INITIAL_CODEX_TASKS[0].id);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [running, setRunning] = useState<boolean>(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code" | "terminal" | "tools">("preview");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[00:00.01] $ pi-codex init --mode=work --sandbox=ans-cloud-v2",
    "[00:00.08] ✓ Connected to ANS Compute Cluster (DeepSeek-V3 / GPT-6.1-Sol / Qwen-Coder)",
    "[00:00.12] ✓ Mounted live HTML5/Canvas preview sandbox & artifact editor",
  ]);
  const [livePoints, setLivePoints] = useState<number>(points);

  const activeTask = tasks.find(t => t.id === activeId) ?? tasks[0];

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      void executeCodexTask(initialPrompt.trim(), "playground");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeCodexTask(customPrompt?: string, intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" = "playground") {
    const q = (customPrompt ?? promptInput).trim();
    if (!q && intent === "playground") return;
    if (running) return;
    setRunning(true);
    const taskId = "task-" + Date.now();
    const shortTitle =
      intent === "checkin"
        ? "📅 灵龙实权代办：每日签到领积分"
        : intent === "claw"
          ? "🕹️ 灵龙实权代办：3D 抓娃娃机搏锦鲤"
          : intent === "redeem"
            ? "🎁 灵龙实权代办：5 积分秒兑周报模板"
            : intent === "scaffold"
              ? "🚀 灵龙实权代办：一键立项存为我的项目"
              : "⚡ " + (q.slice(0, 26) || "Codex 工程任务");
    const newTask: CodexTask = {
      id: taskId,
      title: shortTitle,
      tag: intent === "playground" ? "Codex Agent" : "Pi Action",
      model,
      status: "running",
      prompt: q || shortTitle,
      trace: [
        "⏳ [1/3] workspace.parse_intent — 正在解析工程需求与上下文...",
        `⏳ [2/3] llm.invoke(${model}) — 正在流式生成结构化代码与产物...`,
      ],
      summary: "正在调度 ANS Pi-Codex 引擎执行任务，请稍候...",
      artifactType: activeTask.artifactType,
      artifactFile: activeTask.artifactFile,
      artifactCode: activeTask.artifactCode,
    };
    setTasks(prev => [newTask, ...prev]);
    setActiveId(taskId);
    if (!customPrompt) setPromptInput("");
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] $ pi-codex exec --intent=${intent} --model=${model} "${(q || intent).slice(0, 48)}"`,
    ]);

    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pi_action", intent, prompt: q, model }),
      });
      const data = await res.json();
      const reply = (data?.replyZh || data?.replyEn || "执行完成。").trim();
      if (typeof data?.balancePoints === "number") {
        setLivePoints(data.balancePoints);
      }
      const codeMatch = reply.match(/```(?:html|python|tsx|ts|js|markdown|tex|sh)?\n([\s\S]*?)```/i);
      const extractedCode = codeMatch ? codeMatch[1].trim() : reply;
      const isHtml = /<!DOCTYPE html>|<html|<canvas|<style/i.test(extractedCode);

      setTasks(prev =>
        prev.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed",
                trace: [
                  "✓ [1/3] workspace.parse_intent — 任务意图与上下文校验通过",
                  `✓ [2/3] llm.invoke(${data?.toolUsed || model}) — 实权动作已完成`,
                  "✓ [3/3] canvas.sync_artifact — 产物已同步至右侧画布",
                ],
                summary: reply,
                links: Array.isArray(data?.links) ? data.links : [],
                artifactType: isHtml ? "html" : item.artifactType,
                artifactFile: isHtml ? "codex-live-app.html" : item.artifactFile,
                artifactCode: isHtml ? extractedCode : item.artifactCode,
              }
            : item,
        ),
      );
      if (isHtml) setCanvasTab("preview");
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ Completed (${data?.toolUsed || intent})`,
      ]);
    } catch {
      setTasks(prev =>
        prev.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed",
                summary: "⚠️ 网络请求波动，已为你保留当前右侧工程画布产物，可直接编辑或重试。",
              }
            : item,
        ),
      );
    } finally {
      setRunning(false);
    }
  }

  function updateActiveCode(newCode: string) {
    setTasks(prev => prev.map(item => (item.id === activeTask.id ? { ...item, artifactCode: newCode } : item)));
  }

  function downloadActiveHtml() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeTask.artifactFile || `${activeTask.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("已下载单文件应用源码！");
    } catch {
      toast.error("下载失败，请先复制源码");
    }
  }

  function openFullscreenPreview() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("无法打开新窗口预览");
    }
  }

  function switchToFloatingChat() {
    window.dispatchEvent(new CustomEvent("ans:open-companion-tab", { detail: { tab: "pi" } }));
    toast.success("已唤起右下角小恐龙【💬 聊天模式】伴随窗！");
  }

  return (
    <div data-testid="pi-codex-workbench" className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      {/* Top Codex IDE Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              💬 聊天模式 (悬浮窗)
            </button>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-slate-950 shadow-sm">
              🛠️ 工作模式 · Pi-Codex 工作台
            </span>
          </div>
          <select
            aria-label="选择 Codex 推理与编码模型"
            value={model}
            onChange={e => setModel(e.target.value as typeof model)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
          >
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V4.1-Flash · 极速工程主力 (0.5分)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 架构与学术精修 (1分)</option>
            <option value="gpt-6-astra">🌟 GPT-6-Astra · 全栈代码生成 (1分)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
            👤 {current} · <strong className="text-amber-300">{levelName}</strong>
            {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
            💰 算力: {livePoints} 积分
          </span>
          <a href="/workspace/benefits" className="rounded-xl bg-emerald-500 px-3 py-1 font-black text-slate-950 transition hover:bg-emerald-400">
            🎁 领 100~150 分
          </a>
          <a href="/workspace/credits" className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-slate-800">
            🔑 API Key / 充值
          </a>
        </div>
      </div>

      {/* 3-Column OpenAI Codex / Cursor Workbench Grid */}
      <div className="grid min-h-[660px] grid-cols-1 lg:grid-cols-[260px_1fr_1.15fr]">
        {/* Left Column: Task Queue & 1-Click Engineering Presets */}
        <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/50 p-3.5 lg:border-r lg:border-b-0">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">Codex 任务线程 ({tasks.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setCanvasTab("preview");
                    document.getElementById("codex-composer-input")?.focus();
                  }}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  + 新建任务
                </button>
              </div>
              <div className="space-y-1.5">
                {tasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full rounded-xl border p-2.5 text-left transition ${
                      t.id === activeTask.id
                        ? "border-emerald-500/60 bg-emerald-500/15 text-white shadow-sm"
                        : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-emerald-300">{t.tag}</span>
                      <span className="text-slate-400">{t.status === "running" ? "⚡ 执行中" : "🟢 已就绪"}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-1 text-xs font-bold">{t.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">⚡ 一键 Agent 实权与工程预设</span>
              <div className="mt-2 grid gap-1.5">
                <button
                  type="button"
                  onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
                  className="rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-2 text-left text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  🚀 灵龙代办：一键立项存为我的项目
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "checkin")}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  📅 灵龙代办：一键每日签到 (+5分)
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "claw")}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                >
                  🕹️ 灵龙代办：代抓娃娃抽 ¥100 锦鲤
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "redeem")}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                >
                  🎁 灵龙代办：5 积分秒兑周报生成器
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 text-[11px] text-slate-400">
            💡 <strong className="text-slate-200">双模式联动：</strong>日常逛站用右下角小恐龙【💬 聊天模式】，写代码/做网页/改论文切到【🛠️ 工作模式】享受完整 Codex 双栏画布。
          </div>
        </aside>

        {/* Center Column: Codex Execution Trace & Multi-Turn Composer */}
        <section className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-400">ACTIVE CODEX TASK · {activeTask.model}</span>
                <h2 className="mt-0.5 text-base font-extrabold text-white">{activeTask.title}</h2>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                {running ? "⚡ Agent 思考执行中..." : "✓ 执行完毕"}
              </span>
            </div>

            {/* User Prompt Bubble */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="text-[11px] font-bold text-slate-400">🧑 任务指令 (Task Prompt)</div>
              <p className="mt-1 text-xs leading-6 text-slate-100">{activeTask.prompt}</p>
            </div>

            {/* Step-by-Step Tool Execution Trace */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-indigo-300">
                <span>🛠️ Pi-Codex 工具链调用轨迹 (Execution Trace)</span>
                <span className="font-mono text-[10px]">sandbox: ans-codex-v2</span>
              </div>
              <ul className="space-y-1.5 font-mono text-xs text-slate-300">
                {activeTask.trace.map((step, idx) => (
                  <li key={idx} className="rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] text-emerald-300">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Agent Response Summary */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4">
              <div className="mb-1.5 text-xs font-extrabold text-emerald-300">🦖 Pi-Codex 工程输出说明</div>
              <div className="whitespace-pre-wrap text-xs leading-6 text-slate-200">{activeTask.summary}</div>
              {activeTask.links && activeTask.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeTask.links.map((lk, i) => (
                    <a
                      key={i}
                      href={lk.href}
                      className="rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200 hover:bg-indigo-500/30"
                    >
                      {lk.labelZh || lk.labelEn} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Codex Bottom Composer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeCodexTask();
            }}
            className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-inner"
          >
            <textarea
              id="codex-composer-input"
              rows={3}
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="向 Pi-Codex 下达工程任务：例如「写一个番茄钟网页」「生成农客松路演PPT大纲」「用Python分析土壤数据」..."
              className="w-full resize-none bg-transparent text-xs leading-5 text-white placeholder:text-slate-500 focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void executeCodexTask();
                }
              }}
            />
            {/* ANS Intent Bridge: Proactive Term Pills & 1-Click 4-Part Brief Upgrade */}
            {(() => {
              const cluster = detectIntentAndMatchTerms(promptInput || activeTask.prompt);
              return (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5" data-testid="codex-intent-bridge">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-300">{cluster.badge.zh}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const upgraded = upgradeToStructuredBrief(promptInput || activeTask.prompt, "zh");
                        setPromptInput(upgraded);
                        toast.success("已按 ANS 四段式规范 + ans-tone-guard 扩写工程指令！");
                      }}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      🧭 一键扩写为四段式专业 Brief
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">{cluster.clarifyingQuestion.zh}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">注入术语约束：</span>
                    {cluster.terms.map(term => (
                      <button
                        key={term.slug}
                        type="button"
                        title={term.hint.zh}
                        onClick={() => {
                          setPromptInput(prev => {
                            const base = (prev || activeTask.prompt).trim();
                            return base.includes(term.appendText.zh) ? base : `${base}\n- ${term.appendText.zh}`;
                          });
                          toast.success(`已注入「${term.label.zh}」工程约束`);
                        }}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-300"
                      >
                        + {term.label.zh}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
              <div className="flex flex-wrap gap-1">
                {[
                  ["🌐 互动网页", "请用单文件 HTML5 + Canvas 生成一个可交互的 AI 算力监控仪表盘网页"],
                  ["🌾 农客松方案", "帮我写一份中国农大农客松智慧农业参赛方案与核心 Python 代码"],
                  ["📄 论文精修", "帮我润色一段深度学习农业遥感方向的中英文论文摘要并给修改对比"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPromptInput(sample)}
                    className="rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={running}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
              >
                {running ? "⚡ 正在执行..." : "⚡ 运行任务 (Run in Codex)"}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Live Preview / Code Editor / Terminal / Quick Tools Canvas */}
        <section className="flex flex-col bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "preview", label: "👁️ 实时预览" },
                { id: "code", label: "💻 源码编辑" },
                { id: "terminal", label: "📟 终端日志" },
                { id: "tools", label: "🧰 全站工具箱" },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCanvasTab(t.id as typeof canvasTab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    canvasTab === t.id ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewKey(k => k + 1)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                🔄 重置
              </button>
              <button
                type="button"
                onClick={downloadActiveHtml}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                💾 下载 .html
              </button>
              <button
                type="button"
                onClick={openFullscreenPreview}
                className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
              >
                🖥️ 新窗口全屏 ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeTask.artifactCode);
                  toast.success("已复制右侧画布完整源码！");
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                📋 复制源码
              </button>
            </div>
          </div>

          <div className="flex-1 p-4">
            {canvasTab === "preview" && (
              activeTask.artifactType === "html" ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-400">
                    <span>🟢 Sandbox Live Preview · <code className="text-emerald-300">{activeTask.artifactFile}</code></span>
                    <button type="button" onClick={() => setCanvasTab("code")} className="text-emerald-400 hover:underline">
                      修改源码 →
                    </button>
                  </div>
                  <iframe
                    key={`${activeTask.id}-${previewKey}`}
                    title="Pi-Codex Live Artifact Preview"
                    srcDoc={activeTask.artifactCode}
                    sandbox="allow-scripts"
                    className="min-h-[520px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                    <span>📄 工程产物预览 · <code className="text-emerald-300">{activeTask.artifactFile}</code></span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{activeTask.artifactType.toUpperCase()}</span>
                  </div>
                  <pre className="max-h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
                    {activeTask.artifactCode}
                  </pre>
                </div>
              )
            )}

            {canvasTab === "code" && (
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>正在编辑: <strong className="text-emerald-300">{activeTask.artifactFile}</strong>（修改后切回「👁️ 实时预览」即刻生效）</span>
                  <span>{activeTask.artifactCode.split("\n").length} lines</span>
                </div>
                <textarea
                  value={activeTask.artifactCode}
                  onChange={e => updateActiveCode(e.target.value)}
                  className="min-h-[520px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {canvasTab === "terminal" && (
              <div className="min-h-[520px] rounded-2xl border border-slate-800 bg-black p-4 font-mono text-xs leading-6 text-emerald-400">
                <div className="mb-2 border-b border-slate-800 pb-2 text-slate-400">ANS Pi-Codex Cloud Terminal · bash (node v24 / python 3.12)</div>
                {terminalLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {canvasTab === "tools" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ["⚡ 模型广场与多模型演练", "/workspace/models", "DeepSeek / Qwen / 视觉模型零配置对比"],
                  ["🎨 3D 个人网站工作坊", "/market/resume-website", "3D 角色与双语个人作品集即开即改"],
                  ["🎬 Hypit 视频工作台", "/workflows/hypit", "AI 创意视频制作与脚本生成工作台"],
                  ["🎭 Toonflow 短剧工坊 ↗", "https://toonflow.cauai.fun", "小说转分镜与 AI 漫剧独立创作站"],
                  ["📚 VibeHub 知识库", "/vibe-hub", "全栈 AI 编程教程、提示词与实战路线"],
                  ["🎁 3D 抓娃娃与算力福利", "/workspace/benefits", "免费领 100~150 积分、抽 ¥100 锦鲤"],
                  ["🛒 ANS 工作流市场", "/market", "花积分一键购买并运行 AI 工作流"],
                  ["🤝 赛事组队与战队空间", "/teams", "创建/加入黑客松战队，共享比赛算力"],
                  ["📦 我的市场订单", "/market/orders", "查看已购工作流并一键默认验收"],
                  ["🔑 算力卡密充值与 API Key", "/workspace/credits", "兑换算力卡密、管理开发者密钥"],
                ].map(([title, href, desc]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 transition hover:border-emerald-500/50 hover:bg-slate-900"
                  >
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{desc}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}