"use client";

import CozyClayDirector from "./cozyclay-director";
import type { GenerationJob, SceneDocument } from "@/app/lib/contracts";
import type { CozyClayHandoff } from "@/app/lib/cozyclay-handoff";
import type { StudioTemplate } from "@/app/lib/templates";

type ProviderMode = "mock" | "openlux";
type Readiness = { state: "disabled" | "configured"; reason: string };
type Scenario = "success" | "failed" | "no-result" | "timeout" | "unavailable";

type Props = {
  templates: StudioTemplate[];
  template: StudioTemplate;
  onTemplateChange: (id: StudioTemplate["id"]) => void;
  aspectRatio: SceneDocument["aspectRatio"];
  onAspectChange: (ratio: SceneDocument["aspectRatio"]) => void;
  handoff: CozyClayHandoff | null;
  onHandoffChange: (handoff: CozyClayHandoff | null) => void;
  onImportFrame: (file: File | null) => void;
  onImportAction: (text: string) => void;
  referenceFile: File | null;
  referenceConsent: boolean;
  onReferenceConsentChange: (value: boolean) => void;
  intent: string;
  onIntentChange: (value: string) => void;
  model: string;
  models: readonly string[];
  onModelChange: (value: string) => void;
  prompt: string;
  promptOutOfSync: boolean;
  onPromptChange: (value: string) => void;
  onRegeneratePrompt: () => void;
  providerMode: ProviderMode;
  readiness: Readiness;
  realConsent: boolean;
  onProviderModeChange: (value: ProviderMode) => void;
  onRealConsentChange: (value: boolean) => void;
  scenario: Scenario;
  scenarioLabels: Record<Scenario, string>;
  onScenarioChange: (value: Scenario) => void;
  notice: string;
  busy: boolean;
  onGenerate: () => void;
  onReset: () => void;
  jobs: GenerationJob[];
  onRetry: (job: GenerationJob) => void;
};

const RATIOS = ["9:16", "3:4", "16:9"] as const;

export default function ExpertWorkspace(props: Props) {
  const {
    templates, template, onTemplateChange, aspectRatio, onAspectChange,
    handoff, onHandoffChange, onImportFrame, onImportAction, referenceFile, referenceConsent,
    onReferenceConsentChange, intent, onIntentChange, model, models, onModelChange,
    prompt, promptOutOfSync, onPromptChange, onRegeneratePrompt, providerMode,
    readiness, realConsent, onProviderModeChange, onRealConsentChange, scenario,
    scenarioLabels, onScenarioChange, notice, busy, onGenerate, onReset, jobs, onRetry,
  } = props;

  function handleFrameImport(file: File | null) {
    onImportFrame(file);
    onReferenceConsentChange(false);
  }

  return <div className="expert-workspace expert-workspace-redone" id="expert-workspace">
    <header className="expert-redo-heading">
      <div>
        <span className="eyebrow">EXPERT MODE / COZYCLAY DIRECTOR</span>
        <h1>先在导演台完成创作，再把方案交给图片生成</h1>
        <p>专家模式直接使用你选定的 CozyClay。vibephoto不再用另一套灰模替代导演台；只有你主动导出的内容才会进入图片方案。</p>
      </div>
      <button type="button" className="button secondary" onClick={onReset}>重置本次方案</button>
    </header>

    <CozyClayDirector
      onImportFrame={(file) => handleFrameImport(file)}
      onHandoffChange={onHandoffChange}
      onImportAction={onImportAction}
    />

    <div className="expert-redo-grid">
      <section className="expert-redo-panel" aria-labelledby="expert-prompt-title">
        <div className="expert-section-heading">
          <div><span className="eyebrow">STYLE & PROMPT</span><h2 id="expert-prompt-title">把导演方案交给图片模型</h2></div>
          <span className="mock-badge">导演台与生成稿分开</span>
        </div>

        <label className="field"><span>图片风格模板（仅文字参考）</span>
          <select className="text-input" value={template.id} onChange={(event) => onTemplateChange(event.target.value as StudioTemplate["id"])}>
            {templates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <small className="microcopy">模板不会创建 CozyClay 场景、人物、资产或镜头，只提供风格文字。</small>
        </label>
        <div className="expert-style-card"><strong>{template.title}</strong><span>{template.description}</span><small>模板版本 {template.version} · {template.source} · {template.license}</small></div>

        <fieldset className="expert-ratio-picker"><legend>图片画幅意图</legend>
          <div>{RATIOS.map((ratio) => <button type="button" key={ratio} className={aspectRatio === ratio ? "active" : ""} aria-pressed={aspectRatio === ratio} onClick={() => onAspectChange(ratio)}>{ratio}</button>)}</div>
          <small>这是最终图片的构图意图；不代表 CozyClay 相机画幅或渠道已支持的输出尺寸。</small>
        </fieldset>

        <div className="expert-handoff-summary" aria-live="polite">
          <strong>本次导演台交接</strong>
          {handoff ? <>
            <span>来源：用户主动导出的 CozyClay 素材包</span>
            <span>关键帧：{handoff.frameImported ? `已在本机选择 ${referenceFile?.name ?? handoff.frameName ?? "关键帧"}` : "尚未加入图片请求"}</span>
            <span>动作文字：{handoff.actionText ? "已导入" : "未提供"} · 相机摘要：{handoff.camera ? "已导入安全摘要" : "未提供"}</span>
            <small>完整 3D 场景、人物模型和镜头轨迹未同步。来源许可状态未知。</small>
          </> : <>
            <span>尚无导出交接。先在上方 CozyClay 中完成导演工作，再导出当前镜头关键帧 ZIP。</span>
            <small>也可以继续打开 CozyClay 单独操作；本页不会读取它未明确导出的项目数据。</small>
          </>}
        </div>

        {handoff?.frameImported && <div className="expert-reference-row">
          <span>本地构图参考：{referenceFile?.name ?? handoff.frameName ?? "CozyClay 关键帧"}</span>
          <label className="consent-row"><input type="checkbox" checked={referenceConsent} disabled={providerMode !== "openlux"} onChange={(event) => onReferenceConsentChange(event.target.checked)} />我确认本次真实生成可将此关键帧发送到 OpenLux</label>
          <button type="button" className="text-action" onClick={() => handleFrameImport(null)}>移除本地关键帧</button>
          <small>选择或预览不会上传；Mock 任务永远不会发送此图片。</small>
        </div>}
        <label className="field"><span>补充创作意图</span><textarea className="text-input" value={intent} onChange={(event) => onIntentChange(event.target.value)} placeholder="描述希望强化的情绪、色彩或成片质感" /></label>
        <label className="field"><span>最终图片提示词（提交前可编辑）</span><textarea className="text-input prompt-editor" value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder={handoff ? "正在根据 CozyClay 导出信息编译提示词…" : "导入 CozyClay 导演交接后生成；也可先在此起草"} /></label>
        {promptOutOfSync && <div className="error-box prompt-warning" role="status">导演方案或模板已变化，当前提示词仍保留你的编辑，可能与最新方案不同。<button type="button" className="button secondary" onClick={onRegeneratePrompt}>按当前交接重新生成提示词</button></div>}
        <button type="button" className="text-action" onClick={onRegeneratePrompt}>按当前 CozyClay 交接重新生成提示词</button>
        <label className="field"><span>图片模型 ID</span><select className="text-input" value={model} disabled={providerMode === "openlux"} onChange={(event) => onModelChange(event.target.value)}>{models.map((id) => <option key={id} value={id}>{id}</option>)}</select><small className="microcopy">模型 ID 来自用户提供列表；各模型能力未在本阶段逐一确认。</small></label>
      </section>

      <aside className="expert-redo-panel expert-run-panel" aria-label="任务提交和结果">
        <div className="expert-section-heading"><div><span className="eyebrow">RUN & REVIEW</span><h2>提交与结果</h2></div></div>
        <div className="provider-switch" role="group" aria-label="生成服务模式">
          <button type="button" className={providerMode === "mock" ? "active" : ""} aria-pressed={providerMode === "mock"} onClick={() => onProviderModeChange("mock")}>Mock 演练</button>
          <button type="button" className={providerMode === "openlux" ? "active" : ""} aria-pressed={providerMode === "openlux"} onClick={() => onProviderModeChange("openlux")}>OpenLux</button>
        </div>
        {providerMode === "mock" ? <label className="field"><span>Mock 演练结果</span>
          <select className="text-input" value={scenario} onChange={(event) => onScenarioChange(event.target.value as Scenario)}>{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <small className="microcopy">明确的本地演示，不会调用 OpenLux、不会生成图片，也不会产生渠道费用。</small>
        </label> : <div className="provider-notice"><strong>{readiness.state === "configured" ? "服务端状态已配置" : "真实 OpenLux 调用当前关闭"}</strong><span>{readiness.reason}</span><small>价格尚未接入；费用以渠道实际计费为准。模型与输出能力以已验证配置为限。</small>
          <label className="consent-row"><input type="checkbox" checked={realConsent} onChange={(event) => onRealConsentChange(event.target.checked)} />我确认本次真实请求可能产生渠道费用</label>
        </div>}
        <div className="expert-request-receipt"><strong>提交前检查</strong><span>导演来源：{handoff ? "CozyClay 用户导出交接" : "尚未导入"}</span><span>关键帧：{handoff?.frameImported ? "本地已导入" : "无"}</span><span>画幅意图：{aspectRatio}</span><span>任务范围：一次只提交当前方案，不批量处理</span></div>
        {notice && <div className="error-box" role="alert">{notice}</div>}
        <button type="button" className="button primary full-button" disabled={busy || !handoff || !prompt.trim() || (providerMode === "openlux" && (readiness.state !== "configured" || !realConsent || Boolean(handoff?.frameImported && !referenceConsent)))} onClick={onGenerate}>
          {busy ? "正在处理…" : providerMode === "mock" ? "演练图片任务 · Mock" : "提交 OpenLux 图片请求"}
        </button>
        <p className="microcopy">任务快照只保存在当前页面会话。Mock 没有图片文件或下载结果。</p>
      </aside>
    </div>

    <section className="expert-redo-history" aria-labelledby="expert-history-title">
      <div className="expert-section-heading"><div><span className="eyebrow">CURRENT SESSION</span><h2 id="expert-history-title">本次会话任务</h2></div><span className="microcopy">离开或刷新页面后不会保留</span></div>
      {jobs.length === 0 ? <div className="expert-history-empty"><strong>还没有任务</strong><span>完成 CozyClay 导出交接并提交一次 Mock 演练后，任务快照会显示在这里。</span></div> : jobs.map((job) => <article className="expert-job-card" key={job.id}>
        <div className="expert-job-heading"><div><strong>{job.demo ? job.status === "succeeded" ? job.outputs.length ? "Mock 演示完成（无成片）" : "Mock 完成但无结果" : "Mock 演示失败" : job.status === "succeeded" ? "图片任务完成" : job.status}</strong><span>{job.provider} · {job.request.model} · {job.request.aspectRatio} · {job.createdAt}</span></div>{job.error?.retryable && <button type="button" className="button secondary" onClick={() => onRetry(job)}>重试</button>}</div>
        <details><summary>查看不可变提交快照</summary><p>{job.request.prompt}</p><pre>{JSON.stringify(job.request.directorSnapshot, null, 2)}</pre></details>
        {job.demo && <small className="microcopy">这是状态演练占位，不是 AI 图片，不提供下载。</small>}
        {!job.demo && job.outputs.length > 0 && <div className="job-results">{job.outputs.map((output) => {
          const source = output.url ?? (output.data ? `data:image/${output.spec.format};base64,${output.data}` : "");
          return <div className="job-result" key={output.id}>{source && <img src={source} alt="真实图片生成结果" />}<a className="button secondary" href={source} target="_blank" rel="noreferrer" download={`zsm-${output.id}.${output.spec.format}`}>打开或下载结果</a><small>OpenLux 临时交付 · {output.spec.width}×{output.spec.height} · {output.spec.format}</small></div>;
        })}</div>}
      </article>)}
    </section>
  </div>;
}
