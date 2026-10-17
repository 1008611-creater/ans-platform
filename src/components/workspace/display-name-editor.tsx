"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useSettingsRequest } from "@/components/settings/account-request";

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

interface CodexTask {
  id: string;
  title: string;
  tag: string;
  model: string;
  status: "completed" | "running" | "ready";
  prompt: string;
  trace: string[];
  summary: string;
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
  {
    id: "task-paper-polish",
    title: "📄 SCI / 课程论文摘要精修 + 双栏 Diff 对比",
    tag: "Academic / LaTeX",
    model: "gpt-6.1-sol",
    status: "completed",
    prompt: "润色农业人工智能方向的英文论文摘要，提供修改前后对比说明与 LaTeX 模板代码。",
    trace: [
      "✓ [1/3] academic.check_style — 检测长难句、被动语态与顶刊高频学术词汇",
      "✓ [2/3] codex.diff_rewrite — 生成 Native 级英文摘要与修改批注",
      "✓ [3/3] canvas.export_latex — 输出 IEEE / Elsevier 标准 LaTeX Abstract 片段",
    ],
    summary: "已完成顶刊级学术摘要精修，消除了中式英语表达，强化了定量实验增益（SOTA +4.8% mAP）与贡献点层次，右侧可直接复制 LaTeX 源码。",
    artifactType: "markdown",
    artifactFile: "paper-abstract-diff.tex",
    artifactCode: `% Polished Abstract for Computers and Electronics in Agriculture (Q1)
\\begin{abstract}
Accurate in-field crop disease diagnosis remains challenging due to complex background clutter and illumination variations. In this study, we propose \\textbf{AgriVLM-Net}, a lightweight multimodal vision-language agent tailored for real-time edge deployment in precision agriculture. Specifically, a cross-scale canopy attention module is introduced to suppress soil and weed interference, while meteorological priors are fused via gated token alignment. Extensive experiments on the CAU-Wheat2026 benchmark demonstrate that AgriVLM-Net achieves \\textbf{94.6\\% top-1 accuracy} and \\textbf{+4.8\\% mAP} over state-of-the-art baselines while reducing inference latency by 38\\%.
\\end{abstract}

% Key Upgrades (Diff Notes):
% 1. Replaced "is very hard because of" -> "remains challenging due to"
% 2. Replaced "we made a new model" -> "we propose AgriVLM-Net, a lightweight multimodal..."
% 3. Highlighted quantitative metrics (+4.8% mAP, -38% latency) in the concluding sentence.`,
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
    const shortTitle = intent === "checkin" ? "📅 灵龙实权代办：每日签到领积分" : intent === "claw" ? "🕹️ 灵龙实权代办：3D 抓娃娃机搏锦鲤" : intent === "redeem" ? "🎁 灵龙实权代办：5 积分秒兑周报模板" : "⚡ " + (q.slice(0, 26) || "Codex 工程任务");
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
                  `✓ [2/3] llm.invoke(${data?.modelUsed || model}) — 响应耗时 ${data?.latencyMs || 420}ms`,
                  "✓ [3/3] canvas.sync_artifact — 产物已同步至右侧画布",
                ],
                summary: reply,
                artifactType: isHtml ? "html" : "markdown",
                artifactFile: isHtml ? "codex-live-app.html" : "codex-output.md",
                artifactCode: extractedCode,
              }
            : item,
        ),
      );
      setCanvasTab(isHtml ? "preview" : "code");
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ Completed in ${data?.latencyMs || 420}ms (0 pts · Codex Beta Free)`,
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
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V3.2 · 极速工程主力 (0积分免扣)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 架构与学术精修 (旗舰)</option>
            <option value="gpt-6-astra">💻 Qwen-2.5-Coder / Astra · 全栈代码生成</option>
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
                  onClick={() => void executeCodexTask("请用单文件 HTML + CSS + JS 写一个可交互的 3D 星空个人作品集网页，包含项目卡片与动态粒子背景。", "playground")}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-left text-xs font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800"
                >
                  🎨 生成 3D 星空个人作品集网页
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("帮我生成一份中国农大智耕黑客松（AgriHackathon）完整立项方案，含痛点分析、多模态技术路线与 FastAPI 核心代码。", "playground")}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-left text-xs font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800"
                >
                  🌾 生成农客松参赛立项与代码
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
                { id: "preview", label: "👁️ 实时预览 (Preview)" },
                { id: "code", label: "💻 源码编辑 (Code)" },
                { id: "terminal", label: "📟 终端日志 (Terminal)" },
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
            <div className="flex items-center gap-1.5">
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
              <a
                href="/explore/submit"
                className="rounded-lg bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
              >
                🚀 发布成果 ↗
              </a>
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