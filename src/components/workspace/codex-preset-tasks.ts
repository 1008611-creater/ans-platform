export interface CodexTaskLink {
  labelZh: string;
  labelEn?: string;
  href: string;
}

export interface CodexTask {
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

export const INITIAL_CODEX_TASKS: CodexTask[] = [
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
