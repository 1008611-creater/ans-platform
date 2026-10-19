"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createGenerationRequest, generationAdapter } from "@/app/lib/adapters";
import { starterScene } from "@/app/lib/demo-data";
import { compileImagePrompt, createDirectorSnapshot } from "@/app/lib/prompt-compiler";
import { compileCozyClayPrompt, createCozyClayGenerationRequest, type CozyClayHandoff } from "@/app/lib/cozyclay-handoff";
import { applyStudioTemplate } from "@/app/lib/studio-state";
import { studioTemplates } from "@/app/lib/templates";
import { createBetaExportDocument, downloadBetaExport, type BetaFeedback, type BetaExportRecord } from "@/app/lib/beta-experiment";
import { readSessionOrders, SESSION_ORDER_STORAGE_KEY, writeSessionOrders, type ExperienceOrderRecord } from "@/app/lib/order-contract";
import type { GenerationJob, SceneDocument } from "@/app/lib/contracts";
import type { StudioTemplate } from "@/app/lib/templates";
import QuickCreation from "./quick-creation";
import ExpertWorkspace from "./expert-workspace";

const models = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst-c", "gpt-image-2.5-sunburst"] as const;
const REAL_MODEL = "gpt-image-2.5-sunburst-c" as const;
const REAL_IMAGE_SIZE = "1024x1024" as const;
type Scenario = "success" | "failed" | "no-result" | "timeout" | "unavailable";
const scenarioLabels: Record<Scenario, string> = { success: "演示成功", failed: "演示可重试失败", "no-result": "演示无结果", timeout: "演示超时", unavailable: "演示服务不可用" };
type ProviderMode = "mock" | "openlux";
type Readiness = { state: "disabled" | "configured"; reason: string };
type SessionOrder = ExperienceOrderRecord & { templateId: StudioTemplate["id"] };
type OpenLuxResponse = { provider: "openlux"; demo: false; status: "succeeded"; outputs: Array<{ id: string; mediaType: "image"; deliveryUrl: string; expiresAt: string; width?: number; height?: number }> };
export default function Studio({ initialMode = "quick" }: { initialMode?: "quick" | "expert" }) {
  const [mode, setMode] = useState(initialMode);
  const [scene, setScene] = useState<SceneDocument>(() => applyStudioTemplate(studioTemplates[0]!));
  const [templateId, setTemplateId] = useState<StudioTemplate["id"]>(studioTemplates[0]!.id);
  const [expertTemplateId, setExpertTemplateId] = useState<StudioTemplate["id"]>(studioTemplates[0]!.id);
  const [expertAspectRatio, setExpertAspectRatio] = useState<SceneDocument["aspectRatio"]>("9:16");
  const [expertHandoff, setExpertHandoff] = useState<CozyClayHandoff | null>(null);
  const [expertReferenceFile, setExpertReferenceFile] = useState<File | null>(null);
  const [expertReferenceConsent, setExpertReferenceConsent] = useState(false);
  const [expertIntent, setExpertIntent] = useState("");
  const [expertPromptOverride, setExpertPromptOverride] = useState<{ text: string; basedOn: string } | null>(null);
  const [shotId, setShotId] = useState(scene.shots[0]?.id ?? "");
  const [intent, setIntent] = useState("");
  const [promptOverride, setPromptOverride] = useState<{ text: string; basedOn: string } | null>(null);
  const [model, setModel] = useState<(typeof models)[number]>(REAL_MODEL);
  const [scenario, setScenario] = useState<Scenario>("success");
  const [providerMode, setProviderMode] = useState<ProviderMode>("mock");
  const [readiness, setReadiness] = useState<Readiness>({ state: "disabled", reason: "正在读取服务端状态…" });
  const [realConsent, setRealConsent] = useState(false);
  const [referenceConsent, setReferenceConsent] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const ordersStoreReady = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/image-generation", { cache: "no-store" })
      .then(async (response) => {
        const value = await response.json() as Partial<Readiness>;
        if (active && (value.state === "configured" || value.state === "disabled")) {
          setReadiness({ state: value.state, reason: typeof value.reason === "string" ? value.reason : "服务端未提供状态说明。" });
        }
      })
      .catch(() => { if (active) setReadiness({ state: "disabled", reason: "无法读取服务端状态；已保持 Mock。" }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restored = readSessionOrders(window.sessionStorage) as SessionOrder[];
    queueMicrotask(() => {
      setOrders(restored);
      ordersStoreReady.current = true;
    });
  }, []);

  useEffect(() => {
    if (!ordersStoreReady.current || typeof window === "undefined") return;
    writeSessionOrders(window.sessionStorage, orders);
  }, [orders]);

  useEffect(() => () => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
  }, [referencePreview]);

  const template = studioTemplates.find((item) => item.id === templateId) ?? studioTemplates[0]!;
  const expertTemplate = studioTemplates.find((item) => item.id === expertTemplateId) ?? studioTemplates[0]!;
  const shot = scene.shots.find((item) => item.id === shotId);
  const snapshot = useMemo(() => shot ? createDirectorSnapshot(scene, shot.id, mode, template) : null, [scene, shot, mode, template]);
  const generatedPrompt = useMemo(() => snapshot ? `${template.promptBlocks.join("\n\n")}\n\n${compileImagePrompt(snapshot, intent, "", referenceConsent)}` : "", [snapshot, template, intent, referenceConsent]);
  const expertGeneratedPrompt = useMemo(() => expertHandoff ? compileCozyClayPrompt(expertTemplate, expertHandoff, expertIntent, false) : "", [expertHandoff, expertIntent, expertTemplate]);
  const prompt = promptOverride?.text ?? generatedPrompt;
  const expertPrompt = expertPromptOverride?.text ?? expertGeneratedPrompt;
  const promptOutOfSync = Boolean(promptOverride && promptOverride.basedOn !== generatedPrompt);
  const expertPromptOutOfSync = Boolean(expertPromptOverride && expertPromptOverride.basedOn !== expertGeneratedPrompt);
  const promptEdited = promptOverride !== null;

  const changeScene = (update: (value: SceneDocument) => SceneDocument) => setScene((current) => update(current));
  function applyTemplate(id: StudioTemplate["id"]) {
    const nextTemplate = studioTemplates.find((item) => item.id === id); if (!nextTemplate) return;
    const next = applyStudioTemplate(nextTemplate, scene); setTemplateId(id); setScene(next); setShotId(next.shots[0]?.id ?? "");
  }
  function regeneratePrompt() {
    if (!generatedPrompt) return;
    if (promptEdited && !window.confirm("按当前导演方案重新生成提示词？这会替换你手动编辑的文本。")) return;
    setPromptOverride(null);
  }
  function regenerateExpertPrompt() {
    if (!expertGeneratedPrompt) return;
    if (expertPromptOverride && !window.confirm("按当前 CozyClay 导出演示重新生成提示词？这会替换你手动编辑的文本。")) return;
    setExpertPromptOverride(null);
  }
  function createOpenLuxJob(request: ReturnType<typeof createGenerationRequest>, result: OpenLuxResponse): GenerationJob {
    const now = new Date().toISOString();
    return {
      id: `job-openlux-${crypto.randomUUID()}`,
      kind: "image",
      status: "succeeded",
      createdAt: now,
      updatedAt: now,
      provider: "openlux",
      demo: false,
      request,
      scenario: "success",
      outputs: result.outputs.map((output) => ({
        id: output.id,
        label: "OpenLux 图片结果",
        mediaType: "image/webp",
        demo: false,
        spec: { aspectRatio: request.aspectRatio, format: "webp", width: output.width ?? 1024, height: output.height ?? 1024 },
        url: output.deliveryUrl,
        expiresAt: output.expiresAt,
        ...(output.width ? { width: output.width } : {}),
        ...(output.height ? { height: output.height } : {}),
      })),
      cost: { status: "unknown" },
    };
  }

  async function runMock(request: ReturnType<typeof createGenerationRequest>, selectedScenario: Scenario) {
    const created = await generationAdapter.submit(request, selectedScenario); const running = await generationAdapter.status(created.id); const done = await generationAdapter.status(running.id);
    setJobs((current) => [done, ...current]);
    return done;
  }

  async function runOpenLux(request: ReturnType<typeof createGenerationRequest>, selectedReference: File | null) {
    const payloadBody = selectedReference
      ? (() => {
        const form = new FormData();
        form.set("image", selectedReference, selectedReference.name);
        form.set("model", REAL_MODEL);
        form.set("prompt", request.prompt);
        form.set("n", "1");
        form.set("size", REAL_IMAGE_SIZE);
        form.set("quality", "low");
        form.set("format", "webp");
        form.set("response_format", "url");
        return form;
      })()
      : JSON.stringify({ model: REAL_MODEL, prompt: request.prompt, n: 1, size: REAL_IMAGE_SIZE, quality: "low", format: "webp", response_format: "url" });
    const response = await fetch("/api/image-generation", {
      method: "POST",
      ...(selectedReference ? {} : { headers: { "Content-Type": "application/json" } }),
      body: payloadBody,
    });
    const resultBody = await response.json().catch(() => null) as OpenLuxResponse | { error?: { message?: string } } | null;
    if (!response.ok) throw new Error(resultBody && "error" in resultBody ? resultBody.error?.message ?? "OpenLux 请求失败。" : "OpenLux 请求失败。");
    if (!resultBody || !("outputs" in resultBody) || resultBody.outputs.length === 0) throw new Error("OpenLux 返回了空结果。");
    const done = createOpenLuxJob(request, resultBody);
    setJobs((current) => [done, ...current]);
    return done;
  }

  async function generate() {
    const isExpert = mode === "expert";
    const selectedPrompt = isExpert ? expertPrompt : prompt;
    const selectedReference = isExpert ? expertReferenceFile : referenceFile;
    const selectedConsent = isExpert ? expertReferenceConsent : referenceConsent;
    if (busy || !selectedPrompt.trim() || (isExpert ? !expertHandoff : !shot || !snapshot)) return;
    if (providerMode === "openlux" && readiness.state !== "configured") { setNotice("OpenLux 当前未配置或真实调用开关未开启；已保持 Mock，不会发送请求。"); return; }
    if (providerMode === "openlux" && !realConsent) { setNotice("请先确认本次请求可能产生渠道费用，再启用真实图片调用。"); return; }
    if (providerMode === "openlux" && selectedReference && !selectedConsent) { setNotice("请先确认参考照会发送至 OpenLux，用于本次图片生成。"); return; }
    setBusy(true); setNotice("");
    const orderId = `order-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const activeTemplate = isExpert ? expertTemplate : template;
    const order: SessionOrder = { id: orderId, jobId: "pending", templateId: activeTemplate.id, templateTitle: activeTemplate.title, templateVersion: activeTemplate.version, shotTitle: isExpert ? "CozyClay 导出镜头" : shot!.title, provider: providerMode, mode, status: "processing", createdAt, hasOutput: false };
    setOrders((current) => [order, ...current]);
    try {
      const requestId = `request-${crypto.randomUUID()}`;
      const idempotencyKey = `session-${crypto.randomUUID()}`;
      const selectedModel = providerMode === "openlux" ? REAL_MODEL : model;
      const request = isExpert
        ? createCozyClayGenerationRequest({
          requestId,
          idempotencyKey,
          prompt: selectedPrompt,
          model: selectedModel,
          aspectRatio: expertAspectRatio,
          template: expertTemplate,
          handoff: structuredClone(expertHandoff!),
          referenceConfirmed: providerMode === "openlux" && Boolean(selectedReference && selectedConsent),
        })
        : (() => {
          const base = createGenerationRequest("image", scene, shot!.id);
          return structuredClone({ ...base, requestId, idempotencyKey, prompt: selectedPrompt, model: selectedModel, mode, directorSnapshot: structuredClone(snapshot), referenceConfirmed: providerMode === "openlux" && Boolean(selectedReference && selectedConsent), aspectRatio: scene.aspectRatio, output: { ...base.output, aspectRatio: scene.aspectRatio } });
        })();
      const done = providerMode === "openlux" ? await runOpenLux(request, selectedReference) : await runMock(request, scenario);
      const completedAt = new Date().toISOString();
      setOrders((current) => current.map((item) => item.id === orderId ? { ...item, jobId: done.id, status: done.status === "succeeded" && done.outputs.length > 0 ? "ready" : "failed", completedAt, durationMs: Date.parse(completedAt) - Date.parse(item.createdAt), hasOutput: done.outputs.length > 0, ...(done.outputs[0]?.expiresAt ? { deliveryExpiresAt: done.outputs[0].expiresAt } : {}), failureCode: done.error?.code } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "图片任务未能提交。";
      const completedAt = new Date().toISOString();
      setOrders((current) => current.map((item) => item.id === orderId ? { ...item, status: "failed", completedAt, durationMs: Date.parse(completedAt) - Date.parse(item.createdAt), failureCode: providerMode === "openlux" ? "ROUTE_ERROR" : "MOCK_ERROR" } : item));
      setNotice(`${providerMode === "openlux" ? message : "本地演示任务未能提交。导演台草稿仍保留，请重试。"}`);
    } finally { setBusy(false); }
  }
  async function retry(job: GenerationJob) { const retried = await generationAdapter.retry(job.id); if (retried.status === "queued") await runMock(retried.request, "success"); }
  function updateFeedback(orderId: string, patch: Partial<BetaFeedback>) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, feedback: { ...order.feedback, ...patch } } : order));
  }
  function clearSessionOrders() {
    setOrders([]);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_ORDER_STORAGE_KEY);
    setNotice("已清除本浏览器标签页中的匿名体验订单记录；不会影响已生成的临时图片链接。");
  }
  function selectReferenceFile(file: File | null) {
    if (!file) {
      setReferenceFile(null);
      setReferencePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setNotice("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice("图片不能超过 8MB，请换一张更轻的照片。");
      return;
    }
    setNotice("");
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
    setReferenceConsent(false);
  }
  function resetWorkspace() {
    const next = structuredClone(starterScene);
    setScene(next);
    setShotId(next.shots[0]?.id ?? "");
    setTemplateId("travel");
    setIntent("");
    setPromptOverride(null);
    selectReferenceFile(null);
    setReferenceConsent(false);
    setExpertTemplateId(studioTemplates[0]!.id);
    setExpertAspectRatio("9:16");
    setExpertHandoff(null);
    setExpertReferenceFile(null);
    setExpertReferenceConsent(false);
    setExpertIntent("");
    setExpertPromptOverride(null);
    setNotice("");
  }
  function exportExperimentData() {
    const records: BetaExportRecord[] = orders.map(({ id, createdAt, completedAt, templateId, templateVersion, mode: orderMode, provider, status, durationMs, hasOutput, failureCode, feedback }) => ({
      orderId: id,
      createdAt,
      ...(completedAt ? { completedAt } : {}),
      templateId,
      templateVersion,
      mode: orderMode,
      provider,
      status,
      ...(durationMs !== undefined ? { durationMs } : {}),
      hasOutput,
      ...(failureCode ? { failureCode } : {}),
      ...(feedback ? { feedback } : {}),
    }));
    downloadBetaExport(createBetaExportDocument(records));
    setNotice("匿名实验记录已导出；文件不包含照片、URL、完整提示词或身份信息。");
  }

  return <main className={`studio-shell mode-${mode}`}>
    <a className="skip-link" href={mode === "quick" ? "#quick-title" : "#expert-workspace"}>跳到主要创作区</a>
    <header className="studio-topbar"><a className="studio-brand" href="/studio"><span className="brand-symbol">v</span><span>vibephoto<small>把想象拍成一场旅行</small></span></a><div className="mode-switch" role="group" aria-label="工作模式"><button className={mode === "quick" ? "active" : ""} aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>快速模式</button><button className={mode === "expert" ? "active" : ""} aria-pressed={mode === "expert"} onClick={() => setMode("expert")}>专家模式</button></div><span className="studio-status">{providerMode === "mock" ? "体验模式 · 不产生渠道费用" : readiness.state === "configured" ? "OpenLux 已配置 · 需确认费用" : "OpenLux 未配置 · 已保持 Mock"}</span></header>
    <div hidden={mode !== "quick"}><QuickCreation
      templates={studioTemplates}
      template={template}
      scene={scene}
      shot={shot}
      onTemplateChange={applyTemplate}
      onAspectChange={(aspectRatio) => changeScene((current) => ({ ...current, aspectRatio }))}
      referenceFile={referenceFile}
      referencePreview={referencePreview}
      referenceConsent={referenceConsent}
      onReferenceSelect={selectReferenceFile}
      onRemoveReference={() => selectReferenceFile(null)}
      onReferenceConsentChange={setReferenceConsent}
      intent={intent}
      onIntentChange={setIntent}
      prompt={prompt}
      onPromptChange={(text) => setPromptOverride({ text, basedOn: generatedPrompt })}
      promptEdited={promptEdited}
      promptOutOfSync={promptOutOfSync}
      onRegeneratePrompt={regeneratePrompt}
      providerMode={providerMode}
      readiness={readiness}
      realConsent={realConsent}
      onProviderModeChange={(value) => { setProviderMode(value); if (value === "mock") setRealConsent(false); }}
      onRealConsentChange={setRealConsent}
      jobs={jobs}
      busy={busy}
      notice={notice}
      onGenerate={() => void generate()}
      onEnterExpert={() => setMode("expert")}
      onReset={resetWorkspace}
    /></div><div hidden={mode !== "expert"}><ExpertWorkspace
      templates={studioTemplates}
      template={expertTemplate}
      onTemplateChange={setExpertTemplateId}
      aspectRatio={expertAspectRatio}
      onAspectChange={setExpertAspectRatio}
      handoff={expertHandoff}
      onHandoffChange={setExpertHandoff}
      onImportFrame={(file) => { setExpertReferenceFile(file); setExpertReferenceConsent(false); }}
      onImportAction={(text) => setExpertIntent((current) => current.trim() ? `${current.trim()}\n\n${text}` : text)}
      referenceFile={expertReferenceFile}
      referenceConsent={expertReferenceConsent}
      onReferenceConsentChange={setExpertReferenceConsent}
      intent={expertIntent}
      onIntentChange={setExpertIntent}
      model={model}
      models={models}
      onModelChange={(value) => setModel(value as (typeof models)[number])}
      prompt={expertPrompt}
      promptOutOfSync={expertPromptOutOfSync}
      onPromptChange={(text) => setExpertPromptOverride({ text, basedOn: expertGeneratedPrompt })}
      onRegeneratePrompt={regenerateExpertPrompt}
      providerMode={providerMode}
      readiness={readiness}
      realConsent={realConsent}
      onProviderModeChange={(value) => { setProviderMode(value); if (value === "mock") setRealConsent(false); }}
      onRealConsentChange={setRealConsent}
      scenario={scenario}
      scenarioLabels={scenarioLabels}
       onScenarioChange={setScenario}
      notice={notice}
      busy={busy}
      onGenerate={() => void generate()}
      onReset={resetWorkspace}
      jobs={jobs}
      onRetry={(job) => void retry(job)}
     /></div>
    {orders.length > 0 && <section className="studio-panel order-history active-order-history" aria-labelledby="session-orders-title">
      <div className="panel-heading">
        <div><span className="eyebrow">SESSION ORDERS</span><h2 id="session-orders-title">本次体验订单</h2></div>
        <div className="order-actions">
          <span className="panel-note">仅保存匿名元数据；标签页关闭后清除</span>
          <button type="button" className="button secondary" onClick={exportExperimentData}>导出匿名记录</button>
          <button type="button" className="text-action" onClick={clearSessionOrders}>清除记录</button>
        </div>
      </div>
      {orders.map((order) => <article className="order-row" key={order.id}>
        <div>
          <strong>{order.templateTitle} · {order.shotTitle}</strong>
          <span>体验单 {order.id.slice(-8)} · {order.provider === "openlux" ? "OpenLux 实测" : "Mock 体验"} · {new Date(order.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}{order.durationMs !== undefined ? ` · ${(order.durationMs / 1000).toFixed(1)}s` : ""}{order.deliveryExpiresAt ? ` · 结果有效至 ${new Date(order.deliveryExpiresAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          {order.status === "ready" && <div className="feedback-fields">
            <label>满意度<select aria-label={`${order.templateTitle} 满意度`} value={order.feedback?.satisfaction ?? ""} onChange={(event) => updateFeedback(order.id, { satisfaction: event.target.value ? Number(event.target.value) as BetaFeedback["satisfaction"] : undefined })}><option value="">未评价</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
            <label>愿意发布<select aria-label={`${order.templateTitle} 发布意愿`} value={order.feedback?.publishIntent ?? ""} onChange={(event) => updateFeedback(order.id, { publishIntent: (event.target.value || undefined) as BetaFeedback["publishIntent"] })}><option value="">未选择</option><option value="yes">愿意</option><option value="no">不会</option><option value="revise">修改后再说</option></select></label>
            <label>愿意推荐<select aria-label={`${order.templateTitle} 推荐意愿`} value={order.feedback?.recommendIntent ?? ""} onChange={(event) => updateFeedback(order.id, { recommendIntent: (event.target.value || undefined) as BetaFeedback["recommendIntent"] })}><option value="">未选择</option><option value="yes">愿意</option><option value="no">不会</option></select></label>
            <label className="feedback-note">补充反馈<textarea aria-label={`${order.templateTitle} 补充反馈`} value={order.feedback?.note ?? ""} maxLength={240} onChange={(event) => updateFeedback(order.id, { note: event.target.value })} placeholder="一句话就够" /></label>
          </div>}
        </div>
        <b className={`order-status order-${order.status}`}>{order.status === "processing" ? "处理中" : order.status === "ready" ? "已交付" : "失败，可重试"}</b>
      </article>)}
    </section>}
  </main>;

  /* Previous expert-workspace prototype intentionally retired. The expert route
     above now uses the selected CozyClay director and its explicit handoff flow.
  return <main className={`studio-shell mode-${mode}`}>
    <a className="skip-link" href={mode === "quick" ? "#quick-title" : "#expert-workspace"}>跳到主要创作区</a>
    <header className="studio-topbar"><a className="studio-brand" href="/studio"><span className="brand-symbol">v</span><span>vibephoto<small>把想象拍成一场旅行</small></span></a><div className="mode-switch" role="group" aria-label="工作模式"><button className={mode === "quick" ? "active" : ""} aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>快速模式</button><button className={mode === "expert" ? "active" : ""} aria-pressed={mode === "expert"} onClick={() => setMode("expert")}>专家模式</button></div><span className="studio-status">{providerMode === "mock" ? "体验模式 · 不产生渠道费用" : readiness.state === "configured" ? "OpenLux 已配置 · 需确认费用" : "OpenLux 未配置 · 已保持 Mock"}</span></header>
    {mode === "quick" ? <QuickCreation
      templates={studioTemplates}
      template={template}
      scene={scene}
      shot={shot}
      onTemplateChange={applyTemplate}
      onAspectChange={(aspectRatio) => changeScene((current) => ({ ...current, aspectRatio }))}
      referenceFile={referenceFile}
      referencePreview={referencePreview}
      referenceConsent={referenceConsent}
      onReferenceSelect={selectReferenceFile}
      onRemoveReference={() => selectReferenceFile(null)}
      onReferenceConsentChange={setReferenceConsent}
      intent={intent}
      onIntentChange={setIntent}
      prompt={prompt}
      onPromptChange={setPrompt}
      promptEdited={promptEdited}
      promptOutOfSync={promptOutOfSync}
      onRegeneratePrompt={regeneratePrompt}
      providerMode={providerMode}
      readiness={readiness}
      realConsent={realConsent}
      onProviderModeChange={(value) => { setProviderMode(value); if (value === "mock") setRealConsent(false); }}
      onRealConsentChange={setRealConsent}
      jobs={jobs}
      busy={busy}
      notice={notice}
      onGenerate={() => void generate()}
      onEnterExpert={() => setMode("expert")}
      onReset={resetWorkspace}
    /> : <div id="expert-workspace" className="expert-workspace">
      <CozyClayDirector
        onImportFrame={(file) => selectReferenceFile(file)}
        onImportAction={(text) => setIntent((current) => current.trim() ? `${current.trim()}\n\n${text}` : text)}
      />
      <div className="studio-layout">
      <aside className="rail"><div className="project-card"><span>✳</span><div><strong>旅行写真方案</strong><small>仅保存在当前页面会话</small></div></div><span className="rail-caption">创作流程</span><nav className="rail-nav"><span className="rail-link active">01　场景与镜头</span><span className="rail-link">02　图片创作</span><span className="rail-link">03　任务记录</span></nav><div className="rail-spacer" /><div className="rail-disclaimer"><strong>当前是可交互原型</strong><span>概念场景、基础几何人物与 Mock 任务均不是实景或 AI 成片。</span></div></aside>
      <section className="work-area">
        <div className="project-heading"><div><span className="eyebrow">DIRECTOR STUDIO / {mode.toUpperCase()}</span><h1>{scene.title}</h1><p>{scene.location.label}<span className="concept-tag">概念场景 · 非真实地点还原</span></p></div><button className="button secondary" onClick={resetWorkspace}>重置示例</button></div>
        <div className="stage-grid"><div className="stage-main">
          <section className="viewport-wrap director-viewport-wrap" aria-label="vibephoto基础几何构图辅助">{shot && <SceneViewport sceneId={template.sceneId} document={scene} shotIndex={scene.shots.findIndex((item) => item.id === shot.id)} />}<div className="viewport-shade" /><div className="viewport-top"><label className="scene-select"><strong>vibephoto概念场景</strong><select aria-label="选择vibephoto概念场景" value={template.sceneId} onChange={(event) => { const next = studioTemplates.find((item) => item.sceneId === event.target.value); if (next) applyTemplate(next.id); }}><option value="coast">海岸日落</option><option value="oldtown">旧城街巷</option><option value="alpine">山野绿意</option></select></label><span className="viewport-demo">基础几何构图辅助 · 非 CozyClay 资产 / 非成片</span></div><div className={`frame-guide frame-${scene.aspectRatio.replace(":", "-")}`}><span /><span /></div><div className="viewport-bottom"><span className="location-pill">{scene.location.label}</span><span className="orbit-hint">拖动旋转 · 滚轮缩放</span></div></section>
          <div className="aspect-controls">{(["9:16", "3:4", "16:9"] as const).map((ratio) => <button key={ratio} className={scene.aspectRatio === ratio ? "active" : ""} aria-pressed={scene.aspectRatio === ratio} onClick={() => changeScene((current) => ({ ...current, aspectRatio: ratio }))}>{ratio}</button>)}<span>仅为构图参考，不是最终输出尺寸</span></div>
          <div className="timeline-head"><div><strong>镜头序列</strong><span>{scene.shots.length} 个镜头 · 当前只提交选中镜头</span></div><button onClick={addShot}>＋ 新增镜头</button></div>
          {scene.shots.length ? <div className="shot-strip">{scene.shots.map((item, index) => <button key={item.id} className={`shot-card ${shotId === item.id ? "selected" : ""}`} aria-pressed={shotId === item.id} onClick={() => setShotId(item.id)}><span className={`shot-art shot-art-${index % 3}`}>镜头 {String(index + 1).padStart(2, "0")}</span><span className="shot-info"><strong>{item.title}</strong><small>{item.shotScale} · {item.durationSec}s</small></span></button>)}</div> : <div className="studio-empty"><strong>还没有镜头</strong><span>新增一个镜头，开始布置取景与人物动作。</span><button className="button primary" onClick={addShot}>新增第一个镜头</button></div>}
          {orders.length > 0 && <section className="studio-panel order-history"><div className="panel-heading"><div><span className="eyebrow">SESSION ORDERS</span><h2>本次体验订单</h2></div><div className="order-actions"><span className="panel-note">仅保存匿名元数据；标签页关闭后清除</span><button type="button" className="button secondary" onClick={exportExperimentData}>导出匿名记录</button><button type="button" className="text-action" onClick={clearSessionOrders}>清除记录</button></div></div>{orders.map((order) => <article className="order-row" key={order.id}><div><strong>{order.templateTitle} · {order.shotTitle}</strong><span>体验单 {order.id.slice(-8)} · {order.provider === "openlux" ? "OpenLux 实测" : "Mock 体验"} · {new Date(order.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}{order.durationMs !== undefined ? ` · ${(order.durationMs / 1000).toFixed(1)}s` : ""}{order.deliveryExpiresAt ? ` · 结果有效至 ${new Date(order.deliveryExpiresAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>{order.status === "ready" && <div className="feedback-fields"><label>满意度<select aria-label={`${order.templateTitle} 满意度`} value={order.feedback?.satisfaction ?? ""} onChange={(event) => updateFeedback(order.id, { satisfaction: event.target.value ? Number(event.target.value) as BetaFeedback["satisfaction"] : undefined })}><option value="">未评价</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><label>愿意发布<select aria-label={`${order.templateTitle} 发布意愿`} value={order.feedback?.publishIntent ?? ""} onChange={(event) => updateFeedback(order.id, { publishIntent: (event.target.value || undefined) as BetaFeedback["publishIntent"] })}><option value="">未选择</option><option value="yes">愿意</option><option value="no">不会</option><option value="revise">修改后再说</option></select></label><label>愿意推荐<select aria-label={`${order.templateTitle} 推荐意愿`} value={order.feedback?.recommendIntent ?? ""} onChange={(event) => updateFeedback(order.id, { recommendIntent: (event.target.value || undefined) as BetaFeedback["recommendIntent"] })}><option value="">未选择</option><option value="yes">愿意</option><option value="no">不会</option></select></label><label className="feedback-note">补充反馈<textarea aria-label={`${order.templateTitle} 补充反馈`} value={order.feedback?.note ?? ""} maxLength={240} onChange={(event) => updateFeedback(order.id, { note: event.target.value })} placeholder="一句话就够" /></label></div>}</div><b className={`order-status order-${order.status}`}>{order.status === "processing" ? "处理中" : order.status === "ready" ? "已交付" : "失败，可重试"}</b></article>)}</section>}
          {jobs.length > 0 && <section className="studio-panel job-history"><div className="panel-heading"><div><span className="eyebrow">SESSION ONLY</span><h2>本次会话任务</h2></div><span className="panel-note">刷新页面后不会保留</span></div>{jobs.map((job) => <article className="job-card" key={job.id}><div><strong>{job.status === "succeeded" ? job.demo ? job.outputs.length ? "Mock 演示完成" : "Mock 完成，但没有结果" : job.outputs.length ? "图片已就绪" : "完成，但没有结果" : job.status === "failed" ? job.demo ? "Mock 演示失败" : "图片任务失败" : job.status}</strong><span>{job.provider} · {job.request.model} · {job.request.aspectRatio} · {job.request.shotId}</span></div><details><summary>查看提交时快照</summary><p>{job.request.prompt}</p><pre>{JSON.stringify(job.request.directorSnapshot, null, 2)}</pre></details>{job.error?.retryable && <button className="button secondary" onClick={() => void retry(job)}>重试</button>}{!job.demo && job.outputs.length > 0 && <div className="job-results">{job.outputs.map((output) => { const source = output.url ?? (output.data ? `data:image/${output.spec.format};base64,${output.data}` : ""); const downloadSource = source.includes("?") ? `${source}&download=1` : `${source}?download=1`; return <div className="job-result" key={output.id}>{source && <img src={source} alt="OpenLux 生成结果" />}{source && <a className="button secondary" href={downloadSource} target="_blank" rel="noreferrer" download={`zsm-${output.id}.${output.spec.format}`}>下载临时结果</a>}<small className="result-provenance">{job.provider === "openlux" ? `真实渠道结果 · 临时交付链接，${output.expiresAt ? new Date(output.expiresAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "稍后"} 前有效；服务重启后失效` : "Mock 占位，不是图片成片"}</small></div>; })}</div>}{job.demo && <small>Mock 占位，不是图片成片；没有下载文件。</small>}</article>)}</section>}
        </div>
        <aside className="inspector"><div className="inspector-header"><span><small>DIRECTOR CONTROLS</small><strong>专家导演台</strong></span><span className="step-indicator">{shot ? `镜头 ${scene.shots.findIndex((item) => item.id === shot.id) + 1} / ${scene.shots.length}` : "无镜头"}</span></div><div className="inspector-body">
          {mode === "expert" && <><label className="field"><span>套用模板</span><select className="text-input" value={templateId} onChange={(event) => applyTemplate(event.target.value as StudioTemplate["id"])}>{studioTemplates.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><div className="notice-box"><strong>场景来源与边界</strong><p>{scene.provenance.label}。{scene.provenance.precision}；{scene.provenance.license}。</p><small>目前没有真实地图数据或地点还原。</small></div><div className="divider" /><label className="field"><span>当前人物</span><select className="text-input" value={actorId} onChange={(event) => setActorId(event.target.value)}>{scene.actors.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>{actor ? <>{vectorEditor("人物位置", actor.position, (index, value) => editActor("position", vectorWith(actor.position, index, value)))}<div className="range-control"><div><label htmlFor="actor-yaw">人物朝向</label><output>{actor.rotationY.toFixed(2)} rad</output></div><input id="actor-yaw" type="range" min={-3.14} max={3.14} step={0.05} value={actor.rotationY} onChange={(event) => editActor("rotationY", Number(event.target.value))} /></div><div className="range-control"><div><label htmlFor="actor-height">高度偏移</label><output>{actor.heightOffset.toFixed(1)} m</output></div><input id="actor-height" type="range" min={-0.5} max={1.5} step={0.1} value={actor.heightOffset} onChange={(event) => editActor("heightOffset", Number(event.target.value))} /></div><label className="field"><span>姿势预设</span><select className="text-input" value={actor.pose} onChange={(event) => editActor("pose", event.target.value)}>{[...new Set([...demoPoses, actor.pose])].map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>穿搭预设</span><select className="text-input" value={actor.outfit} onChange={(event) => editActor("outfit", event.target.value)}>{[...new Set([...demoOutfits, actor.outfit])].map((value) => <option key={value}>{value}</option>)}</select></label></> : <div className="studio-empty compact"><span>当前模板没有预设人物。</span><button className="button secondary" onClick={() => changeScene((current) => ({ ...current, actors: structuredClone(starterScene.actors.slice(0, 1)) }))}>添加基础代理人物</button></div>}<div className="divider" /></>}
          {shot ? <><div className="shot-edit-heading"><span>镜头参数</span><div><button className="icon-button" aria-label="镜头上移" onClick={() => changeScene((current) => ({ ...current, shots: moveShot(current.shots, current.shots.findIndex((item) => item.id === shotId), -1) }))}>↑</button><button className="icon-button" aria-label="镜头下移" onClick={() => changeScene((current) => ({ ...current, shots: moveShot(current.shots, current.shots.findIndex((item) => item.id === shotId), 1) }))}>↓</button><button className="icon-button danger" aria-label="删除当前镜头" onClick={removeShot}>×</button></div></div>{field("镜头标题", shot.title, (value) => editShot("title", value))}<div className="two-fields"><label className="field"><span>时长（秒）</span><input className="text-input" type="number" min="1" max="30" value={shot.durationSec} onChange={(event) => editShot("durationSec", Math.max(1, Math.min(30, Number(event.target.value))))} /></label><label className="field"><span>景别</span><select className="text-input" value={shot.shotScale} onChange={(event) => editShot("shotScale", event.target.value)}>{[...new Set(["双人中景", "半身近景", "双人全身", "人物特写", shot.shotScale])].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className="field"><span>机位</span><select className="text-input" value={shot.cameraAngle} onChange={(event) => editShot("cameraAngle", event.target.value)}>{[...new Set(["平视", "略低机位", "略高机位", shot.cameraAngle])].map((value) => <option key={value}>{value}</option>)}</select></label>{field("人物动作", shot.action, (value) => editShot("action", value))}{field("运镜意图", shot.movement, (value) => editShot("movement", value))}{field("光线", shot.lighting, (value) => editShot("lighting", value))}{field("构图说明", shot.composition, (value) => editShot("composition", value, true))}{field("创作备注", shot.notes, (value) => editShot("notes", value, true))}{mode === "expert" && <div className="camera-values">{vectorEditor("摄影机位置", shot.camera.position, (index, value) => editCamera("position", index, value))}{vectorEditor("目标点", shot.camera.target, (index, value) => editCamera("target", index, value))}<div className="range-control"><div><label htmlFor="camera-fov">视野角</label><output>{shot.camera.fov}°</output></div><input id="camera-fov" type="range" min={18} max={90} value={shot.camera.fov} onChange={(event) => editShot("camera", { ...shot.camera, fov: Number(event.target.value) })} /></div></div>}</> : <div className="studio-empty"><strong>尚未选择镜头</strong><button className="button primary" onClick={addShot}>新增镜头</button></div>}
          <div className="divider" /><label className="field"><span>创作意图</span><textarea className="text-input" value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="例如：轻松自然的旅行记录感" /></label><label className="field"><span>图片模型（已提供 ID）</span><select className="text-input" value={providerMode === "openlux" ? REAL_MODEL : model} disabled={providerMode === "openlux"} onChange={(event) => setModel(event.target.value as (typeof models)[number])}>{models.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="reference-picker"><span>{referenceFile ? `已选择：${referenceFile.name}` : "可选：选择一张参考照（仅本地预览）"}</span><label className="button secondary" htmlFor="reference-image">{referenceFile ? "替换" : "选择照片"}</label><input id="reference-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectReferenceFile(event.target.files?.[0] ?? null)} />{referenceFile && <button type="button" className="text-action" onClick={() => selectReferenceFile(null)}>移除</button>}</div>
          {referencePreview && <div className="reference-preview"><img src={referencePreview} alt="本地参考照预览" /><span>不会自动上传；OpenLux 图生图能力尚未确认。</span></div>}
          <div className="provider-switch" role="group" aria-label="生成方式"><button type="button" className={providerMode === "mock" ? "active" : ""} aria-pressed={providerMode === "mock"} onClick={() => { setProviderMode("mock"); setRealConsent(false); }}>Mock 体验</button><button type="button" className={providerMode === "openlux" ? "active" : ""} aria-pressed={providerMode === "openlux"} onClick={() => setProviderMode("openlux")}>OpenLux 实测</button></div>
          {providerMode === "openlux" ? <div className="provider-notice"><strong>{readiness.state === "configured" ? "真实调用已配置，但仍需你的费用确认" : "真实调用当前关闭"}</strong><span>{readiness.reason}</span><small>本次使用已验证参数：sunburst-c · 1024×1024 · low · webp · URL。9:16 目前只是导演构图意图，不代表真实输出尺寸。</small><label className="consent-row"><input type="checkbox" checked={realConsent} onChange={(event) => setRealConsent(event.target.checked)} />我确认本次请求可能产生 OpenLux 渠道费用</label>{referenceFile && <label className="consent-row"><input type="checkbox" checked={referenceConsent} onChange={(event) => setReferenceConsent(event.target.checked)} />我确认将这张参考照发送至 OpenLux，仅用于本次生成</label>}</div> : <label className="field"><span>Mock 演练场景</span><select className="text-input" value={scenario} onChange={(event) => setScenario(event.target.value as (typeof scenarios)[number])}>{scenarios.map((value) => <option key={value} value={value}>{scenarioLabels[value]}</option>)}</select><small className="microcopy">仅影响本地演练，不代表 OpenLux 的真实任务状态。</small></label>}
          <div className="director-basis"><strong>导演台依据</strong><span>场景来源 · 概念场景</span><span>人物 · {scene.actors.map((item) => `${item.pose} / ${item.outfit}`).join("、") || "未设置"}</span><span>镜头 · {shot ? `${shot.title} / ${shot.shotScale} / ${shot.cameraAngle}` : "未选择"}</span><span>画幅 · {scene.aspectRatio}；模板 v{template.version}</span></div>
          <label className="field"><span>最终提示词（提交前可编辑）</span><textarea className="text-input prompt-editor" value={prompt} onChange={(event) => { setPrompt(event.target.value); setPromptEdited(true); }} /></label>{promptOutOfSync && <div className="error-box prompt-warning" role="status">导演方案已变化，提示词与当前方案可能不同。<button className="button secondary" onClick={regeneratePrompt}>按当前镜头重新生成提示词</button></div>}{promptEdited && !promptOutOfSync && <button className="text-action" onClick={regeneratePrompt}>按当前镜头重新生成提示词</button>}
          {notice && <div className="error-box" role="alert">{notice}</div>}<button className="button primary full-button" disabled={busy || !shot || !prompt.trim() || (providerMode === "openlux" && (readiness.state !== "configured" || !realConsent))} onClick={() => void generate()}>{busy ? "正在处理…" : providerMode === "openlux" ? "生成图片 · 可能产生费用" : "创建体验订单 · Mock"}</button><p className="microcopy">{providerMode === "openlux" ? "真实结果会显示为临时渠道 URL；当前未接入支付、云端作品库或长期保存。" : "体验订单只保存在当前页面会话；Mock 不会调用 OpenLux，也不会产生渠道费用。"}</p>
        </div><footer className="inspector-footer">导演视口是构图意图参考，不是深度图或最终生成图片。</footer></aside></div>
      </section>
      </div>
    </div>}
  </main>;
  */
}
