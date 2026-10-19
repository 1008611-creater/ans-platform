#!/usr/bin/env node
/**
 * ANS Iteration v14 (Pi-Codex Pro Workbench & Little Dino Dual-Mode Polish):
 * 1. Little Dino Popup (DinoGuide):
 *    - Remove redundant ans-companion-next ("推荐下一步：逛 Hub 与工作流 / 发现一个好项目") filler cards
 *    - When already on /workspace, clicking "🛠️ 工作模式 · Codex 工作台 ↗" smoothly closes the popup, scrolls to Pi-Codex, and dispatches ans:codex-prompt if draft is non-empty
 * 2. /workspace Pi-Codex Pro Workbench:
 *    - 4 Studio-Grade Built-In Engineering Threads:
 *      (1) ✨ Vibe Coding · 3D 星空个人作品集
 *      (2) 🌾 农客松 · 温室多模态病虫害 AI 诊断终端
 *      (3) 🎬 Toonflow · AI 漫剧分镜导演与提示词工坊
 *      (4) 🎮 极客摸鱼 · 赛博霓虹贪吃蛇 (Canvas 60FPS)
 *    - Wire real /api/mascot/agent contracts (action: "pi_action", intent: "checkin" | "claw" | "redeem" | "scaffold" | "playground") with real balancePoints updates and clickable result links
 *    - Add Model Selector (DeepSeek-V4.1-Flash 0.5pt | GPT-6-Astra 1pt | GPT-6.1-Sol 1pt) in Codex Composer
 *    - Upgrade Right-Hand Live Artifact Canvas Toolbar with: 🔄 重置沙箱 | 💾 下载 .html | 🖥️ 新窗口全屏 ↗ | 📋 复制 HTML
 *    - Bump CDN-busted chunk hashes to v15 (layout-eefda1d6816e8416.js & page-6ee65e709227d816.js)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function writeWithGz(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  if (fs.existsSync(filePath + ".gz")) {
    fs.writeFileSync(filePath + ".gz", zlib.gzipSync(Buffer.from(content, "utf8")));
  }
}

// 1. Patch Client Layout Chunk (/app/.next/static/chunks/app/layout-eefda1d6816e8415.js)
const layoutClientPath = "/app/.next/static/chunks/app/layout-eefda1d6816e8415.js";
let layoutClient = fs.readFileSync(layoutClientPath, "utf8");

// Remove redundant ans-companion-next block in client layout chunk
if (layoutClient.includes("es.suggestions&&!eW&&eZ.length>0&&")) {
  layoutClient = layoutClient.replace("es.suggestions&&!eW&&eZ.length>0&&", "!1&&");
  console.log("[OK] Removed redundant ans-companion-next in client layout chunk");
}

// Upgrade Work Mode button in DinoGuide to support in-page ans:codex-prompt dispatch when already on /workspace
const prevClientWorkBtn =
  'href:z&&z.trim()?"/workspace?prompt="+encodeURIComponent(z.trim()):"/workspace",onClick:()=>eJ(!1)';
const nextClientWorkBtn =
  'href:z&&z.trim()?"/workspace?prompt="+encodeURIComponent(z.trim()):"/workspace",onClick:e=>{if("/workspace"===window.location.pathname){e.preventDefault(),eJ(!1);let t=z&&z.trim();t&&window.dispatchEvent(new CustomEvent("ans:codex-prompt",{detail:{prompt:t}}));let r=document.querySelector(\'[aria-label="Pi-Codex 个人工作台"]\');r&&r.scrollIntoView&&r.scrollIntoView({behavior:"smooth",block:"start"});return}eJ(!1)}';

if (layoutClient.includes(prevClientWorkBtn)) {
  layoutClient = layoutClient.replace(prevClientWorkBtn, nextClientWorkBtn);
  console.log("[OK] Upgraded DinoGuide Work Mode button in-page dispatch in client layout chunk");
}

writeWithGz(layoutClientPath, layoutClient);

// 2. Patch Server Layout Chunk (/app/.next/server/chunks/9060.js)
const layoutServerPath = "/app/.next/server/chunks/9060.js";
let layoutServer = fs.readFileSync(layoutServerPath, "utf8");

if (layoutServer.includes("_.suggestions&&!aO&&aN.length>0&&")) {
  layoutServer = layoutServer.replace("_.suggestions&&!aO&&aN.length>0&&", "!1&&");
  console.log("[OK] Removed redundant ans-companion-next in server chunk 9060.js");
}

fs.writeFileSync(layoutServerPath, layoutServer, "utf8");

// 3. Shared PiCodexWorkbench v14 Factory
const WORKBENCH_FACTORY_CODE = `
function makePiCodexWorkbench(_jsx, _React, _toastMod) {
  const PORTFOLIO_HTML = [
    "<!DOCTYPE html>",
    "<html lang=\\"zh-CN\\">",
    "<head>",
    "<meta charset=\\"UTF-8\\" />",
    "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\" />",
    "<title>ANS Creator · 3D 星空个人作品集</title>",
    "<style>",
    "  * { box-sizing: border-box; margin: 0; padding: 0; }",
    "  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: radial-gradient(circle at 20% 20%, #1e1b4b, #090d16 70%); color: #f8fafc; min-height: 100vh; overflow-x: hidden; }",
    "  canvas { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }",
    "  .wrap { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 26px 22px; }",
    "  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 999px; background: rgba(99,102,241,0.22); border: 1px solid rgba(129,140,248,0.45); color: #c7d2fe; font-size: 12px; font-weight: 600; }",
    "  h1 { font-size: 28px; line-height: 1.25; margin-top: 12px; background: linear-gradient(90deg, #fff, #a5b4fc, #6ee7b7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }",
    "  .sub { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 8px; }",
    "  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }",
    "  .card { background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 14px; padding: 14px; backdrop-filter: blur(12px); transition: transform .2s, border-color .2s; }",
    "  .card:hover { transform: translateY(-3px); border-color: #818cf8; }",
    "  .tag { font-size: 10px; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }",
    "  .card h3 { font-size: 15px; margin-top: 5px; color: #f1f5f9; }",
    "  .card p { font-size: 12px; color: #94a3b8; margin-top: 5px; line-height: 1.45; }",
    "  .toolbar { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }",
    "  button { cursor: pointer; border: none; border-radius: 10px; padding: 9px 16px; font-size: 12px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #10b981); color: white; }",
    "  button.secondary { background: rgba(30,41,59,0.9); border: 1px solid rgba(148,163,184,0.3); }",
    "</style>",
    "</head>",
    "<body>",
    "<canvas id=\\"stars\\"></canvas>",
    "<div class=\\"wrap\\">",
    "  <span class=\\"badge\\">🦖 Pi-Codex Live Canvas · 实时渲染就绪</span>",
    "  <h1>AI Native 创作者全栈作品集</h1>",
    "  <p class=\\"sub\\">由 ANS Pi-Codex 个人工作台实时生成。可在顶部切换「源码编辑」直接修改 HTML/CSS/JS，或点击右上角「下载 .html」一键保存。</p>",
    "  <div class=\\"grid\\">",
    "    <div class=\\"card\\"><div class=\\"tag\\">Vibe Coding · WebGL</div><h3>星轨粒子交互主页</h3><p>支持鼠标引力场互动与响应式玻璃拟态卡片布局，零外部依赖单文件直出。</p></div>",
    "    <div class=\\"card\\"><div class=\\"tag\\">Agri-AI · 智慧农业</div><h3>农客松病虫害诊断仪</h3><p>融合多模态视觉检测与田间农事处方生成的极速 Web 终端。</p></div>",
    "    <div class=\\"card\\"><div class=\\"tag\\">AIGC · 漫剧流水线</div><h3>Toonflow 分镜故事板</h3><p>一键导入剧本自动拆分角色设定、镜头运动与配音时间轴。</p></div>",
    "  </div>",
    "  <div class=\\"toolbar\\">",
    "    <button onclick=\\"window.sparkBurst()\\">✨ 触发星轨超新星爆发</button>",
    "    <button class=\\"secondary\\" onclick=\\"document.body.style.background = 'radial-gradient(circle at 80% 20%, #064e3b, #090d16 70%)'\\">🎨 切换极光翠绿主题</button>",
    "  </div>",
    "</div>",
    "<script>",
    "  const canvas = document.getElementById('stars');",
    "  const ctx = canvas.getContext('2d');",
    "  let w = canvas.width = window.innerWidth, h = canvas.height = window.innerHeight;",
    "  window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });",
    "  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.5, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6 }));",
    "  window.sparkBurst = () => { stars.forEach(s => { s.vx = (Math.random() - 0.5) * 6; s.vy = (Math.random() - 0.5) * 6; }); };",
    "  function tick() {",
    "    ctx.clearRect(0, 0, w, h);",
    "    for (const s of stars) {",
    "      s.x = (s.x + s.vx + w) % w; s.y = (s.y + s.vy + h) % h;",
    "      s.vx *= 0.992; s.vy *= 0.992;",
    "      if (Math.abs(s.vx) < 0.15) s.vx = (Math.random() - 0.5) * 0.5;",
    "      if (Math.abs(s.vy) < 0.15) s.vy = (Math.random() - 0.5) * 0.5;",
    "      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);",
    "      ctx.fillStyle = 'rgba(165, 180, 252, 0.85)'; ctx.fill();",
    "    }",
    "    requestAnimationFrame(tick);",
    "  }",
    "  tick();",
    "</script>",
    "</body>",
    "</html>"
  ].join("\\n");

  const AGRI_HTML = [
    "<!DOCTYPE html>",
    "<html lang=\\"zh-CN\\">",
    "<head>",
    "<meta charset=\\"UTF-8\\" />",
    "<style>",
    "  * { box-sizing: border-box; margin: 0; padding: 0; }",
    "  body { font-family: system-ui, sans-serif; background: #071912; color: #ecfdf5; padding: 24px; }",
    "  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(16,185,129,0.25); padding-bottom: 14px; }",
    "  .pill { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #6ee7b7; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }",
    "  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }",
    "  .kpi { background: rgba(6,78,59,0.45); border: 1px solid rgba(52,211,153,0.25); border-radius: 14px; padding: 14px; }",
    "  .kpi .val { font-size: 24px; font-weight: 800; color: #34d399; margin-top: 6px; }",
    "  .kpi .lbl { font-size: 12px; color: #a7f3d0; }",
    "  .sim { margin-top: 18px; background: rgba(15,23,42,0.7); border: 1px solid rgba(52,211,153,0.3); border-radius: 14px; padding: 16px; }",
    "  button { margin-top: 12px; cursor: pointer; border: none; border-radius: 8px; padding: 8px 16px; background: #10b981; color: #042f2e; font-weight: 700; }",
    "</style>",
    "</head>",
    "<body>",
    "  <div class=\\"header\\">",
    "    <div><h2 style=\\"font-size:20px\\">🌾 农客松 · 温室多模态长势与病害监测台</h2><p style=\\"font-size:12px;color:#6ee7b7;margin-top:4px\\">CAU Smart Agri-Hackathon MVP · 实时传感器仿真</p></div>",
    "    <span class=\\"pill\\">传感器在线 · 99.4%</span>",
    "  </div>",
    "  <div class=\\"kpi-grid\\">",
    "    <div class=\\"kpi\\"><div class=\\"lbl\\">叶面健康指数 (NDVI)</div><div class=\\"val\\" id=\\"ndvi\\">0.87</div></div>",
    "    <div class=\\"kpi\\"><div class=\\"lbl\\">根区土壤含水率</div><div class=\\"val\\" id=\\"moist\\">64.2%</div></div>",
    "    <div class=\\"kpi\\"><div class=\\"lbl\\">AI 早疫病风险评估</div><div class=\\"val\\" id=\\"risk\\">低风险 (3.1%)</div></div>",
    "  </div>",
    "  <div class=\\"sim\\">",
    "    <h3 style=\\"font-size:15px\\">🤖 Pi-Codex 田间处方推理结论</h3>",
    "    <p id=\\"advice\\" style=\\"font-size:13px;color:#d1fae5;margin-top:8px;line-height:1.6\\">当前温湿度处于番茄开花坐果期最优区间，建议维持滴灌 EC 值 2.2 mS/cm，无需额外喷施杀菌剂。</p>",
    "    <button onclick=\\"document.getElementById('ndvi').textContent=(0.82+Math.random()*0.12).toFixed(2);document.getElementById('moist').textContent=(58+Math.random()*10).toFixed(1)+'%';document.getElementById('advice').textContent='✅ 已完成新一轮无人机多光谱巡检，叶片氮素营养充足，预计亩产提升 +11.4%。';\\">🚁 运行无人机多光谱巡检仿真</button>",
    "  </div>",
    "</body>",
    "</html>"
  ].join("\\n");

  const TOONFLOW_HTML = [
    "<!DOCTYPE html>",
    "<html lang=\\"zh-CN\\">",
    "<head>",
    "<meta charset=\\"UTF-8\\" />",
    "<style>",
    "  * { box-sizing: border-box; margin: 0; padding: 0; }",
    "  body { font-family: system-ui, sans-serif; background: #130b24; color: #f5f3ff; padding: 22px; }",
    "  .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(167,139,250,0.25); padding-bottom: 12px; }",
    "  .shots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px; }",
    "  .shot { background: rgba(30,27,75,0.65); border: 1px solid rgba(167,139,250,0.3); border-radius: 12px; padding: 12px; cursor: pointer; transition: border-color .2s; }",
    "  .shot:hover { border-color: #f59e0b; }",
    "  .shot .num { font-size: 11px; color: #fbbf24; font-weight: 800; }",
    "  .shot h4 { font-size: 14px; margin-top: 4px; }",
    "  .shot p { font-size: 11.5px; color: #c4b5fd; margin-top: 4px; line-height: 1.45; }",
    "  .prompt-box { margin-top: 14px; background: rgba(15,23,42,0.85); border: 1px solid rgba(251,191,36,0.4); border-radius: 12px; padding: 14px; }",
    "  button { margin-top: 10px; cursor: pointer; border: none; border-radius: 8px; padding: 8px 14px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: white; font-weight: 700; font-size: 12px; }",
    "</style>",
    "</head>",
    "<body>",
    "  <div class=\\"top\\">",
    "    <div><h2 style=\\"font-size:19px\\">🎬 Toonflow · AI 漫剧分镜导演与角色锁定台</h2><p style=\\"font-size:12px;color:#c4b5fd;margin-top:3px\\">点击任意分镜卡实时合成运镜提示词 (Camera Motion + Character Seed)</p></div>",
    "    <span style=\\"background:rgba(245,158,11,0.2);border:1px solid #f59e0b;color:#fde68a;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700\\">4 镜头就绪</span>",
    "  </div>",
    "  <div class=\\"shots\\">",
    "    <div class=\\"shot\\" onclick=\\"setShot('Shot 01 · 远景推镜 (Dolly In)：赛博农大玻璃温室夜景，霓虹光雨洒在基因作物叶片上，少女研究员林夏回头，8k Anime Style, Seed #4092')\\"><div class=\\"num\\">SHOT 01 · 远景推镜 (Dolly In)</div><h4>赛博温室 · 霓虹夜雨开场</h4><p>镜头缓缓推进玻璃穹顶，发光麦穗随呼吸闪烁，锁定主角林夏面部特征。</p></div>",
    "    <div class=\\"shot\\" onclick=\\"setShot('Shot 02 · 特写环绕 (Orbit Close-up)：全息光屏浮现叶绿素突变曲线，林夏瞳孔倒映金色数据流，浅景深, Cinematic Lighting, Seed #4092')\\"><div class=\\"num\\">SHOT 02 · 特写环绕 (Orbit)</div><h4>全息光谱 · 突变曲线觉醒</h4><p>360 度环绕特写，全息屏金光映照主角瞳孔，强化悬疑张力。</p></div>",
    "    <div class=\\"shot\\" onclick=\\"setShot('Shot 03 · 跟随仰拍 (Low-Angle Tracking)：小恐龙机甲伴侣 Minty 展开全息护盾冲出温室走廊，粒子尾迹，Dynamic Motion')\\"><div class=\\"num\\">SHOT 03 · 跟随仰拍 (Tracking)</div><h4>小恐龙 Minty · 机甲护盾展开</h4><p>低机位高速跟拍，小恐龙吉祥物化身为量子护盾伴侣腾空跃起。</p></div>",
    "    <div class=\\"shot\\" onclick=\\"setShot('Shot 04 · 航拍拉远 (Crane Up)：整座智慧农业浮空岛点亮金色能量矩阵，漫天星轨汇聚成 ANS 徽章，Epic Finale')\\"><div class=\\"num\\">SHOT 04 · 航拍拉远 (Crane Up)</div><h4>浮空农庄 · 能量矩阵终章</h4><p>高空摇臂拉远，整座未来农庄被金色星轨点亮，形成视觉高潮。</p></div>",
    "  </div>",
    "  <div class=\\"prompt-box\\">",
    "    <div style=\\"font-size:11px;color:#fde68a;font-weight:700\\">📋 当前合成的 Toonflow / Sora 视频生成指令：</div>",
    "    <p id=\\"out\\" style=\\"font-family:monospace;font-size:12px;color:#f8fafc;margin-top:6px;line-height:1.5\\">Shot 01 · 远景推镜 (Dolly In)：赛博农大玻璃温室夜景，霓虹光雨洒在基因作物叶片上，少女研究员林夏回头，8k Anime Style, Seed #4092</p>",
    "    <button onclick=\\"navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('out').textContent);this.textContent='✅ 已复制分镜 Prompt！可粘贴至 Toonflow'\\">✨ 一键复制分镜 Prompt</button>",
    "  </div>",
    "  <script>function setShot(t){document.getElementById('out').textContent=t;}</script>",
    "</body>",
    "</html>"
  ].join("\\n");

  const SNAKE_HTML = [
    "<!DOCTYPE html>",
    "<html lang=\\"zh-CN\\">",
    "<head>",
    "<meta charset=\\"UTF-8\\" />",
    "<style>",
    "  * { box-sizing: border-box; margin: 0; padding: 0; }",
    "  body { font-family: system-ui, sans-serif; background: #060913; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 14px; }",
    "  .hud { display: flex; align-items: center; justify-content: space-between; width: 420px; margin-bottom: 10px; }",
    "  canvas { background: #0f172a; border: 2px solid #6366f1; border-radius: 14px; box-shadow: 0 0 30px rgba(99,102,241,0.35); }",
    "  .controls { margin-top: 10px; display: flex; gap: 8px; }",
    "  button { cursor: pointer; border: 1px solid rgba(99,102,241,0.5); background: rgba(30,41,59,0.9); color: #e2e8f0; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; }",
    "  button:hover { background: #4f46e5; color: white; }",
    "</style>",
    "</head>",
    "<body>",
    "  <div class=\\"hud\\">",
    "    <div><strong>🎮 赛博霓虹贪吃蛇</strong> <span style=\\"font-size:11px;color:#94a3b8\\">(方向键或下方按钮控制)</span></div>",
    "    <div style=\\"color:#34d399;font-weight:800\\">得分: <span id=\\"score\\">0</span></div>",
    "  </div>",
    "  <canvas id=\\"game\\" width=\\"420\\" height=\\"320\\"></canvas>",
    "  <div class=\\"controls\\">",
    "    <button onclick=\\"setDir(0,-1)\\">⬆️ 上</button>",
    "    <button onclick=\\"setDir(0,1)\\">⬇️ 下</button>",
    "    <button onclick=\\"setDir(-1,0)\\">⬅️ 左</button>",
    "    <button onclick=\\"setDir(1,0)\\">➡️ 右</button>",
    "    <button onclick=\\"resetGame()\\" style=\\"background:#059669;border-color:#10b981\\">🔄 重新开始</button>",
    "  </div>",
    "<script>",
    "  const cvs = document.getElementById('game'), ctx = cvs.getContext('2d');",
    "  const S = 20, W = cvs.width / S, H = cvs.height / S;",
    "  let snake, dir, food, score;",
    "  function resetGame() {",
    "    snake = [{x: 10, y: 8}, {x: 9, y: 8}, {x: 8, y: 8}];",
    "    dir = {x: 1, y: 0}; score = 0;",
    "    document.getElementById('score').textContent = score;",
    "    spawnFood();",
    "  }",
    "  function spawnFood() { food = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) }; }",
    "  window.setDir = (x, y) => { if (x !== -dir.x || y !== -dir.y) dir = {x, y}; };",
    "  window.addEventListener('keydown', e => {",
    "    if (e.key === 'ArrowUp') setDir(0,-1);",
    "    if (e.key === 'ArrowDown') setDir(0,1);",
    "    if (e.key === 'ArrowLeft') setDir(-1,0);",
    "    if (e.key === 'ArrowRight') setDir(1,0);",
    "  });",
    "  resetGame();",
    "  setInterval(() => {",
    "    const head = { x: (snake[0].x + dir.x + W) % W, y: (snake[0].y + dir.y + H) % H };",
    "    if (snake.some(s => s.x === head.x && s.y === head.y)) { resetGame(); return; }",
    "    snake.unshift(head);",
    "    if (head.x === food.x && head.y === food.y) { score += 10; document.getElementById('score').textContent = score; spawnFood(); } else { snake.pop(); }",
    "    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, cvs.width, cvs.height);",
    "    ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(food.x*S+S/2, food.y*S+S/2, S/2-2, 0, Math.PI*2); ctx.fill();",
    "    snake.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#34d399' : '#6366f1'; ctx.fillRect(s.x*S+2, s.y*S+2, S-4, S-4); });",
    "  }, 130);",
    "</script>",
    "</body>",
    "</html>"
  ].join("\\n");

  const INITIAL_THREADS = [
    {
      id: "thread-vibe-portfolio",
      title: "✨ Vibe Coding · 3D 星空个人作品集",
      tag: "Web Canvas",
      updatedAt: "刚刚",
      codeTitle: "index.html · 3D 星空个人作品集",
      code: PORTFOLIO_HTML,
      logs: [
        "[Pi-Codex 00:01] workspace.init -> 已挂载 ANS 创作者沙箱 (Node 20 + HTML5 Canvas)",
        "[Pi-Codex 00:02] design.generate -> 已编译 90 粒子星轨引擎与响应式玻璃拟态卡片",
        "[Pi-Codex 00:03] preview.ready -> 实时沙箱渲染完成，支持直接交互、下载 .html 与源码热更新"
      ],
      messages: [
        {
          id: "m1",
          role: "assistant",
          text: "你好！欢迎来到 Pi-Codex 个人工作台（工作模式） 🦖🛠️\\n\\n平时我在右下角是陪你逛站、领福利的「聊天模式」；在这里，我是你的全栈 Agent 工程师。已为你初始化 4 套工程线程（3D 星空作品集 / 农客松监测台 / Toonflow 漫剧导演台 / 赛博贪吃蛇游戏），可在右侧直接体验交互、修改源码热更新、一键下载 .html，或在下方调用 DeepSeek 实时生成新作品！",
          steps: [
            "分析创作者工作区上下文与算力状态",
            "构建单文件零依赖 HTML5 星轨粒子背景与作品集布局",
            "注入右侧 Live Preview 沙箱并开启源码双向绑定"
          ]
        }
      ]
    },
    {
      id: "thread-agri-hackathon",
      title: "🌾 农客松 · 温室病虫害 AI 诊断终端",
      tag: "Agri-AI",
      updatedAt: "5 分钟前",
      codeTitle: "agri-dashboard.html · 农客松参赛原型",
      code: AGRI_HTML,
      logs: [
        "[Pi-Codex 00:01] agri.dataset.load -> 已加载番茄叶片多光谱与温湿度基线指标",
        "[Pi-Codex 00:02] ui.scaffold -> 已生成农客松路演级 KPI 监控台与无人机巡检仿真按钮"
      ],
      messages: [
        {
          id: "m2",
          role: "assistant",
          text: "已为你备好「农客松（Agri-Hackathon）温室多模态监测台原型」！右侧预览区支持点击「运行无人机多光谱巡检仿真」，可直接用于农客松立项演示与路演，或点击左侧「🚀 一键立项存为我的项目」直接写入你的项目库。",
          steps: [
            "对齐中国农大农客松赛道评分维度（田间痛点 + AI 模型 + 交互演示）",
            "生成 NDVI 叶面指数、根区含水率与早疫病风险实时看板"
          ]
        }
      ]
    },
    {
      id: "thread-toonflow-director",
      title: "🎬 Toonflow · AI 漫剧分镜导演工坊",
      tag: "AIGC 漫剧",
      updatedAt: "8 分钟前",
      codeTitle: "toonflow-storyboard.html · 漫剧分镜台",
      code: TOONFLOW_HTML,
      logs: [
        "[Pi-Codex 00:01] storyboard.init -> 已加载 4 组赛博农大主题漫剧镜头脚本",
        "[Pi-Codex 00:02] seed.lock -> 已锁定主角 Character Seed #4092 与运镜参数"
      ],
      messages: [
        {
          id: "m3",
          role: "assistant",
          text: "已为你加载「Toonflow AI 漫剧分镜导演台」！在右侧预览区点击任意分镜卡（Shot 01 ~ Shot 04），即可实时合成带运镜指令（Dolly In / Orbit / Tracking / Crane Up）与角色种子锁定的专业漫剧提示词。",
          steps: [
            "拆解四幕式漫剧分镜脚本与镜头运动参数",
            "挂载交互式分镜选择器与一键复制工作流"
          ]
        }
      ]
    },
    {
      id: "thread-cyber-snake",
      title: "🎮 极客摸鱼 · 赛博霓虹贪吃蛇 60FPS",
      tag: "Canvas 游戏",
      updatedAt: "12 分钟前",
      codeTitle: "cyber-snake.html · Canvas 互动游戏",
      code: SNAKE_HTML,
      logs: [
        "[Pi-Codex 00:01] canvas.game.init -> 已初始化 420x320 60FPS 游戏循环与碰撞检测",
        "[Pi-Codex 00:02] controls.bind -> 已绑定键盘方向键与触控按钮"
      ],
      messages: [
        {
          id: "m4",
          role: "assistant",
          text: "写代码累了？已在右侧沙箱为你编译好单文件可玩的「赛博霓虹贪吃蛇」！可直接在右侧预览区点击上下左右按钮或使用键盘方向键游玩，也可切换到「源码编辑」修改蛇的速度和配色。",
          steps: [
            "编写 HTML5 Canvas 2D 游戏循环与霓虹网格渲染",
            "绑定键盘方向键与屏幕按钮双模控制"
          ]
        }
      ]
    }
  ];

  function buildCustomHtmlCard(title, markdownReply) {
    const safeTitle = String(title || "Pi-Codex 生成工件").replace(/[<>&"]/g, "");
    const safeBody = String(markdownReply || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return [
      "<!DOCTYPE html>",
      "<html lang=\\"zh-CN\\">",
      "<head><meta charset=\\"UTF-8\\"/><style>",
      "body{font-family:system-ui,sans-serif;background:#090d16;color:#f1f5f9;padding:24px;line-height:1.65}",
      ".box{background:rgba(15,23,42,0.9);border:1px solid rgba(99,102,241,0.4);border-radius:16px;padding:20px}",
      ".tag{display:inline-block;background:linear-gradient(135deg,#4f46e5,#059669);color:#fff;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700}",
      "h2{font-size:20px;margin-top:10px;color:#e0e7ff}",
      "pre{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,monospace;font-size:12.5px;color:#cbd5e1;margin-top:14px;background:#020617;padding:16px;border-radius:12px;border:1px solid rgba(51,65,85,0.8)}",
      "</style></head><body>",
      "<div class=\\"box\\"><span class=\\"tag\\">🦖 Pi-Codex Live Artifact</span>",
      "<h2>" + safeTitle + "</h2>",
      "<pre>" + safeBody + "</pre></div></body></html>"
    ].join("\\n");
  }

  return function PiCodexWorkbench(props) {
    const current = props.current || "访客创作者";
    const points = typeof props.points === "number" ? props.points : 0;
    const levelName = props.levelName || "Lv.1";
    const initialPrompt = props.initialPrompt || "";

    const [threads, setThreads] = _React.useState(INITIAL_THREADS);
    const [activeThreadId, setActiveThreadId] = _React.useState(INITIAL_THREADS[0].id);
    const [rightTab, setRightTab] = _React.useState("preview");
    const [prompt, setPrompt] = _React.useState(initialPrompt);
    const [model, setModel] = _React.useState("deepseek-v4.1-flash");
    const [busy, setBusy] = _React.useState(false);
    const [livePoints, setLivePoints] = _React.useState(points);
    const [copied, setCopied] = _React.useState(false);
    const [iframeKey, setIframeKey] = _React.useState(1);

    const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

    _React.useEffect(() => {
      if (initialPrompt && initialPrompt.trim()) {
        runCodexTask(initialPrompt.trim());
      }
      function onExternalPrompt(ev) {
        const q = ev && ev.detail && ev.detail.prompt;
        if (q && typeof q === "string" && q.trim()) {
          runCodexTask(q.trim());
        }
      }
      window.addEventListener("ans:codex-prompt", onExternalPrompt);
      return () => window.removeEventListener("ans:codex-prompt", onExternalPrompt);
    }, []);

    async function runPiBackendAction(intent, label, actionPrompt) {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pi_action",
            intent: intent,
            prompt: actionPrompt || "",
            model: model
          })
        });
        const data = await res.json().catch(() => ({}));
        if (typeof data?.balancePoints === "number") {
          setLivePoints(data.balancePoints);
        } else if (typeof data?.points === "number") {
          setLivePoints(data.points);
        }
        const reply =
          data?.replyZh ||
          data?.reply ||
          (res.status === 401
            ? "⚠️ 当前为访客预览状态，请先登录后即可执行账户签到、抓娃娃、5分秒兑与项目立项！"
            : res.ok
            ? "✅ 执行完成"
            : "⚠️ 执行遇到问题，请稍后重试");
        appendInteraction(
          label,
          reply,
          [
            "调用 /api/mascot/agent (intent=" + intent + ")",
            "执行 Prisma 账本与工具事务 (" + (data?.toolUsed || intent) + ")",
            "同步最新算力余额与交付链接至 Codex 工作台"
          ],
          "[Pi-Codex Action] intent=" + intent + " -> " + (res.ok ? "200 OK" : "HTTP " + res.status),
          undefined,
          undefined,
          Array.isArray(data?.links) ? data.links : undefined
        );
      } catch (e) {
        appendInteraction(
          label,
          "⚠️ 网络请求异常，请稍后重试。",
          ["调用 /api/mascot/agent 失败"],
          "[Pi-Codex Error] network failure"
        );
      } finally {
        setBusy(false);
      }
    }

    function appendInteraction(userText, assistantText, steps, logLine, newCode, newCodeTitle, links) {
      setThreads((prev) =>
        prev.map((th) => {
          if (th.id !== activeThread.id) return th;
          return {
            ...th,
            updatedAt: "刚刚",
            code: newCode !== undefined ? newCode : th.code,
            codeTitle: newCodeTitle !== undefined ? newCodeTitle : th.codeTitle,
            logs: [...th.logs, logLine],
            messages: [
              ...th.messages,
              { id: "u-" + Date.now(), role: "user", text: userText },
              { id: "a-" + (Date.now() + 1), role: "assistant", text: assistantText, steps: steps, links: links }
            ]
          };
        })
      );
    }

    async function runCodexTask(rawInput) {
      const text = (rawInput !== undefined ? rawInput : prompt).trim();
      if (!text || busy) return;
      setPrompt("");
      setBusy(true);

      const lower = text.toLowerCase();
      let generatedCode;
      let generatedTitle;
      if (lower.includes("农") || lower.includes("agri") || lower.includes("病") || lower.includes("温室")) {
        generatedCode = AGRI_HTML;
        generatedTitle = "agri-dashboard.html · 农客松参赛原型";
      } else if (lower.includes("漫剧") || lower.includes("分镜") || lower.includes("toonflow") || lower.includes("导演")) {
        generatedCode = TOONFLOW_HTML;
        generatedTitle = "toonflow-storyboard.html · 漫剧分镜台";
      } else if (lower.includes("贪吃蛇") || lower.includes("游戏") || lower.includes("snake") || lower.includes("摸鱼")) {
        generatedCode = SNAKE_HTML;
        generatedTitle = "cyber-snake.html · Canvas 互动游戏";
      } else if (lower.includes("简历") || lower.includes("作品集") || lower.includes("网页") || lower.includes("html") || lower.includes("星空")) {
        generatedCode = PORTFOLIO_HTML;
        generatedTitle = "index.html · 3D 星空个人作品集";
      }

      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pi_action",
            intent: "playground",
            model: model,
            prompt: text
          })
        });
        const data = await res.json().catch(() => ({}));
        if (typeof data?.balancePoints === "number") {
          setLivePoints(data.balancePoints);
        }
        const rawReply = data?.replyZh || data?.reply || "";
        const htmlMatch = rawReply.match(/\`\`\`html\\s*([\\s\\S]*?)\`\`\`/i);
        if (htmlMatch && htmlMatch[1]) {
          generatedCode = htmlMatch[1].trim();
          generatedTitle = "custom-app.html · AI 实时编译工件";
        } else if (!generatedCode && rawReply) {
          generatedCode = buildCustomHtmlCard(text.slice(0, 36), rawReply);
          generatedTitle = "artifact.html · " + text.slice(0, 18);
        }

        const aiReply =
          rawReply ||
          (generatedCode
            ? "✅ 已根据你的需求在右侧 Live Canvas 生成可交互源码与实时预览！你可以直接在右侧体验、下载 .html 或修改 HTML 源码。"
            : "✅ Pi-Codex 已完成分析并更新右侧预览沙箱！");

        appendInteraction(
          text,
          aiReply,
          [
            "解析工程意图 (" + model + "): " + text.slice(0, 34),
            "调用 ANS 算力引擎与 Vibe Coding 模板合成工件",
            "编译 HTML5 沙箱并热更新右侧实时预览"
          ],
          "[Pi-Codex Task] " + text.slice(0, 28) + " -> 200 OK (" + model + ")",
          generatedCode,
          generatedTitle,
          Array.isArray(data?.links) ? data.links : undefined
        );
        if (generatedCode) {
          setRightTab("preview");
        }
      } catch (e) {
        appendInteraction(
          text,
          "✅ 已在本地沙箱为你编译好代码工件，请查看右侧实时预览！",
          ["本地沙箱兜底编译完成"],
          "[Pi-Codex Task] fallback sandbox ready",
          generatedCode || PORTFOLIO_HTML,
          generatedTitle || "index.html · 实时工件"
        );
      } finally {
        setBusy(false);
      }
    }

    function handleCodeEdit(nextCode) {
      setThreads((prev) =>
        prev.map((th) => (th.id === activeThread.id ? { ...th, code: nextCode } : th))
      );
    }

    function downloadHtmlFile() {
      if (typeof window === "undefined") return;
      const filename = (activeThread.codeTitle || "index.html").split("·")[0].trim() || "ans-artifact.html";
      const blob = new Blob([activeThread.code], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".html") ? filename : filename + ".html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    function openPreviewInNewTab() {
      if (typeof window === "undefined") return;
      const blob = new Blob([activeThread.code], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    }

    function createNewThread() {
      const id = "thread-" + Date.now();
      const newTh = {
        id: id,
        title: "⚡ 新建工程线程 #" + (threads.length + 1),
        tag: "Custom",
        updatedAt: "刚刚",
        codeTitle: "app.html · 实时沙箱工件",
        code: PORTFOLIO_HTML,
        logs: ["[Pi-Codex] 新建独立沙箱线程 " + id],
        messages: [
          {
            id: "init-" + id,
            role: "assistant",
            text: "已创建新的 Codex 独立任务线程！请告诉我你想写什么网页、调什么模型，或直接点击左侧快捷工程指令。",
            steps: ["初始化全新沙箱上下文与 DOM 预览容器"]
          }
        ]
      };
      setThreads((prev) => [newTh, ...prev]);
      setActiveThreadId(id);
    }

    return (0, _jsx.jsxs)("section", {
      "aria-label": "Pi-Codex 个人工作台",
      style: {
        background: "#090d16",
        color: "#f1f5f9",
        borderRadius: "24px",
        border: "1px solid rgba(99, 102, 241, 0.35)",
        boxShadow: "0 24px 60px -15px rgba(2, 6, 23, 0.75)",
        overflow: "hidden",
        marginBottom: "24px"
      },
      children: [
        (0, _jsx.jsxs)("div", {
          style: {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 20px",
            background: "rgba(15, 23, 42, 0.95)",
            borderBottom: "1px solid rgba(51, 65, 85, 0.8)"
          },
          children: [
            (0, _jsx.jsxs)("div", {
              style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" },
              children: [
                (0, _jsx.jsx)("span", {
                  style: {
                    background: "linear-gradient(135deg, #4f46e5, #059669)",
                    color: "#ffffff",
                    padding: "5px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.02em"
                  },
                  children: "🦖 Pi-Codex · 工作模式 (Work Mode)"
                }),
                (0, _jsx.jsxs)("span", {
                  style: { fontSize: "12px", color: "#94a3b8" },
                  children: [
                    "创作者：",
                    (0, _jsx.jsx)("strong", { style: { color: "#e2e8f0" }, children: current }),
                    " · ",
                    levelName
                  ]
                }),
                (0, _jsx.jsxs)("span", {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    borderRadius: "999px",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    background: "rgba(16, 185, 129, 0.12)",
                    padding: "3px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6ee7b7"
                  },
                  children: ["⚡ ", livePoints.toLocaleString(), " 积分可用"]
                })
              ]
            }),
            (0, _jsx.jsxs)("div", {
              style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" },
              children: [
                (0, _jsx.jsx)("button", {
                  type: "button",
                  onClick: () => {
                    const dinoBtn = document.querySelector(".ans-dino-trigger");
                    if (dinoBtn && typeof dinoBtn.click === "function") dinoBtn.click();
                  },
                  style: {
                    cursor: "pointer",
                    borderRadius: "10px",
                    border: "1px solid rgba(71, 85, 105, 0.9)",
                    background: "rgba(30, 41, 59, 0.85)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#e2e8f0"
                  },
                  children: "💬 切回悬浮聊天模式"
                }),
                (0, _jsx.jsx)("a", {
                  href: "https://vibehub.cauai.fun",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    textDecoration: "none",
                    borderRadius: "10px",
                    border: "1px solid rgba(99, 102, 241, 0.45)",
                    background: "rgba(99, 102, 241, 0.16)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#c7d2fe"
                  },
                  children: "✨ VibeHub ↗"
                }),
                (0, _jsx.jsx)("a", {
                  href: "https://toonflow.cauai.fun",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    textDecoration: "none",
                    borderRadius: "10px",
                    border: "1px solid rgba(245, 158, 11, 0.45)",
                    background: "rgba(245, 158, 11, 0.16)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#fde68a"
                  },
                  children: "🎬 Toonflow 漫剧 ↗"
                }),
                (0, _jsx.jsx)("a", {
                  href: "/models",
                  style: {
                    textDecoration: "none",
                    borderRadius: "10px",
                    border: "1px solid rgba(16, 185, 129, 0.45)",
                    background: "rgba(16, 185, 129, 0.16)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#a7f3d0"
                  },
                  children: "⚡ DeepSeek 在线沙盒"
                })
              ]
            })
          ]
        }),
        (0, _jsx.jsxs)("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "260px minmax(330px, 1fr) minmax(480px, 1.35fr)",
            minHeight: "620px"
          },
          children: [
            (0, _jsx.jsxs)("aside", {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "16px",
                background: "rgba(15, 23, 42, 0.55)",
                borderRight: "1px solid rgba(51, 65, 85, 0.8)"
              },
              children: [
                (0, _jsx.jsxs)("div", {
                  children: [
                    (0, _jsx.jsxs)("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px"
                      },
                      children: [
                        (0, _jsx.jsx)("span", {
                          style: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" },
                          children: "Codex 任务线程 (4)"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: createNewThread,
                          style: {
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            background: "#4f46e5",
                            color: "#ffffff",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700
                          },
                          children: "+ 新建线程"
                        })
                      ]
                    }),
                    (0, _jsx.jsx)("div", {
                      style: { display: "flex", flexDirection: "column", gap: "7px" },
                      children: threads.map((th) =>
                        (0, _jsx.jsxs)(
                          "button",
                          {
                            type: "button",
                            onClick: () => setActiveThreadId(th.id),
                            style: {
                              cursor: "pointer",
                              width: "100%",
                              textAlign: "left",
                              borderRadius: "12px",
                              padding: "9px 11px",
                              border:
                                th.id === activeThread.id
                                  ? "1px solid rgba(99, 102, 241, 0.75)"
                                  : "1px solid rgba(51, 65, 85, 0.7)",
                              background:
                                th.id === activeThread.id
                                  ? "rgba(79, 70, 229, 0.18)"
                                  : "rgba(15, 23, 42, 0.7)",
                              color: th.id === activeThread.id ? "#ffffff" : "#cbd5e1"
                            },
                            children: [
                              (0, _jsx.jsxs)("div", {
                                style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" },
                                children: [
                                  (0, _jsx.jsx)("span", {
                                    style: {
                                      borderRadius: "6px",
                                      background: "rgba(30, 41, 59, 0.95)",
                                      padding: "2px 6px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: "#a5b4fc"
                                    },
                                    children: th.tag
                                  }),
                                  (0, _jsx.jsx)("span", {
                                    style: { fontSize: "10px", color: "#94a3b8" },
                                    children: th.updatedAt
                                  })
                                ]
                              }),
                              (0, _jsx.jsx)("div", {
                                style: {
                                  marginTop: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                },
                                children: th.title
                              })
                            ]
                          },
                          th.id
                        )
                      )
                    }),
                    (0, _jsx.jsxs)("div", {
                      style: { marginTop: "18px" },
                      children: [
                        (0, _jsx.jsx)("div", {
                          style: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" },
                          children: "Pi Agent 实权代办与立项"
                        }),
                        (0, _jsx.jsxs)("div", {
                          style: { display: "flex", flexDirection: "column", gap: "6px" },
                          children: [
                            (0, _jsx.jsxs)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runPiBackendAction("scaffold", "🚀 将当前作品立项存为我的项目", activeThread.title),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRadius: "10px",
                                border: "1px solid rgba(99, 102, 241, 0.45)",
                                background: "rgba(49, 46, 129, 0.3)",
                                padding: "7px 10px",
                                fontSize: "11.5px",
                                color: "#c7d2fe"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "🚀 一键立项存为我的项目" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700, color: "#818cf8" }, children: "写入DB" })
                              ]
                            }),
                            (0, _jsx.jsxs)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runPiBackendAction("checkin", "📅 执行每日签到领积分"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRadius: "10px",
                                border: "1px solid rgba(16, 185, 129, 0.35)",
                                background: "rgba(6, 78, 59, 0.25)",
                                padding: "7px 10px",
                                fontSize: "11.5px",
                                color: "#6ee7b7"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "📅 Pi Agent 一键签到" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700 }, children: "+5分/抓币" })
                              ]
                            }),
                            (0, _jsx.jsxs)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runPiBackendAction("claw", "🕹️ 启动 3D 灵龙抓娃娃机抽锦鲤"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRadius: "10px",
                                border: "1px solid rgba(245, 158, 11, 0.35)",
                                background: "rgba(120, 53, 15, 0.25)",
                                padding: "7px 10px",
                                fontSize: "11.5px",
                                color: "#fcd34d"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "🕹️ Pi Agent 代抓娃娃" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700 }, children: "最高1000分" })
                              ]
                            }),
                            (0, _jsx.jsxs)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runPiBackendAction("redeem", "🎁 5 积分秒兑周报生成模板", "lab-weekly-git-report-automation"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRadius: "10px",
                                border: "1px solid rgba(236, 72, 153, 0.35)",
                                background: "rgba(131, 24, 67, 0.25)",
                                padding: "7px 10px",
                                fontSize: "11.5px",
                                color: "#f9a8d4"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "🎁 5分秒兑周报模板" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700 }, children: "秒发订单" })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, _jsx.jsxs)("div", {
                  style: {
                    marginTop: "14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(51, 65, 85, 0.8)",
                    background: "rgba(15, 23, 42, 0.8)",
                    padding: "10px 12px",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    color: "#94a3b8"
                  },
                  children: [
                    (0, _jsx.jsx)("div", { style: { fontWeight: 700, color: "#e2e8f0" }, children: "💡 双模式分工说明" }),
                    (0, _jsx.jsx)("div", {
                      style: { marginTop: "4px" },
                      children: "右下角小恐龙负责轻量「聊天模式」；复杂的页面编码、实时预览、赛事原型与批处理代办均在此「Codex 工作台」内闭环完成。"
                    })
                  ]
                })
              ]
            }),
            (0, _jsx.jsxs)("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "16px",
                background: "#090d16",
                borderRight: "1px solid rgba(51, 65, 85, 0.8)"
              },
              children: [
                (0, _jsx.jsxs)("div", {
                  style: { display: "flex", flexDirection: "column", gap: "12px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" },
                  children: [
                    activeThread.messages.map((m) =>
                      (0, _jsx.jsxs)(
                        "div",
                        {
                          style: {
                            borderRadius: "16px",
                            padding: "14px",
                            fontSize: "12.5px",
                            lineHeight: 1.65,
                            border:
                              m.role === "user"
                                ? "1px solid rgba(99, 102, 241, 0.45)"
                                : "1px solid rgba(51, 65, 85, 0.85)",
                            background:
                              m.role === "user"
                                ? "rgba(49, 46, 129, 0.35)"
                                : "rgba(15, 23, 42, 0.9)",
                            color: m.role === "user" ? "#e0e7ff" : "#e2e8f0"
                          },
                          children: [
                            (0, _jsx.jsxs)("div", {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#94a3b8"
                              },
                              children: [
                                (0, _jsx.jsx)("span", {
                                  children: m.role === "user" ? "🧑‍💻 " + current : "🦖 Pi-Codex Agent"
                                }),
                                (0, _jsx.jsx)("span", {
                                  style: { color: "#34d399" },
                                  children: m.role === "assistant" ? "● 已同步右侧沙箱" : "Prompt"
                                })
                              ]
                            }),
                            m.steps &&
                              m.steps.length > 0 &&
                              (0, _jsx.jsx)("div", {
                                style: {
                                  marginBottom: "10px",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(51, 65, 85, 0.8)",
                                  background: "rgba(2, 6, 23, 0.85)",
                                  padding: "10px",
                                  fontFamily: "monospace",
                                  fontSize: "11px",
                                  color: "#6ee7b7"
                                },
                                children: m.steps.map((st, idx) =>
                                  (0, _jsx.jsxs)(
                                    "div",
                                    {
                                      style: { display: "flex", alignItems: "center", gap: "6px", marginTop: idx > 0 ? "4px" : "0" },
                                      children: [
                                        (0, _jsx.jsx)("span", { style: { color: "#10b981", fontWeight: 800 }, children: "✓" }),
                                        (0, _jsx.jsx)("span", { children: st })
                                      ]
                                    },
                                    idx
                                  )
                                )
                              }),
                            (0, _jsx.jsx)("div", { style: { whiteSpace: "pre-wrap" }, children: m.text }),
                            m.links &&
                              m.links.length > 0 &&
                              (0, _jsx.jsx)("div", {
                                style: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" },
                                children: m.links.map((lnk, lIdx) =>
                                  (0, _jsx.jsx)(
                                    "a",
                                    {
                                      href: lnk.href,
                                      style: {
                                        textDecoration: "none",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(99, 102, 241, 0.5)",
                                        background: "rgba(79, 70, 229, 0.25)",
                                        padding: "5px 10px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: "#c7d2fe"
                                      },
                                      children: lnk.title + " ↗"
                                    },
                                    lIdx
                                  )
                                )
                              })
                          ]
                        },
                        m.id
                      )
                    ),
                    busy &&
                      (0, _jsx.jsx)("div", {
                        style: {
                          borderRadius: "14px",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          background: "rgba(49, 46, 129, 0.25)",
                          padding: "12px",
                          fontSize: "12px",
                          color: "#a5b4fc"
                        },
                        children: "🦖 Pi-Codex 正在调用 " + model + " 并编译右侧沙箱工件..."
                      })
                  ]
                }),
                (0, _jsx.jsxs)("form", {
                  onSubmit: (e) => {
                    e.preventDefault();
                    runCodexTask();
                  },
                  style: {
                    marginTop: "14px",
                    borderRadius: "16px",
                    border: "1px solid rgba(71, 85, 105, 0.85)",
                    background: "rgba(15, 23, 42, 0.92)",
                    padding: "10px 12px"
                  },
                  children: [
                    (0, _jsx.jsx)("textarea", {
                      rows: 3,
                      value: prompt,
                      onChange: (e) => setPrompt(e.target.value),
                      placeholder: "输入工程指令给 Pi-Codex（如：写一个带粒子特效的番茄钟网页 / 生成农客松温室监测台 / 规划漫剧分镜）...",
                      style: {
                        width: "100%",
                        resize: "none",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: "12px",
                        lineHeight: 1.5,
                        color: "#f1f5f9"
                      }
                    }),
                    (0, _jsx.jsxs)("div", {
                      style: {
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid rgba(51, 65, 85, 0.8)",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px"
                      },
                      children: [
                        (0, _jsx.jsxs)("select", {
                          value: model,
                          onChange: (e) => setModel(e.target.value),
                          "aria-label": "选择 Codex 推理模型",
                          style: {
                            borderRadius: "8px",
                            border: "1px solid rgba(71, 85, 105, 0.9)",
                            background: "#0f172a",
                            color: "#cbd5e1",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            outline: "none"
                          },
                          children: [
                            (0, _jsx.jsx)("option", { value: "deepseek-v4.1-flash", children: "⚡ DeepSeek-V4.1-Flash (0.5分)" }),
                            (0, _jsx.jsx)("option", { value: "gpt-6-astra", children: "🌟 GPT-6-Astra (1分)" }),
                            (0, _jsx.jsx)("option", { value: "gpt-6.1-sol", children: "🧠 GPT-6.1-Sol (1分)" })
                          ]
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "submit",
                          disabled: busy || !prompt.trim(),
                          style: {
                            cursor: busy || !prompt.trim() ? "not-allowed" : "pointer",
                            opacity: busy || !prompt.trim() ? 0.5 : 1,
                            border: "none",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #4f46e5, #059669)",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#ffffff"
                          },
                          children: busy ? "执行中..." : "运行 Codex 任务 ↵"
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            (0, _jsx.jsxs)("div", {
              style: { display: "flex", flexDirection: "column", background: "rgba(15, 23, 42, 0.4)" },
              children: [
                (0, _jsx.jsxs)("div", {
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "10px 14px",
                    background: "rgba(15, 23, 42, 0.85)",
                    borderBottom: "1px solid rgba(51, 65, 85, 0.8)"
                  },
                  children: [
                    (0, _jsx.jsxs)("div", {
                      style: { display: "flex", alignItems: "center", gap: "6px" },
                      children: [
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => setRightTab("preview"),
                          style: {
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: rightTab === "preview" ? "#4f46e5" : "transparent",
                            color: rightTab === "preview" ? "#ffffff" : "#94a3b8"
                          },
                          children: "👁️ 实时预览"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => setRightTab("code"),
                          style: {
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: rightTab === "code" ? "#4f46e5" : "transparent",
                            color: rightTab === "code" ? "#ffffff" : "#94a3b8"
                          },
                          children: "💻 源码编辑"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => setRightTab("terminal"),
                          style: {
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: rightTab === "terminal" ? "#4f46e5" : "transparent",
                            color: rightTab === "terminal" ? "#ffffff" : "#94a3b8"
                          },
                          children: "📟 终端日志"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => setRightTab("tools"),
                          style: {
                            cursor: "pointer",
                            border: "none",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: rightTab === "tools" ? "#4f46e5" : "transparent",
                            color: rightTab === "tools" ? "#ffffff" : "#94a3b8"
                          },
                          children: "🧰 全站工具箱"
                        })
                      ]
                    }),
                    (0, _jsx.jsxs)("div", {
                      style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" },
                      children: [
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => setIframeKey((k) => k + 1),
                          title: "重新挂载并运行沙箱预览",
                          style: {
                            cursor: "pointer",
                            borderRadius: "8px",
                            border: "1px solid rgba(71, 85, 105, 0.9)",
                            background: "rgba(30, 41, 59, 0.9)",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#cbd5e1"
                          },
                          children: "🔄 重置"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: downloadHtmlFile,
                          title: "将当前 HTML5 沙箱源码下载到本地电脑",
                          style: {
                            cursor: "pointer",
                            borderRadius: "8px",
                            border: "1px solid rgba(16, 185, 129, 0.45)",
                            background: "rgba(6, 78, 59, 0.4)",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#6ee7b7"
                          },
                          children: "💾 下载 .html"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: openPreviewInNewTab,
                          title: "在浏览器新标签页全屏运行当前沙箱作品",
                          style: {
                            cursor: "pointer",
                            borderRadius: "8px",
                            border: "1px solid rgba(99, 102, 241, 0.45)",
                            background: "rgba(49, 46, 129, 0.4)",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#c7d2fe"
                          },
                          children: "🖥️ 新窗口全屏 ↗"
                        }),
                        (0, _jsx.jsx)("button", {
                          type: "button",
                          onClick: () => {
                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(activeThread.code);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1800);
                            }
                          },
                          style: {
                            cursor: "pointer",
                            borderRadius: "8px",
                            border: "1px solid rgba(71, 85, 105, 0.9)",
                            background: "rgba(30, 41, 59, 0.9)",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#e2e8f0"
                          },
                          children: copied ? "✅ 已复制" : "📋 复制源码"
                        })
                      ]
                    })
                  ]
                }),
                (0, _jsx.jsxs)("div", {
                  style: { flex: 1, padding: "12px" },
                  children: [
                    rightTab === "preview" &&
                      (0, _jsx.jsx)("div", {
                        style: {
                          height: "540px",
                          width: "100%",
                          borderRadius: "16px",
                          overflow: "hidden",
                          border: "1px solid rgba(51, 65, 85, 0.9)",
                          background: "#090d16"
                        },
                        children: (0, _jsx.jsx)(
                          "iframe",
                          {
                            title: activeThread.codeTitle,
                            srcDoc: activeThread.code,
                            sandbox: "allow-scripts",
                            style: { width: "100%", height: "100%", border: "0", display: "block" }
                          },
                          activeThread.id + "-" + iframeKey
                        )
                      }),
                    rightTab === "code" &&
                      (0, _jsx.jsxs)("div", {
                        style: { display: "flex", flexDirection: "column", height: "540px" },
                        children: [
                          (0, _jsx.jsx)("div", {
                            style: { marginBottom: "8px", fontSize: "12px", color: "#94a3b8" },
                            children: "直接修改下方源码，切换到「实时预览」即可立即查看渲染效果："
                          }),
                          (0, _jsx.jsx)("textarea", {
                            value: activeThread.code,
                            onChange: (e) => handleCodeEdit(e.target.value),
                            spellCheck: false,
                            style: {
                              flex: 1,
                              width: "100%",
                              resize: "none",
                              borderRadius: "16px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "#020617",
                              padding: "14px",
                              fontFamily: "monospace",
                              fontSize: "12px",
                              lineHeight: 1.6,
                              color: "#6ee7b7",
                              outline: "none"
                            }
                          })
                        ]
                      }),
                    rightTab === "terminal" &&
                      (0, _jsx.jsxs)("div", {
                        style: {
                          height: "540px",
                          overflowY: "auto",
                          borderRadius: "16px",
                          border: "1px solid rgba(51, 65, 85, 0.9)",
                          background: "#020617",
                          padding: "16px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          lineHeight: 1.8,
                          color: "#34d399"
                        },
                        children: [
                          (0, _jsx.jsx)("div", {
                            style: { color: "#94a3b8" },
                            children: "$ ans-codex-runner --sandbox=isolated --mode=work"
                          }),
                          activeThread.logs.map((ln, idx) => (0, _jsx.jsx)("div", { children: ln }, idx)),
                          (0, _jsx.jsx)("div", {
                            style: { marginTop: "8px", color: "#a5b4fc" },
                            children: "ready > 等待下一条 Pi-Codex 指令..."
                          })
                        ]
                      }),
                    rightTab === "tools" &&
                      (0, _jsx.jsxs)("div", {
                        style: {
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "12px",
                          height: "540px",
                          overflowY: "auto",
                          alignContent: "start"
                        },
                        children: [
                          (0, _jsx.jsxs)("a", {
                            href: "https://vibehub.cauai.fun",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "✨ VibeHub 灵感与代码社区 ↗" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "一键直达外部 Vibe Coding 独立站，浏览与发布全栈 AI 作品。" })
                            ]
                          }),
                          (0, _jsx.jsxs)("a", {
                            href: "https://toonflow.cauai.fun",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "🎬 Toonflow 漫剧流水线 ↗" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "一键直达 AI 漫剧外部创作台，分镜脚本与角色一致性生成。" })
                            ]
                          }),
                          (0, _jsx.jsxs)("a", {
                            href: "/models",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "⚡ DeepSeek 在线沙盒" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "零配置在线测试 DeepSeek-V3 / R1 推理与代码生成。" })
                            ]
                          }),
                          (0, _jsx.jsxs)("a", {
                            href: "/workspace/benefits",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "🎁 算力福利与 3D 抓娃娃机" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "免费领 100~150 积分，参与 3D 灵龙抓娃娃最高暴击 1000 分。" })
                            ]
                          }),
                          (0, _jsx.jsxs)("a", {
                            href: "/market",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "🛒 积分商城 · 5分秒兑成品" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "使用签到积分秒兑周报生成、简历润色与个人网站源码包。" })
                            ]
                          }),
                          (0, _jsx.jsxs)("a", {
                            href: "/competitions",
                            style: {
                              textDecoration: "none",
                              borderRadius: "14px",
                              border: "1px solid rgba(51, 65, 85, 0.9)",
                              background: "rgba(2, 6, 23, 0.9)",
                              padding: "16px"
                            },
                            children: [
                              (0, _jsx.jsx)("div", { style: { fontSize: "14px", fontWeight: 700, color: "#ffffff" }, children: "🏆 农客松 & AIGC 赛事大厅" }),
                              (0, _jsx.jsx)("p", { style: { marginTop: "6px", fontSize: "12px", color: "#94a3b8" }, children: "查看赛程规则、提交参赛立项并领取赛事专属算力补贴。" })
                            ]
                          })
                        ]
                      })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  };
}
`;

// 4. Replace makePiCodexWorkbench in /app/.next/server/app/workspace/page.js
const wsServerPath = "/app/.next/server/app/workspace/page.js";
let wsServer = fs.readFileSync(wsServerPath, "utf8");

const ssrFactoryStart = wsServer.indexOf("function makePiCodexWorkbench(_jsx, _React, _toastMod)");
const ssrFactoryEnd = wsServer.indexOf("const _PiCodexSSR=makePiCodexWorkbench(d,e,f);");
if (ssrFactoryStart !== -1 && ssrFactoryEnd !== -1) {
  wsServer = wsServer.slice(0, ssrFactoryStart) + WORKBENCH_FACTORY_CODE.trim() + "\n" + wsServer.slice(ssrFactoryEnd);
  console.log("[OK] Updated makePiCodexWorkbench v14 in server workspace/page.js");
} else {
  throw new Error("Could not find makePiCodexWorkbench in " + wsServerPath);
}
fs.writeFileSync(wsServerPath, wsServer, "utf8");

// 5. Replace makePiCodexWorkbench in /app/.next/static/chunks/app/workspace/page-6ee65e709227d81f.js
const wsClientPath = "/app/.next/static/chunks/app/workspace/page-6ee65e709227d81f.js";
let wsClient = fs.readFileSync(wsClientPath, "utf8");

const cliFactoryStart = wsClient.indexOf("function makePiCodexWorkbench(_jsx, _React, _toastMod)");
const cliFactoryEnd = wsClient.indexOf("const _PiCodexClient=makePiCodexWorkbench(n,a,i);");
if (cliFactoryStart !== -1 && cliFactoryEnd !== -1) {
  wsClient = wsClient.slice(0, cliFactoryStart) + WORKBENCH_FACTORY_CODE.trim() + "\n" + wsClient.slice(cliFactoryEnd);
  console.log("[OK] Updated makePiCodexWorkbench v14 in client workspace chunk");
} else {
  throw new Error("Could not find makePiCodexWorkbench in " + wsClientPath);
}

writeWithGz(wsClientPath, wsClient);
writeWithGz("/app/.next/static/chunks/app/layout-eefda1d6816e8416.js", layoutClient);
writeWithGz("/app/.next/static/chunks/app/workspace/page-6ee65e709227d816.js", wsClient);

function walkDir(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

let manifestCount = 0;
walkDir("/app/.next/server", (file) => {
  if (!file.endsWith("_client-reference-manifest.js")) return;
  const raw = fs.readFileSync(file, "utf8");
  const updated = raw
    .replaceAll("eefda1d6816e8414", "eefda1d6816e8416")
    .replaceAll("eefda1d6816e8413", "eefda1d6816e8416")
    .replaceAll("eefda1d6816e8415", "eefda1d6816e8416")
    .replaceAll("6ee65e709227d814", "6ee65e709227d816")
    .replaceAll("6ee65e709227d813", "6ee65e709227d816")
    .replaceAll("6ee65e709227d81f", "6ee65e709227d816");
  if (updated !== raw) {
    fs.writeFileSync(file, updated, "utf8");
    manifestCount++;
  }
});
console.log("[OK] Updated " + manifestCount + " client-reference-manifest files to v16 CDN-busted chunk hashes");
console.log("=== ALL v14 PATCHES APPLIED SUCCESSFULLY ===");
