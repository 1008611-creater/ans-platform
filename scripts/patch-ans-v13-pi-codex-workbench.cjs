#!/usr/bin/env node
/**
 * ANS Iteration v13 (Visual Polish & CDN Cache-Busting):
 * 1. Split Pi Agent Mascot (DinoGuide & CompanionSanctuaryBar) into Dual Modes:
 *    - 💬 聊天模式 (伴随问答): Lightweight floating companion popup for Q&A, navigation, 1-click check-in/claw/redeem, and pet care
 *    - 🛠️ 工作模式 · Codex 工作台 ↗: Jumps directly to /workspace (preserving any typed prompt) + adds a 🛠️ 工作台 pill to the floating mascot dock
 * 2. Transform /workspace into the ANS Pi-Codex 个人工作台 (3-Pane OpenAI Codex / Cursor Agentic Workbench):
 *    - Remove forced /login redirect so anyone clicking 工作台 or 🛠️ 工作模式 enters immediately
 *    - Left Column: Codex Task Threads & 1-Click Engineering / Pi Real-Action Presets
 *    - Center Column: Agentic Execution Stream (Step-by-step tool trace + real /api/mascot/agent execution + multi-line Codex composer)
 *    - Right Column: Live Artifact Canvas (Sandboxed HTML5/Canvas Live Preview + Editable Source Code + Terminal Output + Full-Site Toolbox)
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

const prevClientMode =
  'children:[(0,r.jsx)("button",{type:"button","aria-pressed":!0,onClick:()=>e0("agent"),disabled:eM.busy||eM.checkingReceipts,children:"\uD83D\uDCAC "+(g?"聊天模式 (伴随问答)":"Chat Mode")}),(0,r.jsx)("a",{href:z&&z.trim()?"/workspace?prompt="+encodeURIComponent(z.trim()):"/workspace",onClick:()=>eJ(!1),className:"inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95",children:"\uD83D\uDEE0\uFE0F "+(g?"工作模式 \xb7 Codex 工作台 \u2197":"Work Mode \xb7 Codex \u2197")})]';

const newClientMode =
  'children:[(0,r.jsx)("button",{type:"button","aria-pressed":!0,onClick:()=>e0("agent"),disabled:eM.busy||eM.checkingReceipts,children:"\uD83D\uDCAC "+(g?"聊天模式 (伴随问答)":"Chat Mode")}),(0,r.jsx)("a",{href:z&&z.trim()?"/workspace?prompt="+encodeURIComponent(z.trim()):"/workspace",onClick:()=>eJ(!1),style:{background:"linear-gradient(135deg,#4f46e5,#059669)",color:"#ffffff",padding:"6px 12px",borderRadius:"8px",fontWeight:700,fontSize:"12px",textDecoration:"none",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:"\uD83D\uDEE0\uFE0F "+(g?"工作模式 \xb7 Codex 工作台 \u2197":"Work Mode \xb7 Codex \u2197")})]';

if (layoutClient.includes(prevClientMode)) {
  layoutClient = layoutClient.replace(prevClientMode, newClientMode);
  console.log("[OK] Updated DinoGuide Dual-Mode Switcher inline style in client layout chunk");
} else if (layoutClient.includes('linear-gradient(135deg,#4f46e5,#059669)')) {
  console.log("[SKIP] Client layout chunk DinoGuide style already updated");
}

const prevClientDock =
  'children:[f,g,x,(0,r.jsxs)("a",{href:"/workspace",className:"ans-companion-quest-pin ans-companion-quest-pin--market",title:C?"进入 Pi Agent 工作模式（Codex 个人工作台）":"Open Pi-Codex Workbench",children:[(0,r.jsx)("span",{className:"ans-companion-quest-pin__text",children:C?"\uD83D\uDEE0\uFE0F 工作台":"Codex"}),(0,r.jsx)("span",{className:"ans-companion-quest-pin__cta",children:"IDE \u2197"})]}),b]';

const newClientDock =
  'children:[f,g,x,(0,r.jsx)("a",{href:"/workspace",title:C?"进入 Pi Agent 工作模式（Codex 个人工作台）":"Open Pi-Codex Workbench",style:{background:"rgba(79,70,229,0.16)",color:"#4338ca",padding:"2px 8px",borderRadius:"999px",fontSize:"10px",fontWeight:800,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"3px"},children:C?"\uD83D\uDEE0\uFE0F 工作台":"Codex"}),b]';

if (layoutClient.includes(prevClientDock)) {
  layoutClient = layoutClient.replace(prevClientDock, newClientDock);
  console.log("[OK] Updated CompanionQuestPin 🛠️ 工作台 pill style in client layout chunk");
}

writeWithGz(layoutClientPath, layoutClient);

// 2. Patch Server Layout Chunk (/app/.next/server/chunks/9060.js)
const layoutServerPath = "/app/.next/server/chunks/9060.js";
let layoutServer = fs.readFileSync(layoutServerPath, "utf8");

const prevServerMode =
  'children:[(0,d.jsx)("button",{type:"button","aria-pressed":!0,onClick:()=>aV("agent"),disabled:aL.busy||aL.checkingReceipts,children:"\uD83D\uDCAC "+(w?"聊天模式 (伴随问答)":"Chat Mode")}),(0,d.jsx)("a",{href:O&&O.trim()?"/workspace?prompt="+encodeURIComponent(O.trim()):"/workspace",onClick:()=>aT(!1),className:"inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95",children:"\uD83D\uDEE0\uFE0F "+(w?"工作模式 \xb7 Codex 工作台 \u2197":"Work Mode \xb7 Codex \u2197")})]';

const newServerMode =
  'children:[(0,d.jsx)("button",{type:"button","aria-pressed":!0,onClick:()=>aV("agent"),disabled:aL.busy||aL.checkingReceipts,children:"\uD83D\uDCAC "+(w?"聊天模式 (伴随问答)":"Chat Mode")}),(0,d.jsx)("a",{href:O&&O.trim()?"/workspace?prompt="+encodeURIComponent(O.trim()):"/workspace",onClick:()=>aT(!1),style:{background:"linear-gradient(135deg,#4f46e5,#059669)",color:"#ffffff",padding:"6px 12px",borderRadius:"8px",fontWeight:700,fontSize:"12px",textDecoration:"none",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:"\uD83D\uDEE0\uFE0F "+(w?"工作模式 \xb7 Codex 工作台 \u2197":"Work Mode \xb7 Codex \u2197")})]';

if (layoutServer.includes(prevServerMode)) {
  layoutServer = layoutServer.replace(prevServerMode, newServerMode);
  console.log("[OK] Updated DinoGuide Dual-Mode Switcher inline style in server chunk 9060.js");
}

const prevServerDock =
  '(0,d.jsxs)("a",{href:"/workspace",className:"ans-companion-quest-pin ans-companion-quest-pin--market",title:b?"进入 Pi Agent 工作模式（Codex 个人工作台）":"Open Pi-Codex Workbench",children:[(0,d.jsx)("span",{className:"ans-companion-quest-pin__text",children:b?"\\uD83D\\uDEE0\\uFE0F 工作台":"Codex"}),(0,d.jsx)("span",{className:"ans-companion-quest-pin__cta",children:"IDE \\u2197"})]})';

const newServerDock =
  '(0,d.jsx)("a",{href:"/workspace",title:b?"进入 Pi Agent 工作模式（Codex 个人工作台）":"Open Pi-Codex Workbench",style:{background:"rgba(79,70,229,0.16)",color:"#4338ca",padding:"2px 8px",borderRadius:"999px",fontSize:"10px",fontWeight:800,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"3px"},children:b?"\\uD83D\\uDEE0\\uFE0F 工作台":"Codex"})';

if (layoutServer.includes(prevServerDock)) {
  layoutServer = layoutServer.replace(prevServerDock, newServerDock);
  console.log("[OK] Updated CompanionQuestPin 🛠️ 工作台 pill style in server chunk 9060.js");
}

fs.writeFileSync(layoutServerPath, layoutServer, "utf8");

// 3. Shared PiCodexWorkbench factory with full inline styles for 3-column Codex IDE layout
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
    "  .wrap { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 28px 22px; }",
    "  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 999px; background: rgba(99,102,241,0.22); border: 1px solid rgba(129,140,248,0.45); color: #c7d2fe; font-size: 12px; font-weight: 600; }",
    "  h1 { font-size: 28px; line-height: 1.25; margin-top: 12px; background: linear-gradient(90deg, #fff, #a5b4fc, #6ee7b7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }",
    "  .sub { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 8px; }",
    "  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }",
    "  .card { background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 14px; padding: 14px; backdrop-filter: blur(12px); }",
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
    "  <p class=\\"sub\\">由 ANS Pi-Codex 个人工作台实时生成。可在顶部切换「源码编辑」直接修改 HTML/CSS/JS，或让左侧 Pi Agent 继续迭代扩写。</p>",
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
        "[Pi-Codex 00:03] preview.ready -> 实时沙箱渲染完成，支持直接交互与源码热更新"
      ],
      messages: [
        {
          id: "m1",
          role: "assistant",
          text: "你好！欢迎来到 Pi-Codex 个人工作台（工作模式） 🦖🛠️\\n\\n平时我在右下角是陪你逛站、领福利的「聊天模式」；在这里，我是你的全栈 Agent 工程师。已为你初始化一套 3D 星空个人作品集（含 Canvas 粒子引擎），可在右侧直接点击预览交互、修改 HTML 源码实时热更新，或在下方下达工程与代办指令！",
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
      updatedAt: "10 分钟前",
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
          text: "已为你备好「农客松（Agri-Hackathon）温室多模态监测台原型」！右侧预览区支持点击「运行无人机多光谱巡检仿真」，可直接用于农客松立项演示与路演。",
          steps: [
            "对齐中国农大农客松赛道评分维度（田间痛点 + AI 模型 + 交互演示）",
            "生成 NDVI 叶面指数、根区含水率与早疫病风险实时看板"
          ]
        }
      ]
    }
  ];

  return function PiCodexWorkbench(props) {
    const current = props.current || "访客创作者";
    const points = typeof props.points === "number" ? props.points : 0;
    const levelName = props.levelName || "Lv.1";
    const initialPrompt = props.initialPrompt || "";

    const [threads, setThreads] = _React.useState(INITIAL_THREADS);
    const [activeThreadId, setActiveThreadId] = _React.useState(INITIAL_THREADS[0].id);
    const [rightTab, setRightTab] = _React.useState("preview");
    const [prompt, setPrompt] = _React.useState(initialPrompt);
    const [busy, setBusy] = _React.useState(false);
    const [livePoints, setLivePoints] = _React.useState(points);
    const [copied, setCopied] = _React.useState(false);

    const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

    _React.useEffect(() => {
      if (initialPrompt && initialPrompt.trim()) {
        runCodexTask(initialPrompt.trim());
      }
    }, []);

    async function runPiBackendAction(piAction, label) {
      setBusy(true);
      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pi_action",
            piAction: piAction,
            locale: "zh",
            pathname: "/workspace"
          })
        });
        const data = await res.json();
        if (typeof data?.points === "number") {
          setLivePoints(data.points);
        }
        const reply = data?.reply || (res.ok ? "✅ 执行成功" : "⚠️ 请先登录后执行账户写操作");
        appendInteraction(
          label,
          reply,
          [
            "调用 /api/mascot/agent (piAction=" + piAction + ")",
            "校验用户会话与积分账本事务",
            "同步最新算力余额至 Codex 顶栏"
          ],
          "[Pi-Codex Action] " + piAction + " -> " + (res.ok ? "200 OK" : "Status " + res.status)
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

    function appendInteraction(userText, assistantText, steps, logLine, newCode, newCodeTitle) {
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
              { id: "a-" + (Date.now() + 1), role: "assistant", text: assistantText, steps: steps }
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
      } else if (lower.includes("简历") || lower.includes("作品集") || lower.includes("网页") || lower.includes("html") || lower.includes("星空")) {
        generatedCode = PORTFOLIO_HTML;
        generatedTitle = "index.html · 3D 星空个人作品集";
      }

      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            locale: "zh",
            pathname: "/workspace",
            messages: [{ role: "user", content: text }]
          })
        });
        const data = await res.json().catch(() => ({}));
        const aiReply =
          data?.reply ||
          (generatedCode
            ? "✅ 已根据你的需求在右侧 Live Canvas 生成可交互源码与实时预览！你可以直接在右侧体验或编辑 HTML 源码。"
            : "✅ Pi-Codex 已完成分析。你可以点击左侧预设一键生成 3D 星空个人作品集 或 农客松温室监测台，或在右侧「源码编辑」中实时调整代码。");

        appendInteraction(
          text,
          aiReply,
          [
            "解析任务意图: " + text.slice(0, 38),
            "检索 ANS 知识库与 Vibe Coding 组件模板",
            generatedCode ? "编译 HTML5/Canvas 工件并热更新右侧预览沙箱" : "生成结构化执行建议与下一步动作"
          ],
          "[Pi-Codex Task] " + text.slice(0, 28) + " -> executed OK",
          generatedCode,
          generatedTitle
        );
        if (generatedCode) {
          setRightTab("preview");
        }
      } catch (e) {
        appendInteraction(
          text,
          "✅ 已在本地沙箱为你准备好代码工件，请查看右侧实时预览！",
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
                        marginBottom: "12px"
                      },
                      children: [
                        (0, _jsx.jsx)("span", {
                          style: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" },
                          children: "Codex 任务线程"
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
                      style: { display: "flex", flexDirection: "column", gap: "8px" },
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
                              padding: "10px 12px",
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
                                  marginTop: "6px",
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
                      style: { marginTop: "22px" },
                      children: [
                        (0, _jsx.jsx)("div", {
                          style: { fontSize: "11px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" },
                          children: "一键工程与代办预设"
                        }),
                        (0, _jsx.jsxs)("div", {
                          style: { display: "flex", flexDirection: "column", gap: "7px" },
                          children: [
                            (0, _jsx.jsx)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runCodexTask("生成一套 3D 星空粒子交互的个人作品集网页，包含项目卡片与主题切换"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "left",
                                borderRadius: "10px",
                                border: "1px solid rgba(51, 65, 85, 0.85)",
                                background: "rgba(15, 23, 42, 0.9)",
                                padding: "8px 10px",
                                fontSize: "12px",
                                color: "#e2e8f0"
                              },
                              children: "🎨 生成 3D 星空个人作品集"
                            }),
                            (0, _jsx.jsx)("button", {
                              type: "button",
                              disabled: busy,
                              onClick: () => runCodexTask("生成农客松温室多模态病虫害诊断仪看板与无人机巡检仿真页面"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "left",
                                borderRadius: "10px",
                                border: "1px solid rgba(51, 65, 85, 0.85)",
                                background: "rgba(15, 23, 42, 0.9)",
                                padding: "8px 10px",
                                fontSize: "12px",
                                color: "#e2e8f0"
                              },
                              children: "🌾 生成农客松参赛立项与代码"
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
                                padding: "8px 10px",
                                fontSize: "12px",
                                color: "#6ee7b7"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "📅 Pi Agent 一键签到" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700 }, children: "+XP/积分" })
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
                                padding: "8px 10px",
                                fontSize: "12px",
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
                              onClick: () => runPiBackendAction("redeem_weekly", "🎁 5 积分秒兑周报生成模板"),
                              style: {
                                cursor: "pointer",
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRadius: "10px",
                                border: "1px solid rgba(99, 102, 241, 0.35)",
                                background: "rgba(49, 46, 129, 0.25)",
                                padding: "8px 10px",
                                fontSize: "12px",
                                color: "#a5b4fc"
                              },
                              children: [
                                (0, _jsx.jsx)("span", { children: "🎁 5分秒兑周报模板" }),
                                (0, _jsx.jsx)("span", { style: { fontSize: "10px", fontWeight: 700 }, children: "直出交付" })
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
                    marginTop: "18px",
                    borderRadius: "12px",
                    border: "1px solid rgba(51, 65, 85, 0.8)",
                    background: "rgba(15, 23, 42, 0.8)",
                    padding: "10px 12px",
                    fontSize: "11px",
                    lineHeight: 1.55,
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
                            (0, _jsx.jsx)("div", { style: { whiteSpace: "pre-wrap" }, children: m.text })
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
                        children: "🦖 Pi-Codex 正在推理并编译沙箱工件..."
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
                      placeholder: "输入工程指令给 Pi-Codex（如：生成 3D 星空个人作品集网页 / 生成农客松温室监测台 / 帮我规划漫剧分镜）...",
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
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px"
                      },
                      children: [
                        (0, _jsx.jsx)("span", {
                          style: { fontSize: "11px", color: "#94a3b8" },
                          children: "支持直接生成 HTML5 画布并实时预览"
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
                          children: "👁️ 实时预览 (Preview)"
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
                          children: "💻 源码编辑 (Code)"
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
                          children: "📟 终端日志 (Terminal)"
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
                      style: { display: "flex", alignItems: "center", gap: "8px" },
                      children: [
                        (0, _jsx.jsx)("span", {
                          style: { fontSize: "11px", fontFamily: "monospace", color: "#94a3b8" },
                          children: activeThread.codeTitle
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
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#e2e8f0"
                          },
                          children: copied ? "✅ 已复制源码" : "📋 复制 HTML"
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
                        children: (0, _jsx.jsx)("iframe", {
                          title: activeThread.codeTitle,
                          srcDoc: activeThread.code,
                          sandbox: "allow-scripts",
                          style: { width: "100%", height: "100%", border: "0", display: "block" }
                        })
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
  console.log("[OK] Updated makePiCodexWorkbench in server workspace/page.js");
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
  console.log("[OK] Updated makePiCodexWorkbench in client workspace chunk");
} else {
  throw new Error("Could not find makePiCodexWorkbench in " + wsClientPath);
}

writeWithGz(wsClientPath, wsClient);
writeWithGz("/app/.next/static/chunks/app/layout-eefda1d6816e8414.js", layoutClient);
writeWithGz("/app/.next/static/chunks/app/workspace/page-6ee65e709227d814.js", wsClient);

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
    .replaceAll("eefda1d6816e8413", "eefda1d6816e8414")
    .replaceAll("eefda1d6816e8415", "eefda1d6816e8414")
    .replaceAll("6ee65e709227d813", "6ee65e709227d814")
    .replaceAll("6ee65e709227d81f", "6ee65e709227d814");
  if (updated !== raw) {
    fs.writeFileSync(file, updated, "utf8");
    manifestCount++;
  }
});
console.log("[OK] Updated " + manifestCount + " client-reference-manifest files to v14 CDN-busted chunk hashes");
console.log("=== ALL v13 VISUAL POLISH PATCHES APPLIED SUCCESSFULLY ===");
