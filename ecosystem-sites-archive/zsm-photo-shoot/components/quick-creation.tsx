"use client";
/* eslint-disable @next/next/no-img-element -- local previews and provider results are runtime media. */

import type { ChangeEvent } from "react";
import type { GenerationJob, SceneDocument } from "@/app/lib/contracts";
import type { StudioTemplate } from "@/app/lib/templates";

type ProviderMode = "mock" | "openlux";
type Readiness = { state: "disabled" | "configured"; reason: string };

export type QuickCreationProps = {
  templates: StudioTemplate[];
  template: StudioTemplate;
  scene: SceneDocument;
  shot?: SceneDocument["shots"][number];
  onTemplateChange: (id: StudioTemplate["id"]) => void;
  onAspectChange: (aspectRatio: SceneDocument["aspectRatio"]) => void;
  referenceFile: File | null;
  referencePreview: string | null;
  referenceConsent: boolean;
  onReferenceSelect: (file: File | null) => void;
  onRemoveReference: () => void;
  onReferenceConsentChange: (value: boolean) => void;
  intent: string;
  onIntentChange: (value: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  promptEdited: boolean;
  promptOutOfSync: boolean;
  onRegeneratePrompt: () => void;
  providerMode: ProviderMode;
  readiness: Readiness;
  realConsent: boolean;
  onProviderModeChange: (value: ProviderMode) => void;
  onRealConsentChange: (value: boolean) => void;
  jobs: GenerationJob[];
  busy: boolean;
  notice: string;
  onGenerate: () => void;
  onEnterExpert: () => void;
  onReset: () => void;
};

function resultSource(job: GenerationJob | undefined): { src: string; width: number; height: number } | null {
  const output = job?.outputs.find((item) => item.url || item.data);
  if (!output) return null;
  return {
    src: output.url ?? `data:image/${output.spec.format};base64,${output.data}`,
    width: output.width ?? output.spec.width,
    height: output.height ?? output.spec.height,
  };
}

function jobLabel(job: GenerationJob | undefined): string {
  if (!job) return "完成设置后，结果会显示在这里";
  if (job.demo) {
    if (job.status === "succeeded") return job.outputs.length ? "演示流程已完成" : "演示已完成，但没有图片结果";
    if (job.status === "failed") return "演示任务失败";
  }
  if (job.status === "succeeded") return job.outputs.length ? "图片已就绪" : "任务完成，但没有图片结果";
  if (job.status === "failed") return "图片任务失败";
  if (job.status === "canceled") return "任务已停止";
  if (job.status === "queued") return "任务已提交，等待处理";
  return "正在处理你的图片";
}

export default function QuickCreation({
  templates,
  template,
  scene,
  shot,
  onTemplateChange,
  onAspectChange,
  referenceFile,
  referencePreview,
  referenceConsent,
  onReferenceSelect,
  onRemoveReference,
  onReferenceConsentChange,
  intent,
  onIntentChange,
  prompt,
  onPromptChange,
  promptEdited,
  promptOutOfSync,
  onRegeneratePrompt,
  providerMode,
  readiness,
  realConsent,
  onProviderModeChange,
  onRealConsentChange,
  jobs,
  busy,
  notice,
  onGenerate,
  onEnterExpert,
  onReset,
}: QuickCreationProps) {
  const latestJob = jobs[0];
  const delivered = latestJob?.demo ? null : resultSource(latestJob);
  const isRealReady = providerMode === "openlux" && readiness.state === "configured" && realConsent;
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => onReferenceSelect(event.target.files?.[0] ?? null);

  return (
    <section className="quick-shell" aria-labelledby="quick-title">
      <div className="quick-page">
        <header className="quick-heading">
          <div className="quick-kicker"><span className="quick-kicker-dot" aria-hidden="true" />旅行写真工作室 <span>·</span> 从一张照片开始</div>
          <h1 id="quick-title">把想去的地方，<br className="quick-title-break" />变成照片里的此刻。</h1>
          <p>选一种影像气质，放入你的照片，再决定画面比例。普通创作只需这三步。</p>
          <ol className="quick-proof" aria-label="创作步骤">
            <li><b>01</b><span>选风格</span></li><li aria-hidden="true">/</li>
            <li><b>02</b><span>加照片</span></li><li aria-hidden="true">/</li>
            <li><b>03</b><span>看结果</span></li>
          </ol>
        </header>

        <div className="quick-layout">
          <main className="quick-main">
            <section className="quick-choice" aria-labelledby="look-title">
              <div className="quick-section-head">
                <div><span className="eyebrow">01 · CHOOSE A LOOK</span><h2 id="look-title">你想把这张照片带去哪里？</h2></div>
                <button className="text-action" type="button" onClick={onReset}>重新开始</button>
              </div>
              <div className="template-grid" role="group" aria-label="选择写真风格">
                {templates.map((item, index) => (
                  <button
                    key={item.id}
                    className={`template-card template-${item.id} ${template.id === item.id ? "selected" : ""}`}
                    aria-pressed={template.id === item.id}
                    onClick={() => onTemplateChange(item.id)}
                    type="button"
                  >
                    <span className="template-art">
                      <img src={item.coverImage} alt={item.coverAlt} width={768} height={1365} loading="lazy" />
                      <span className="template-art-overlay" />
                      <i>{item.category}</i><b>{item.title}</b><small>{item.aspectRatio} · 风格参考</small>
                      {template.id === item.id && <span className="template-selected-mark" aria-label="已选择">✓</span>}
                    </span>
                    <span className="template-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                    <span className="sr-only">风格选项 {index + 1}</span>
                  </button>
                ))}
              </div>
              <div className="quick-selected-brief" aria-live="polite">
                <span className="quick-selected-mark" aria-hidden="true">✳</span>
                <div><strong>{template.title}</strong><span>{scene.location.label} · 概念场景 · {scene.aspectRatio}</span></div>
                <span className="quick-selected-note">已为你配好主镜头</span>
              </div>
            </section>

            <section className="quick-result-card" aria-labelledby="result-title" aria-live="polite">
              <div className="quick-result-heading">
                <div><span className="eyebrow">YOUR RESULT</span><h2 id="result-title">{jobLabel(latestJob)}</h2></div>
                <span className={`mock-chip ${latestJob?.demo ? "mock-chip-demo" : ""}`}>{latestJob ? latestJob.demo ? "Mock 演示" : latestJob.provider === "openlux" ? "OpenLux 结果" : "任务状态" : "结果预览"}</span>
              </div>
              {delivered ? (
                <div className="quick-delivered-result"><img src={delivered.src} alt="图片生成结果预览" width={delivered.width} height={delivered.height} /><p>{latestJob?.request.model} · {latestJob?.request.aspectRatio} · 真实渠道返回</p></div>
              ) : (
                <div className={`quick-result-empty ${latestJob?.demo ? "is-demo" : ""}`}>
                  <span className="quick-result-orbit" aria-hidden="true">{latestJob?.status === "failed" ? "!" : latestJob?.status === "succeeded" ? "✓" : "✦"}</span>
                  <strong>{latestJob?.demo ? latestJob.status === "succeeded" ? "这是流程演示，不是生成图片" : jobLabel(latestJob) : "你的图片会出现在这里"}</strong>
                  <small>{latestJob?.demo ? "Mock 只演示任务状态，不生成或提供下载图片。" : latestJob?.error?.message ?? "当前不会把风格样片或构图草图伪装成你的成片。"}</small>
                </div>
              )}
            </section>
          </main>

          <aside className="quick-panel" aria-label="照片与生成设置">
            <div className="quick-panel-label"><span className="eyebrow">02 · YOUR PHOTO</span><span className="mock-chip">{providerMode === "mock" ? "仅本地演示" : "OpenLux"}</span></div>
            <h2 className="quick-panel-title">放入一张你的照片</h2>
            <p className="quick-panel-intro">清晰、光线自然、人物完整的照片，通常更适合作为创作参考。</p>

            <div className={`quick-photo-picker ${referencePreview ? "has-photo" : ""}`}>
              {referencePreview ? <img className="quick-photo-preview" src={referencePreview} alt="你的照片，本地预览" width={600} height={800} /> : <div className="quick-photo-empty"><span aria-hidden="true">＋</span><strong>添加一张照片</strong><small>JPG、PNG 或 WebP，最大 8MB</small></div>}
              <label className="button secondary quick-photo-button" htmlFor="quick-reference-image">{referenceFile ? "替换照片" : "选择照片"}</label>
              <input id="quick-reference-image" name="reference-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} aria-label="选择一张本地参考照片" />
            </div>
            {referenceFile && <div className="quick-file-row"><span title={referenceFile.name}>{referenceFile.name}</span><button type="button" className="text-action" onClick={onRemoveReference}>移除</button></div>}
            <p className="quick-privacy-note">选择照片只在此设备本地预览，不会自动上传。当前演示模式不会发送照片。</p>

            <div className="quick-divider" />
            <div className="quick-panel-label quick-ratio-label"><span className="eyebrow">03 · FRAME</span></div>
            <h3 className="quick-control-title">选择你准备发布的比例</h3>
            <div className="quick-ratio-grid" role="group" aria-label="选择图片画幅">
              {(["9:16", "3:4", "16:9"] as const).map((ratio) => <button key={ratio} type="button" className={scene.aspectRatio === ratio ? "active" : ""} aria-pressed={scene.aspectRatio === ratio} onClick={() => onAspectChange(ratio)}><b>{ratio}</b><small>{ratio === "9:16" ? "竖屏" : ratio === "3:4" ? "人像" : "横版"}</small></button>)}
            </div>

            <label className="field quick-intent"><span>想要的感觉 <em>可选</em></span><textarea className="text-input" value={intent} onChange={(event) => onIntentChange(event.target.value)} placeholder="例如：自然松弛，像旅途中被朋友抓拍" rows={2} /></label>

            <details className="quick-advanced"><summary>高级：查看或编辑提示词</summary><p>提示词由当前模板、场景、镜头和画幅整理而来。</p><textarea className="text-input" value={prompt} onChange={(event) => onPromptChange(event.target.value)} rows={6} aria-label="最终图片生成提示词" />{promptOutOfSync && <div className="error-box" role="status">导演方案有变化，提示词可能未同步。<button type="button" className="text-action" onClick={onRegeneratePrompt}>按当前方案更新</button></div>}{promptEdited && !promptOutOfSync && <button type="button" className="text-action" onClick={onRegeneratePrompt}>恢复当前方案提示词</button>}</details>

            <div className="quick-provider-tabs" role="group" aria-label="选择生成方式"><button type="button" className={providerMode === "mock" ? "active" : ""} aria-pressed={providerMode === "mock"} onClick={() => onProviderModeChange("mock")}>流程演示</button><button type="button" className={providerMode === "openlux" ? "active" : ""} aria-pressed={providerMode === "openlux"} onClick={() => onProviderModeChange("openlux")}>真实生成</button></div>
            <div className="quick-generation-state"><div><span className={`status-dot ${providerMode === "mock" ? "status-mock" : readiness.state === "configured" ? "status-ready" : "status-off"}`} aria-hidden="true" /><strong>{providerMode === "mock" ? "Mock 流程演示" : readiness.state === "configured" ? "OpenLux 已配置" : "真实生成暂不可用"}</strong></div><small>{providerMode === "mock" ? "只演示任务状态，不生成真实图片，也不会产生渠道费用。" : readiness.reason}</small></div>
            {providerMode === "openlux" && <><label className="consent-row quick-consent"><input type="checkbox" checked={realConsent} onChange={(event) => onRealConsentChange(event.target.checked)} />我确认本次请求可能产生渠道费用</label>{referenceFile && <label className="consent-row quick-consent"><input type="checkbox" checked={referenceConsent} onChange={(event) => onReferenceConsentChange(event.target.checked)} />我同意将参考照片发送至 OpenLux 用于本次生成</label>}</>}
            {notice && <div className="error-box quick-notice" role="alert">{notice}</div>}
            <button type="button" className="button primary quick-generate" disabled={busy || !shot || !prompt.trim() || (providerMode === "openlux" && !isRealReady)} onClick={onGenerate}>{busy ? "正在处理…" : providerMode === "openlux" ? "生成图片" : "体验创作流程"}</button>
            <p className="quick-cost">{providerMode === "mock" ? "当前为 Mock，不会调用 OpenLux。" : "费用以渠道实际计费为准；当前未接入支付或长期作品库。"}</p>
            <button className="expert-link" type="button" onClick={onEnterExpert}><span>需要更精细的控制？进入专家导演台 →</span>在那里调整人物、摄影机、镜头顺序与构图。</button>
          </aside>
        </div>
        <p className="quick-footnote">场景是程序生成的概念氛围，不代表真实地点还原。请确认照片中人物、素材及公开发布所需授权。</p>
      </div>
    </section>
  );
}
