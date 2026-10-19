"use client";

import { useEffect, useRef, useState } from "react";
import { parseDirectorPack } from "@/app/lib/director-pack";
import type { CozyClayHandoff } from "@/app/lib/cozyclay-handoff";
import DirectorAgentPanel from "./director-agent-panel";
import { captureMatchesProject, createCozyClayProject, DIRECTOR_PROJECT_PATH, type PreparedDirectorProject } from "@/app/lib/cozyclay-project";
import type { ScenePlan } from "@/app/lib/director-agent";

// `director=1` keeps the native CozyClay editor chrome. The product build
// adds this flag without changing the upstream source checkout.
const COZYCLAY_URL = "/cozyclay/app/index.html?director=1";
const EXPORT_TIMEOUT_MS = 120_000;

type Props = {
  onImportFrame: (file: File | null, pack: ImportedPack) => void;
  onImportAction: (text: string) => void;
  onHandoffChange: (handoff: CozyClayHandoff | null) => void;
};

type ImportedPack = ReturnType<typeof parseDirectorPack>;

export default function CozyClayDirector({ onImportFrame, onImportAction, onHandoffChange }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pack, setPack] = useState<ImportedPack | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [frameState, setFrameState] = useState<"loading" | "ready" | "error">("loading");
  const [frameKey, setFrameKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prepared, setPrepared] = useState<PreparedDirectorProject | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [executionState, setExecutionState] = useState("");
  const capturePending = useRef(false);
  const captureRequestId = useRef<string | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameUrl = prepared ? `${COZYCLAY_URL}&scene=${encodeURIComponent(DIRECTOR_PROJECT_PATH)}&directorRun=${prepared.executionId}` : COZYCLAY_URL;

  useEffect(() => () => { if (captureTimer.current) clearTimeout(captureTimer.current); }, []);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const value = event.data;
      if (!value || typeof value !== "object") return;
      if (prepared && value.run === prepared.executionId) {
        if (value.type === "qujingbu:director-ready") iframeRef.current?.contentWindow?.postMessage({ type: "qujingbu:director-project", run: prepared.executionId, serialized: prepared.serialized }, location.origin);
        if (value.type === "qujingbu:director-delivered") setExecutionState("原生项目已送入 CozyClay；请等待人物加载后，点击截图核对。尚未验证渲染结果。");
        if (value.type === "qujingbu:director-rejected") { setExecutionState("项目传递失败，未确认应用。可重载重试。"); setError("CozyClay 没有收到本次项目。旧交接仍保留。"); }
      }
      if (value.type !== "cozyclay:capture-framing-result" || !capturePending.current || value.requestId !== captureRequestId.current) return;
      capturePending.current = false;
      if (captureTimer.current) clearTimeout(captureTimer.current);
      setCaptureBusy(false);
      try {
        if (value.error) throw new Error("CozyClay 渲染尚未就绪，请等待人物模型加载后重试。");
        if (prepared && !captureMatchesProject(value.meta, prepared)) throw new Error("截图不属于本次方案（镜头、画幅或人数不匹配），没有替换旧交接。请确认项目已加载。");
        if (typeof value.dataUrl !== "string" || value.dataUrl.length > 24 * 1024 * 1024 || !value.dataUrl.startsWith("data:image/png;base64,")) throw new Error("截图不是有效的 PNG，或超过本地安全限制。");
        const bytes = Uint8Array.from(atob(value.dataUrl.slice(22)), (character) => character.charCodeAt(0));
        if (![137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)) throw new Error("截图 PNG 校验失败。");
        const parsed: ImportedPack = { image: new Blob([bytes], { type: "image/png" }), imageName: "cozyclay-director-frame.png", prompt: null, camera: null, included: ["CozyClay 原生构图截图"] };
        setPack(parsed);
        setPreviewUrl(URL.createObjectURL(parsed.image));
        setError("");
        setNotice("已收到 CozyClay 原生渲染截图，仅本地预览。旧创作交接不变；点击下方导入才替换。");
        setExecutionState(prepared ? "截图元数据已核对：本次镜头、画幅、人数一致。请目视检查人物是否完整、布景是否合理。" : "已获取当前 CozyClay 镜头截图。");
      } catch (caught) { setError(caught instanceof Error ? caught.message : "无法读取截图。"); }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [prepared]);

  function applyPlan(plan: ScenePlan) {
    if (!window.confirm("将在 CozyClay 中打开新方案，并替换它当前的浏览器项目草稿。请先在导演台保存或导出原项目。vibephoto已有提示词、任务和交接不会清空。确认已保存并继续？")) return;
    try {
      const next = createCozyClayProject(plan, crypto.randomUUID());
      setPrepared(next); setFrameKey((current) => current + 1); setFrameState("loading"); setError("");
      setExecutionState("正在传递本地项目，尚未确认 CozyClay 已应用。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "无法创建项目。"); }
  }

  function requestCapture() {
    if (!iframeRef.current?.contentWindow || capturePending.current) return;
    capturePending.current = true; captureRequestId.current = crypto.randomUUID(); setCaptureBusy(true); setError("");
    captureTimer.current = setTimeout(() => { capturePending.current = false; setCaptureBusy(false); setError("截图等待超时，请确认 CozyClay 已加载，再手动重试。"); }, 30_000);
    iframeRef.current.contentWindow.postMessage({ type: "cozyclay:capture-framing", requestId: captureRequestId.current }, location.origin);
  }

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFrameState((current) => current === "loading" ? "error" : current);
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [frameKey]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => {
      setBusy(false);
      setError("导演台导出超时。请确认 CozyClay 已加载并完成镜头，再重试或手动选择 ZIP。" );
    }, EXPORT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  useEffect(() => {
    function receive(event: MessageEvent<unknown>) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object" || !("type" in event.data) || event.data.type !== "cozyclay:export-keyframe-pack-result") return;
      if (!busy) return;
      setBusy(false);
      const result = event.data as { error?: unknown; name?: unknown; bytes?: unknown };
      if (typeof result.error === "string") {
        setError(`CozyClay 导出失败：${result.error.slice(0, 240)}`);
        return;
      }
      if (!(result.bytes instanceof ArrayBuffer)) {
        setError("没有收到有效的关键帧 ZIP 数据。请重试或手动选择导出的 ZIP。" );
        return;
      }
      try {
        const parsed = parseDirectorPack(new Uint8Array(result.bytes));
        const nextUrl = URL.createObjectURL(parsed.image);
        setPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextUrl;
        });
        setPack(parsed);
        onHandoffChange({ source: "cozyclay-user-export", frameImported: false, actionText: parsed.prompt ?? undefined, camera: parsed.camera, included: parsed.included });
        setError("");
        setNotice("关键帧包已在本机解析。尚未导入图片创作，也没有上传。" );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "无法解析关键帧包。" );
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [busy, onHandoffChange]);

  async function readZip(file: File | undefined) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      setError("ZIP 文件不能超过 30 MB。" );
      return;
    }
    try {
      const parsed = parseDirectorPack(new Uint8Array(await file.arrayBuffer()));
      const nextUrl = URL.createObjectURL(parsed.image);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextUrl;
      });
      setPack(parsed);
      onHandoffChange({ source: "cozyclay-user-export", frameImported: false, actionText: parsed.prompt ?? undefined, camera: parsed.camera, included: parsed.included });
      setError("");
      setNotice("关键帧包已在本机解析。尚未导入图片创作，也没有上传。" );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法解析关键帧包。" );
    }
  }

  function requestExport() {
    const target = iframeRef.current?.contentWindow;
    if (!target) {
      setError("CozyClay 尚未加载。请稍候，或直接手动选择 ZIP。" );
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    target.postMessage({ type: "cozyclay:export-keyframe-pack" }, window.location.origin);
  }

  function reloadDirector() {
    setFrameState("loading");
    setError("");
    setNotice("正在重新打开 CozyClay 项目入口…");
    setFrameKey((current) => current + 1);
  }

  return <section className="cozyclay-director" aria-labelledby="cozyclay-title">
    <DirectorAgentPanel busy={busy || captureBusy} onApply={applyPlan} />
    {executionState && <p className="cozyclay-notice" role="status">{executionState}</p>}
    <div className="cozyclay-heading">
      <div><span className="eyebrow">DIRECTOR · COZYCLAY</span><h2 id="cozyclay-title">用 CozyClay 编排真正的场景与镜头</h2><p>在导演台完成场景、人物、摄影机和时间线；再把选定镜头的关键帧带入vibephoto。</p></div>
      <a className="button secondary" href={COZYCLAY_URL} target="_blank" rel="noreferrer">单独打开导演台 ↗</a>
    </div>
    <ol className="cozyclay-steps" aria-label="专家模式工作流">
      <li className={frameState === "loading" || frameState === "error" ? "active" : "complete"}><b>1</b><span><strong>打开项目</strong><small>在 CozyClay 选择已有项目或新建项目</small></span></li>
      <li className={frameState === "ready" && !pack ? "active" : pack ? "complete" : ""}><b>2</b><span><strong>编排镜头</strong><small>调整场景、人物、相机和时间线</small></span></li>
      <li className={pack ? "active" : ""}><b>3</b><span><strong>交接创作</strong><small>导出当前镜头关键帧包，再确认导入</small></span></li>
    </ol>
    <div className="cozyclay-frame-status" role="status"><span className={`status-dot status-${frameState}`} />{frameState === "loading" ? "正在加载 CozyClay…" : frameState === "error" ? "CozyClay 暂时没有响应" : pack ? "已收到构图参考；请检查后导入" : "CozyClay 页面已打开，项目状态以实际画布和截图为准"}<small>只有点击应用并确认后才创建项目；页面加载成功不等于场景已经渲染。</small><button type="button" className="text-action" disabled={busy || captureBusy} onClick={() => { if (prepared && !window.confirm("重新加载会再次打开原始生成方案，覆盖 CozyClay 当前编辑。请先保存项目，确认继续？")) return; reloadDirector(); }}>重新加载 CozyClay</button></div>
    <div className="cozyclay-frame-wrap"><iframe key={frameKey} ref={iframeRef} title="CozyClay 3D 导演台" src={frameUrl} onLoad={() => setFrameState("ready")} onError={() => setFrameState("error")} referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" /></div>
    <button type="button" className="button primary" disabled={captureBusy || busy || frameState !== "ready"} onClick={requestCapture}>{captureBusy ? "等待 CozyClay 截图…" : "获取当前构图截图"}</button>
    <p className="microcopy">灰白模是构图依据，不是最终画风。截图不上传；新项目会由 CozyClay 保存在此浏览器草稿中，请用其项目菜单保存或删除。未导入的新截图仅保留在本页内存。</p>
    <div className="cozyclay-bridge">
      <div className="cozyclay-bridge-copy"><strong>把当前镜头交给图片创作</strong><span>导出只在浏览器本机处理 ZIP。动作文字与关键帧图片分开导入；每一步都由你点击确认。</span></div>
      <button className="button primary" type="button" onClick={requestExport} disabled={busy || captureBusy || frameState !== "ready"}>{busy ? "正在从 CozyClay 导出…" : "导出当前镜头关键帧包"}</button>
      <label className="button secondary cozyclay-upload" htmlFor="cozyclay-pack">或选择已导出的 ZIP</label>
      <input id="cozyclay-pack" type="file" accept=".zip,application/zip" onChange={(event) => { void readZip(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    </div>
    {error && <div className="error-box" role="alert">{error}</div>}
    {notice && <p className="cozyclay-notice" role="status">{notice}</p>}
    {pack && <div className="cozyclay-import-card">
      {previewUrl && <img src={previewUrl} alt="CozyClay 导出的镜头关键帧，仅本地预览" />}
      <div className="cozyclay-import-copy"><strong>关键帧包已就绪 · 本地预览</strong><span>包含：{pack.included.join("、")}</span><small>这是一张导演关键帧，不是 AI 成片。选择导入后仅作为参考图加入草稿；不会自动上传。</small>
        {pack.camera && <small>安全相机摘要：{Object.entries(pack.camera).map(([key, value]) => `${key} ${value}`).join(" · ")}</small>}
        <div className="cozyclay-import-actions"><button type="button" className="button secondary" onClick={() => { const file = new File([pack.image], pack.imageName, { type: "image/png" }); onImportFrame(file, pack); onHandoffChange({ source: "cozyclay-user-export", frameImported: true, frameName: pack.imageName, actionText: pack.prompt ?? undefined, camera: pack.camera, included: pack.included }); setNotice("关键帧仅作为本机参考加入草稿；不会自动上传。" ); }}>导入关键帧到本机草稿</button>
          {pack.prompt && <button type="button" className="button secondary" onClick={() => { onImportAction(pack.prompt!); onHandoffChange({ source: "cozyclay-user-export", frameImported: false, actionText: pack.prompt!, camera: pack.camera, included: pack.included }); setNotice("动作描述已追加到创作意图；它不是完整图片提示词。" ); }}>导入动作描述</button>}
          <button type="button" className="text-action" onClick={() => { setPack(null); setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return null; }); onImportFrame(null, pack); onHandoffChange(null); setNotice("已从本次创作草稿移除 CozyClay 交接；不影响 CozyClay 项目。" ); }}>移除本机交接</button>
        </div>
      </div>
    </div>}
    <p className="cozyclay-boundary">如果 CozyClay 显示项目选择页，请先点选 Samples、Blank Stage 或 City Block，再在画布内完成镜头。镜头包只提取 first.png、prompt.txt 和 camera.json 安全摘要；关键帧只在你点击“导入”后进入本次草稿。</p>
  </section>;
}
