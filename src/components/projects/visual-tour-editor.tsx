"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Undo2, Camera, Check, Copy, Eye, EyeOff, FolderOpen, GripVertical, Layers, Monitor, Play, Plus, Save, Settings2, Smartphone, Tablet, RotateCw, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceLink, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import { DEFAULT_APPEARANCE, tourCameraSchema, visualWebsiteDraftSchema, visualWebsiteSchema, visualWebsiteSaveSchema, isSelfContainedVisualModel, type VisualTour, type VisualWebsite, type VisualWebsiteState, type TourCamera } from "@/contracts/visual-website";
import type { ResumeWebsiteInput } from "@/contracts/resume-website";
import { createVisualTour, profileFromTour, prepareVisualDocument } from "@/lib/projects/visual-tour";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import { exportVisualWebsite } from "@/lib/projects/visual-website-assets";
import styles from "./visual-tour-editor.module.css";
import { VisualStickerLibrary } from "./visual-sticker-library";
import { presetSticker } from "@/contracts/visual-stickers";
import { VisualModelGeneration } from "./visual-model-generation";
import { VisualWebsitePublication } from "./visual-website-publication";
import type { ModelAssetRef } from "@/contracts/visual-generation";
const FIELD_LIMITS: Record<string, number> = { byline: 80, issue: 40, location: 100, title: 100, eyebrow: 100, loadingTitle: 100, loadingSubtitle: 200, stickerText: 24, heroBody: 3000, body: 2000, email: 254, url: 500 };
type Selection = "global" | "loading" | "hero" | {
    node: string;
} | {
    section: string;
};
const emptyProfile = (language: "zh" | "en"): ResumeWebsiteInput => ({ fullName: "", headline: "", about: "", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [], style: "editorial", accent: "emerald", language });
function fileDownload(content: string, name: string) { const url = URL.createObjectURL(new Blob([content], { type: name.endsWith("html") ? "text/html;charset=utf-8" : "application/json;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function VisualTourEditor({ initial, onReturn }: {
    initial?: VisualWebsiteState;
    onReturn?: () => void;
}) {
    const t = useTranslations("visualWebsite.tour"), old = useTranslations("visualWebsite"), locale = useLocale(), actor = useMarketActorId(), request = useMarketRequest(), { register } = useWorkspaceNavigation();
    const [document, setDocument] = useState<VisualWebsite>(() => { const existing = initial?.versions[0]?.document; const profile = existing?.profile ?? emptyProfile(locale.startsWith("zh") ? "zh" : "en"); return existing ? prepareVisualDocument(existing) : { format: "ans-visual-website", version: 1, profile, appearance: { ...DEFAULT_APPEARANCE, tour: createVisualTour(profile) } }; });
    const tour = document.appearance.tour!;
    const [modelUrl, setModelUrl] = useState<string | undefined>();
    useEffect(() => {
        let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
        async function refresh(){
            const asset=tour.modelAsset;
            if(!asset){setModelUrl(undefined);return;}
            try{const access=await request<{url:string}>(`/api/visual-model-assets/${asset.id}`,"GET",undefined);
                if(!cancelled){setModelUrl(new URL(access.url,window.location.origin).href);timer=setTimeout(refresh,40*60*1000);}
            }catch{if(!cancelled){setModelUrl(undefined);setNotice(old("exportFailed"));}}
        }
        void refresh();return()=>{cancelled=true;clearTimeout(timer);};
        // The enclosing account boundary cancels requests when the actor changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[tour.modelAsset?.id, actor]);
    const [undoDocument, setUndoDocument] = useState<VisualWebsite | null>(null), [sceneReady, setSceneReady] = useState(false), [exporting, setExporting] = useState(false), [invalidField, setInvalidField] = useState("");
    const [sceneFailed, setSceneFailed] = useState(false), [previewRevision, setPreviewRevision] = useState(0);
    const exportLock = useRef(false);
    const undoRevision = useRef(-1);
    const revision = useRef(0), cameraSequence = useRef(0), cameraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const liveCamera = useRef<{
        stop: number;
        camera: TourCamera;
    } | null>(null);
    const cancelCapture = useCallback(() => { pendingCamera.current = null; if (cameraTimer.current)
        clearTimeout(cameraTimer.current); cameraTimer.current = null; }, []);
    const updateDocument = useCallback((update: VisualWebsite | ((previous: VisualWebsite) => VisualWebsite)) => {
        ++revision.current;
        if (undoRevision.current !== revision.current) setUndoDocument(null);
        cancelCapture();
        setReview(false);
        setInvalidField("");
        setNotice("");
        setDocument(update);
    }, [cancelCapture]);
    function rememberUndo() { undoRevision.current = revision.current + 1; setUndoDocument(document); }
    function replaceDocument(next: VisualWebsite) { rememberUndo(); liveCamera.current = null; setThumbnails({}); setSelectedSticker(""); setPlacing(false); choose("hero"); updateDocument(prepareVisualDocument(next)); }
    function undoReplacement() { if (!undoDocument)
        return; const previous = undoDocument; rememberUndo(); liveCamera.current = null; setThumbnails({}); setSelectedSticker(""); setPlacing(false); choose("hero"); updateDocument(previous); }
    const [stickerPreset,setStickerPreset] = useState<string | undefined>();
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({}), [stage, setStage] = useState(0), [selection, setSelection] = useState<Selection>("hero"), [tab, setTab] = useState("content"), [device, setDevice] = useState("desktop"), [previewing, setPreviewing] = useState(false), [delivery, setDelivery] = useState(false), [review, setReview] = useState(false), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [placing, setPlacing] = useState(false), [selectedSticker, setSelectedSticker] = useState(""), [stickerText, setStickerText] = useState("✦"), [stickerColor, setStickerColor] = useState("#cafa2a"), [state, setState] = useState(initial), [selectedVersion, setSelectedVersion] = useState(initial?.currentVersion ?? 0);
    const inspector = useRef<HTMLElement>(null), frame = useRef<HTMLIFrameElement>(null), importRef = useRef<HTMLInputElement>(null), modelRef = useRef<HTMLInputElement>(null), projectId = useRef(initial?.projectId ?? ""), alive = useRef(true), pendingCamera = useRef<((camera: TourCamera, thumbnail: string) => void) | null>(null), dragId = useRef<string | null>(null), lock = useRef(false);
    const nodeIndex = typeof selection === "object" && "node" in selection ? tour.nodes.findIndex(node => node.id === selection.node) : -1;
    const sectionIndex = typeof selection === "object" && "section" in selection ? tour.sections.findIndex(section => section.id === selection.section) : -1;
    const activeStop = nodeIndex >= 0 ? nodeIndex + 1 : 0;
    useEffect(() => { inspector.current?.scrollTo({ top: 0 }); }, [stage, selection, tab]);
    useEffect(()=>{if(invalidField){const field=inspector.current?.querySelector<HTMLInputElement>(`[data-editor-field="${invalidField}"]`);field?.focus();field?.scrollIntoView({block:"nearest"});}},[invalidField,selection,delivery]);
    const [html, setHtml] = useState(() => renderVisualWebsite(document.profile, document.appearance, 0));
    const renderedHtml = useRef(html);
    useEffect(() => {
        cancelCapture();
        const timer = setTimeout(() => {
            let appearance = document.appearance;
            if (liveCamera.current?.stop === activeStop) {
                const camera = liveCamera.current.camera;
                appearance = { ...appearance, tour: { ...tour, hero: activeStop === 0 ? { ...tour.hero, camera } : tour.hero, nodes: tour.nodes.map((node, index) => index + 1 === activeStop ? { ...node, camera } : node) } };
            }
            const nextHtml = renderVisualWebsite(document.profile, appearance, activeStop, undefined, modelUrl);
            if (nextHtml !== renderedHtml.current) {
                renderedHtml.current = nextHtml;
                setSceneReady(false);
                setSceneFailed(false);
                setHtml(nextHtml);
            }
        }, 180);
        return () => clearTimeout(timer);
    }, [document, activeStop, tour, cancelCapture, previewRevision, modelUrl]);
    function send(type: string, extra: Record<string, unknown> = {}) { frame.current?.contentWindow?.postMessage({ channel: "ans-visual-scene", type, ...extra }, "*"); }
    const change = useCallback((next: VisualTour) => { updateDocument(current => ({ ...current, profile: profileFromTour(current.profile, next), appearance: { ...current.appearance, tour: next } })); }, [updateDocument]);
    function choose(next: Selection) { cancelCapture(); if (typeof next === "object" && "node" in next || typeof selection === "object" && "node" in selection)
        liveCamera.current = null; setSelection(next); setTab("content"); if (typeof next === "object" && "section" in next)
        send("section", { index: tour.sections.findIndex(s => s.id === next.section) }); }
    useEffect(() => { alive.current = true; return () => { alive.current = false; cancelCapture(); }; }, [cancelCapture]);
    useEffect(() => {
        const handle = (event: MessageEvent) => {
            if (event.source !== frame.current?.contentWindow || event.data?.channel !== "ans-visual-scene")
                return;
            if (event.data.type === "view" && event.data.index === activeStop) {
                const parsed = tourCameraSchema.safeParse(event.data.camera);
                if (parsed.success)
                    liveCamera.current = { stop: activeStop, camera: parsed.data };
            }
            if (event.data.type === "camera" && event.data.requestId === cameraSequence.current) {
                const parsed = tourCameraSchema.safeParse(event.data.camera);
                if (parsed.success) {
                    pendingCamera.current?.(parsed.data, typeof event.data.thumbnail === "string" && event.data.thumbnail.startsWith("data:image/png;base64,") ? event.data.thumbnail : "");
                    cancelCapture();
                }
            }
            if (event.data.type === "failed") {
                setSceneReady(false);
                setSceneFailed(true);
                setNotice(t("sceneFailed"));
                cancelCapture();
            }
            if (event.data.type === "ready") {
                setSceneReady(true);
                setSceneFailed(false);
                send("editor", { active: !previewing, showContent: stage === 2 && selection !== "global" && selection !== "loading", section: sectionIndex >= 0, loading: stage === 2 && selection === "loading", placing, sticker: { text: stickerText, preset: stickerPreset, color: stickerColor, size: .16 } });
                if (sectionIndex >= 0)
                    send("section", { index: sectionIndex });
            }
            if (event.data.type === "surface" && placing) {
                const camera = event.data;
                const parsed = tourCameraSchema.safeParse({ position: camera.position, target: camera.normal });
                if (parsed.success && tour.stickers.length < 24) {
                    const id = crypto.randomUUID();
                    change({ ...tour, stickers: [...tour.stickers, { id, ...(stickerPreset ? { preset: stickerPreset } : {}), text: stickerText, color: stickerColor, size: .16, rotation: 0, visible: true, position: parsed.data.position, normal: parsed.data.target }] });
                    setSelectedSticker(id);
                    setPlacing(false);
                }
            }
        };
        window.addEventListener("message", handle);
        return () => window.removeEventListener("message", handle);
    }, [tour, placing, stickerText, stickerPreset, stickerColor, previewing, stage, selection, sectionIndex, activeStop, change, t, cancelCapture]);
    useEffect(() => send("editor", { active: !previewing, showContent: stage === 2 && selection !== "global" && selection !== "loading", section: sectionIndex >= 0, loading: stage === 2 && selection === "loading", placing, sticker: { text: stickerText, preset: stickerPreset, color: stickerColor, size: .16 } }), [placing, stickerText, stickerPreset, stickerColor, previewing, stage, selection, sectionIndex]);
    useEffect(() => { cancelCapture(); }, [stage, cancelCapture]);
    const dirty = JSON.stringify(document) !== JSON.stringify(state?.versions[0]?.document);
    useEffect(() => { if (!dirty)
        return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); const unregister = register((proceed, cancel) => { if (window.confirm(old("leaveConfirm"))) {
        window.removeEventListener("beforeunload", warn);
        proceed();
    }
    else
        cancel(); }); return () => { window.removeEventListener("beforeunload", warn); unregister(); }; }, [dirty, register, old]);
    function requestCamera(callback: (camera: TourCamera, thumbnail: string) => void) {
        if (!sceneReady) {
            setNotice(t("scenePending"));
            return;
        }
        cancelCapture();
        const requestId = ++cameraSequence.current;
        pendingCamera.current = callback;
        cameraTimer.current = setTimeout(() => { cancelCapture(); setNotice(t("captureFailed")); }, 3000);
        send("capture", { requestId });
    }
    function capture() { requestCamera((camera, thumbnail) => { setThumbnails(current => ({ ...current, [nodeIndex >= 0 ? tour.nodes[nodeIndex].id : "hero"]: thumbnail })); if (nodeIndex >= 0)
        change({ ...tour, nodes: tour.nodes.map((node, index) => index === nodeIndex ? { ...node, camera } : node) });
    else
        change({ ...tour, hero: { ...tour.hero, camera } }); setNotice(t("captured")); }); }
    function addNode() { if (tour.nodes.length >= 10)
        return; requestCamera((camera, thumbnail) => { const id = crypto.randomUUID(); setThumbnails(current => ({ ...current, [id]: thumbnail })); change({ ...tour, nodes: [...tour.nodes, { id, title: t("newStop", { index: tour.nodes.length + 1 }), eyebrow: "", subtitle: "", body: "", url: "", camera }] }); choose({ node: id }); }); }
    function addSection() { if (tour.sections.length >= 4)
        return; const id = crypto.randomUUID(); change({ ...tour, sections: [...tour.sections, { id, title: t("newSection"), body: "", url: "" }] }); choose({ section: id }); }
    async function save() { if (lock.current || !actor)
        return; if (tour.model) {
        setNotice(t("localModelSave"));
        return;
    } const parsed = visualWebsiteSchema.safeParse(document); if (!parsed.success) {
        reportInvalid(parsed.error.issues[0]?.path);
        return;
    } const payload = { projectId: projectId.current || crypto.randomUUID(), expectedVersion: state?.currentVersion ?? 0, document: parsed.data }; const savable = visualWebsiteSaveSchema.safeParse(payload); if (!savable.success) {
        setNotice(t("saveSizeLimit"));
        return;
    } if (!review) {
        setNotice(old("reviewRequired"));
        return;
    } lock.current = true; setBusy(true); projectId.current = payload.projectId; try {
        const result = await request<{
            projectId: string;
            version: number;
        }>("/api/visual-websites", "POST", { projectId: projectId.current, expectedVersion: state?.currentVersion ?? 0, document: parsed.data });
        if (!alive.current)
            return;
        setState(current => ({ projectId: result.projectId, currentVersion: result.version, versions: [{ version: result.version, createdAt: new Date().toISOString(), document: parsed.data }, ...(current?.versions ?? [])].slice(0, 20) }));
        setSelectedVersion(result.version);
        setNotice(old("saved", { version: result.version }));
    }
    catch (error) {
        if (alive.current)
            setNotice(old(error instanceof Error && error.message.includes("VERSION_CONFLICT") ? "conflict" : "saveFailed"));
    }
    finally {
        lock.current = false;
        if (alive.current)
            setBusy(false);
    } }
    async function download(editable: boolean) { if (exportLock.current)
        return; exportLock.current = true; try {
        setExporting(true);
        const parsed = (editable ? visualWebsiteDraftSchema : visualWebsiteSchema).safeParse(document);
        if (!parsed.success) {
            reportInvalid(parsed.error.issues[0]?.path);
            return;
        }
        if (!editable && !review) {
            setDelivery(true);
            setNotice(old("reviewRequired"));
            return;
        }
        const content = editable ? JSON.stringify(parsed.data, null, 2) : await exportVisualWebsite(parsed.data, async asset => {
            const access=await request<{url:string}>(`/api/visual-model-assets/${asset.id}`,"GET",undefined);
            const response=await fetch(access.url,{cache:"no-store"});
            if(!response.ok||Number(response.headers.get("content-length"))>30000000)throw new Error("MODEL_UNAVAILABLE");
            const reader=response.body?.getReader();if(!reader)throw new Error("MODEL_UNAVAILABLE");
            let size=0;const chunks:Uint8Array[]=[];
            for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>30000000){await reader.cancel();throw new Error("MODEL_TOO_LARGE");}chunks.push(value);}
            const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
        });
        if (alive.current)
            fileDownload(content, editable ? "my-ans-website.json" : "my-portfolio.html");
    }
    catch {
        if (alive.current)
            setNotice(old("exportFailed"));
    }
    finally {
        exportLock.current = false;
        if (alive.current)
            setExporting(false);
    } }
    function reportInvalid(path?: PropertyKey[]) {
        if (!path) { setNotice(old("invalid")); return; }
        let tourPart: PropertyKey[] = path[1] === "tour" ? path.slice(2) : [];
        if (path[0] === "profile" && path[1] === "projects" && typeof path[2] === "number") {
            const field = path[3] === "description" ? "body" : path[3] === "name" ? "title" : path[3];
            tourPart = ["nodes", path[2], field];
        }
        const key = String(tourPart.at(-1) ?? path[1]);
        const mappedKey = tourPart[0] === "hero" && key === "title" ? "heroTitle" : tourPart[0] === "hero" && key === "body" ? "heroBody" : key;
        const label = ({ fullName: "byline", headline: "heroTitle", about: "heroBody", contactUrl: "url", projects: "addStop", nodes: "addStop" } as Record<string, string>)[mappedKey] ?? mappedKey;
        const fields = ["byline", "heroTitle", "heroBody", "url", "email", "title", "body", "issue", "location", "tagline", "loadingTitle", "loadingSubtitle", "addStop"];
        if (label !== "addStop" && fields.includes(label)) {
            setStage(2); setDelivery(false);
            if (tourPart[0] === "nodes" && typeof tourPart[1] === "number" && tour.nodes[tourPart[1]]) choose({ node: tour.nodes[tourPart[1]].id });
            else if (tourPart[0] === "sections" && typeof tourPart[1] === "number" && tour.sections[tourPart[1]]) choose({ section: tour.sections[tourPart[1]].id });
            else choose("hero");
            setInvalidField(label);
        }
        setNotice(t("invalidField", { field: fields.includes(label) ? t(label) : t("deliveryFields") }));
    }
    function resetModel() { if (!tour.model && !tour.modelAsset)
        return; rememberUndo(); setThumbnails({}); liveCamera.current = null; change({ ...tour, model: undefined, modelAsset: undefined, stickers: [], hero: { ...tour.hero, camera: undefined }, nodes: tour.nodes.map(node => ({ ...node, camera: undefined })) }); }
    function applyGeneratedModel(asset:ModelAssetRef){rememberUndo();setThumbnails({});liveCamera.current=null;change({...tour,model:undefined,modelAsset:asset,fitModel:true,stickers:[],hero:{...tour.hero,camera:undefined},nodes:tour.nodes.map(node=>({...node,camera:undefined}))});}
    function moveNode(offset: number) { if (nodeIndex < 0)
        return; const next = nodeIndex + offset; if (next < 0 || next >= tour.nodes.length)
        return; const nodes = [...tour.nodes]; nodes.splice(next, 0, nodes.splice(nodeIndex, 1)[0]); change({ ...tour, nodes }); }
    function moveLayer(id: string, offset: number) { const from = tour.stickers.findIndex(item => item.id === id), to = from + offset; if (from < 0 || to < 0 || to >= tour.stickers.length)
        return; const stickers = [...tour.stickers]; stickers.splice(to, 0, stickers.splice(from, 1)[0]); change({ ...tour, stickers }); }
    async function importFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file)
        return; const startedAt = revision.current; try {
        if (file.size > 8000000)
            throw new Error();
        const next = visualWebsiteDraftSchema.parse(JSON.parse(await file.text()));
        if (!alive.current || startedAt !== revision.current)
            return;
        replaceDocument(next);
    }
    catch {
        setNotice(old("importFailed"));
    } }
    async function importModel(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file)
        return; const startedAt = revision.current; try {
        if (file.size > 5000000)
            throw new Error();
        const buffer = await file.arrayBuffer();
        if (!alive.current || startedAt !== revision.current)
            return;
        const bytes = new Uint8Array(buffer);
        let text = "";
        for (let i = 0; i < bytes.length; i += 32768)
            text += String.fromCharCode(...bytes.subarray(i, i + 32768));
        const model = "data:model/gltf-binary;base64," + btoa(text);
        if (!isSelfContainedVisualModel(model))
            throw new Error();
        rememberUndo();
        setThumbnails({});
        liveCamera.current = null;
        change({ ...tour, model, modelAsset: undefined, stickers: [], hero: { ...tour.hero, camera: undefined }, nodes: tour.nodes.map(n => ({ ...n, camera: undefined })) });
        setNotice(t("localModelSave"));
    }
    catch {
        setNotice(t("modelInvalid"));
    } }
    function input(label: string, value: string, onChange: (value: string) => void, long = false) { return <label key={label} className={styles.field}>{t(label)}{long ? <Textarea rows={3} data-editor-field={label} aria-label={t(label)} aria-describedby={invalidField===label?`visual-error-${label}`:undefined} aria-invalid={invalidField===label||undefined} name={label} maxLength={FIELD_LIMITS[label] ?? 120} value={value} onChange={e => onChange(e.target.value)}/> : <Input data-editor-field={label} aria-label={t(label)} aria-describedby={invalidField===label?`visual-error-${label}`:undefined} aria-invalid={invalidField===label||undefined} name={label} spellCheck={label!=="email"&&label!=="url"} maxLength={FIELD_LIMITS[label] ?? 120} type={label === "email" ? "email" : label === "url" ? "url" : "text"} autoComplete={label === "email" ? "email" : "off"} value={value} onChange={e => onChange(e.target.value)}/>}{invalidField===label&&<small id={`visual-error-${label}`} className={styles.fieldError}>{t("invalidField",{field:t(label)})}</small>}</label>; }
    function slider(label: string, value: number, min: number, max: number, onChange: (value: number) => void, step = .1) { return <label className={styles.slider}>{t(label)}<output>{Number(value.toFixed(2))}</output><input aria-label={t(label)} type="range" min={min} max={max} step={label === "fov" ? .1 : step} value={value} onChange={e => onChange(Number(e.target.value))}/></label>; }
    const sticker = tour.stickers.find(s => s.id === selectedSticker);
    const setting = (key: keyof VisualTour["settings"], value: string | number) => change({ ...tour, settings: { ...tour.settings, [key]: value } });
    const title = selection === "global" ? t("global") : selection === "loading" ? t("loading") : selection === "hero" ? t("hero") : nodeIndex >= 0 ? t("stop", { index: nodeIndex + 1 }) : t("portfolio");
    const selectedCamera = nodeIndex >= 0 ? tour.nodes[nodeIndex].camera : tour.hero.camera;
    return <div className={styles.editor} data-stage={stage}>
 <header className={styles.top}><div className={styles.projectTitle}>{onReturn ? <button className={styles.back} onClick={onReturn}><ArrowLeft size={14}/>{old("landing.returnPreview")}</button> : <WorkspaceLink href="/projects"><ArrowLeft size={14}/>{t("workspace")}</WorkspaceLink>}<span>{tour.hero.byline || t("untitled")}</span></div><nav aria-label={t("stages")}>{["model", "stickers", "animation"].map((key, index) => <button key={key} aria-current={stage === index ? "step" : undefined} onClick={() => { setStage(index); setPlacing(false); }}><i>{index + 1}</i>{t(key)}</button>)}</nav><div className={styles.actions}>{undoDocument && <button aria-label={t("undoReplacement")} onClick={undoReplacement}><Undo2 size={13}/>{t("undo")}</button>}<button onClick={() => setPreviewing(!previewing)}><Play size={13}/>{t("preview")}</button><button className={styles.accent} onClick={() => setDelivery(true)}><ArrowDownToLine size={13}/>{t("deliver")}</button></div></header>
 <div className={styles.workarea}>
 <aside ref={inspector} className={styles.inspector}>
  {stage === 0 ? <><div className={styles.panelTitle}>{t("model")}<span>{t("local")}</span></div><VisualModelGeneration projectId={state?.projectId} onApply={applyGeneratedModel}/><div className={styles.divider}>{t("or")}</div><h3>{t("uploadModel")}</h3><button className={styles.uploadModel} onClick={() => modelRef.current?.click()}><Upload size={22}/><strong>{t("uploadGLB")}</strong><small>{t("uploadLimit")}</small></button><h3>{t("chooseModel")}</h3><button className={styles.modelCard} aria-pressed={!tour.model&&!tour.modelAsset} onClick={resetModel}><Image unoptimized width={55} height={66} src="/visual-portfolio/reference/home/labelman.webp" alt={old("avatars.reference")}/><span>{old("avatars.reference")}<small>{t("demoModelSize")}</small></span><Check size={15}/></button><p className={styles.note}>{t("modelNote")}</p><h3>{t("modelTools")}</h3><button className={styles.wide} onClick={() => send("select", { index: 0 })}>{t("resetView")}</button><button className={styles.wide} onClick={() => { setStage(1); }}>{t("toStickers")} →</button><button className={styles.wide} onClick={() => importRef.current?.click()}><FolderOpen size={14}/>{old("importDraft")}</button></> :
            stage === 1 ? <><div className={styles.panelTitle}><Layers size={15}/>{t("layers", { count: tour.stickers.length })}</div><p className={styles.note}>{t("layerNote")}</p>{tour.stickers.map((item, index) => <div className={styles.layer} key={item.id} draggable onDragStart={() => { dragId.current = item.id; }} onDragOver={e => e.preventDefault()} onDrop={() => { const from = tour.stickers.findIndex(s => s.id === dragId.current); if (from < 0)
                return; const stickers = [...tour.stickers]; stickers.splice(index, 0, stickers.splice(from, 1)[0]); change({ ...tour, stickers }); }} data-selected={selectedSticker === item.id}><button onClick={() => setSelectedSticker(item.id)}><GripVertical size={13}/><span style={{ color: item.color }}>{item.preset && presetSticker(item.preset) ? t(`stickerLabels.${presetSticker(item.preset)!.key}`) : item.text}</span><small>{t("layer", { index: index + 1 })}</small></button><button aria-label={t(item.visible ? "hideLayer" : "showLayer")} onClick={() => change({ ...tour, stickers: tour.stickers.map(s => s.id === item.id ? { ...s, visible: !s.visible } : s) })}>{item.visible ? <Eye size={13}/> : <EyeOff size={13}/>}</button><button aria-label={t("duplicate")} disabled={tour.stickers.length >= 24} onClick={() => change({ ...tour, stickers: [...tour.stickers, { ...item, id: crypto.randomUUID(), position: [item.position[0], item.position[1], item.position[2]] }] })}><Copy size={13}/></button><button aria-label={t("moveLayerUp")} disabled={index === 0} onClick={() => moveLayer(item.id, -1)}><ArrowUp size={13}/></button><button aria-label={t("moveLayerDown")} disabled={index === tour.stickers.length - 1} onClick={() => moveLayer(item.id, 1)}><ArrowDown size={13}/></button><button aria-label={t("deleteLayer")} onClick={() => { rememberUndo(); change({ ...tour, stickers: tour.stickers.filter(s => s.id !== item.id) }); }}><Trash2 size={13}/></button></div>)}{!tour.stickers.length && <p className={styles.empty}>{t("noLayers")}</p>}{sticker && <div className={styles.stickerSettings}>{!sticker.preset && input("stickerText", sticker.text, text => change({ ...tour, stickers: tour.stickers.map(s => s.id === sticker.id ? { ...s, text: text.slice(0, 24) } : s) }))}{slider("stickerSize", sticker.size, .03, .5, size => change({ ...tour, stickers: tour.stickers.map(s => s.id === sticker.id ? { ...s, size } : s) }), .01)}{slider("rotation", sticker.rotation, -180, 180, rotation => change({ ...tour, stickers: tour.stickers.map(s => s.id === sticker.id ? { ...s, rotation } : s) }), 1)}</div>}</> :
                <><div className={styles.panelTitle}>{title}<span>{t(dirty ? "unsaved" : "saved")}</span></div>{selection !== "global" && selection !== "loading" && sectionIndex < 0 && <div className={styles.tabs} role="group" aria-label={t("settingsPanels")}>{["content", "camera", "light", "effects"].map(key => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{t(key)}</button>)}</div>}
 {selection === "global" ? <><h3>{t("text")}</h3><label className={styles.field}>{t("font")}<select value={tour.settings.font || "sans"} onChange={e => setting("font", e.target.value)}>{["sans", "serif", "mono"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>{(["accent", "text", "background"] as const).map(key => <label key={key} className={styles.color}>{t(key)}<input aria-label={t(key)} type="color" value={tour.settings[key]} onChange={e => setting(key, e.target.value)}/><small>{tour.settings[key]}</small></label>)}<label className={styles.field}>{t("language")}<select value={document.profile.language} onChange={e => { updateDocument({ ...document, profile: { ...document.profile, language: e.target.value as "zh" | "en" } }); setReview(false); }}><option value="zh">中文</option><option value="en">English</option></select></label><label className={styles.check}><input type="checkbox" checked={document.appearance.motion} onChange={e => { updateDocument({ ...document, appearance: { ...document.appearance, motion: e.target.checked } }); setReview(false); }}/>{old("motion")}</label></> :
                        selection === "loading" ? <>{input("loadingTitle", tour.loading.title, title => change({ ...tour, loading: { ...tour.loading, title } }))}{input("loadingSubtitle", tour.loading.subtitle, subtitle => change({ ...tour, loading: { ...tour.loading, subtitle } }))}<p className={styles.note}>{t("loadingNote")}</p></> :
                            tab === "camera" ? <><h3>{t("cameraPosition")}</h3><div className={styles.axes}>{["X", "Y", "Z"].map((axis, index) => <label key={axis}>{axis}<input aria-label={t("axis", { axis })} type="number" min="-100" max="100" step=".05" value={selectedCamera?.position[index] ?? ""} placeholder="—" onChange={e => { liveCamera.current = null; const camera: TourCamera = selectedCamera ?? { position: [0, 0, 2], target: [0, 0, 0] }; const position = [...camera.position] as [
                                number,
                                number,
                                number
                            ]; position[index] = Math.max(-100, Math.min(100, Number(e.target.value) || 0)); if (nodeIndex >= 0)
                                change({ ...tour, nodes: tour.nodes.map((n, i) => i === nodeIndex ? { ...n, camera: { ...camera, position } } : n) });
                            else
                                change({ ...tour, hero: { ...tour.hero, camera: { ...camera, position } } }); }}/></label>)}</div>{slider("fov", tour.settings.fov, 20, 75, v => setting("fov", v), 1)}<button className={styles.wide} disabled={!sceneReady} onClick={capture}><Camera size={14}/>{t("capture")}</button><p className={styles.note}>{t("captureNote")}</p><button className={styles.wide} onClick={() => { if (nodeIndex >= 0)
                                change({ ...tour, nodes: tour.nodes.map((n, i) => i === nodeIndex ? { ...n, camera: undefined } : n) });
                            else
                                change({ ...tour, hero: { ...tour.hero, camera: undefined } }); liveCamera.current = null; }}>{t("resetView")}</button></> :
                                tab === "light" ? <><h3>{t("background")}</h3>{(["background", "ambientColor", "keyColor"] as const).map(key => <label key={key} className={styles.color}>{t(key)}<input aria-label={t(key)} type="color" value={tour.settings[key] || "#ffffff"} onChange={e => setting(key, e.target.value)}/></label>)}{slider("ambient", tour.settings.ambient, 0, 4, v => setting("ambient", v))}{slider("key", tour.settings.key, 0, 6, v => setting("key", v))}{slider("keyAngle", tour.settings.keyAngle ?? -35, -180, 180, v => setting("keyAngle", v), 1)}{slider("keyHeight", tour.settings.keyHeight ?? 5, .1, 6, v => setting("keyHeight", v))}{slider("exposure", tour.settings.exposure, .2, 2, v => setting("exposure", v))}<p className={styles.note}>{t("sharedSettings")}</p></> :
                                    tab === "effects" ? <><h3>{t("bloom")}</h3>{slider("bloomStrength", tour.settings.bloom ?? 0, 0, 2, v => setting("bloom", v))}{slider("bloomThreshold", tour.settings.bloomThreshold ?? .9, 0, 1, v => setting("bloomThreshold", v))}{slider("vignette", tour.settings.vignette, 0, 1, v => setting("vignette", v))}{slider("grayscale", tour.settings.grayscale, 0, 1, v => setting("grayscale", v))}<p className={styles.note}>{t("sharedSettings")}</p></> :
                                        selection === "hero" ? <><h3>{t("heroText")}</h3><label className={styles.field}>{t("heroStyle")}<select value={tour.hero.layout} onChange={e => change({ ...tour, hero: { ...tour.hero, layout: e.target.value as "editorial" | "minimal" } })}><option value="editorial">{t("editorial")}</option><option value="minimal">{t("minimal")}</option></select></label>{input("heroTitle", tour.hero.title, title => change({ ...tour, hero: { ...tour.hero, title } }))}{input("heroBody", tour.hero.body, body => change({ ...tour, hero: { ...tour.hero, body } }), true)}<h3>{t("contact")}</h3>{input("url", document.profile.contactUrl, url => { updateDocument({ ...document, profile: { ...document.profile, contactUrl: url } }); setReview(false); })}{input("email", document.profile.email, email => { updateDocument({ ...document, profile: { ...document.profile, email } }); setReview(false); })}<h3>{t("masthead")}</h3>{(["byline", "issue", "tagline", "location"] as const).map(key => input(key, tour.hero[key], value => change({ ...tour, hero: { ...tour.hero, [key]: value } })))}</> :
                                            nodeIndex >= 0 ? <><h3>{t("cardText")}</h3>{(["eyebrow", "title", "subtitle", "body", "url"] as const).map(key => input(key, tour.nodes[nodeIndex][key], value => change({ ...tour, nodes: tour.nodes.map((node, index) => index === nodeIndex ? { ...node, [key]: value } : node) }), key === "body"))}<div className={styles.moveControls}><button disabled={nodeIndex === 0} onClick={() => moveNode(-1)}><ArrowLeft size={13}/>{t("moveStopEarlier")}</button><button disabled={nodeIndex === tour.nodes.length - 1} onClick={() => moveNode(1)}>{t("moveStopLater")}<ArrowRight size={13}/></button></div><button className={styles.wide} onClick={() => { rememberUndo(); change({ ...tour, nodes: tour.nodes.filter((_, i) => i !== nodeIndex) }); choose("hero"); }}><Trash2 size={13}/>{t("deleteStop")}</button></> :
                                                sectionIndex >= 0 ? <>{(["title", "body", "url"] as const).map(key => input(key, tour.sections[sectionIndex][key], value => change({ ...tour, sections: tour.sections.map((section, index) => index === sectionIndex ? { ...section, [key]: value } : section) }), key === "body"))}<button className={styles.wide} onClick={() => { rememberUndo(); change({ ...tour, sections: tour.sections.filter((_, i) => i !== sectionIndex) }); choose("hero"); }}><Trash2 size={13}/>{t("deleteSection")}</button></> : null}</>}
 </aside>
 <section className={styles.stage} aria-label={old("preview")} data-device={device} data-preview={previewing}><div className={styles.devices}>{[["desktop", Monitor], ["tablet", Tablet], ["phone", Smartphone]].map(([key, Icon]) => { const DeviceIcon = Icon as typeof Monitor; return <button key={String(key)} aria-pressed={device === key} onClick={() => setDevice(String(key))}><DeviceIcon size={13}/>{t(String(key))}</button>; })}</div><iframe ref={frame} title={old("preview")} sandbox="allow-scripts" srcDoc={html} key={previewRevision}/>{sceneFailed && <button className={styles.exitPreview} onClick={() => { setSceneReady(false); setSceneFailed(false); setPreviewRevision(value => value + 1); }}><RotateCw size={14}/>{t("retryScene")}</button>}<span className={styles.sceneHint}>{t(placing ? "placeHint" : "dragHint")}</span>{previewing && <button className={styles.exitPreview} onClick={() => setPreviewing(false)}><X size={14}/>{t("exitPreview")}</button>}</section>
 {stage === 1 && <aside className={styles.library}><div className={styles.panelTitle}>{t("stickerSource")}</div><VisualStickerLibrary selected={stickerPreset} onSelect={item=>{setStickerPreset(item.id);setStickerText(t(`stickerLabels.${item.key}`).slice(0,24));setPlacing(true);}}/><h3>{t("stickerTextMode")}</h3>{["✦", "♥", "★", "☻", "AI", "ANS", "DESIGN", "CODE", "INFP", "ENTP", "☕", "♫"].map(text => <button className={styles.preset} key={text} aria-pressed={!stickerPreset && stickerText === text} onClick={() => { setStickerPreset(undefined);setStickerText(text); setPlacing(true); }}>{text}</button>)}{!stickerPreset && input("stickerText", stickerText, value => setStickerText(value.slice(0, 24)))}{!stickerPreset && <label className={styles.color}>{t("color")}<input aria-label={t("color")} type="color" value={stickerColor} onChange={e => setStickerColor(e.target.value)}/></label>}<button className={`${styles.wide} ${styles.accent}`} disabled={tour.stickers.length >= 24} onClick={() => setPlacing(!placing)}>{t(placing ? "cancelPlace" : "placeSticker")}</button><p className={styles.note}>{t("stickerNote")}</p></aside>}
 </div>
 {stage === 2 && <nav className={styles.timeline} aria-label={t("timeline")}><button aria-pressed={selection === "global"} onClick={() => choose("global")}><Settings2 size={18}/><span>{t("global")}</span></button><button aria-pressed={selection === "loading"} onClick={() => choose("loading")}><span className={styles.loadingDots}>⋮</span><span>{t("loading")}</span></button><button aria-pressed={selection === "hero"} onClick={() => choose("hero")}><Image unoptimized width={62} height={43} src={thumbnails.hero || "/visual-portfolio/reference/home/labelman.webp"} alt=""/><span>{t("hero")}</span></button><div className={styles.timelineLabel}>{t("timeline")}<small>{t("nodeCount", { count: tour.nodes.length })}</small></div>{tour.nodes.map((node, index) => <button key={node.id} draggable onDragStart={() => { dragId.current = node.id; }} onDragOver={e => e.preventDefault()} onDrop={() => { const from = tour.nodes.findIndex(n => n.id === dragId.current); if (from < 0)
        return; const nodes = [...tour.nodes]; nodes.splice(index, 0, nodes.splice(from, 1)[0]); change({ ...tour, nodes }); }} aria-pressed={nodeIndex === index} onClick={() => choose({ node: node.id })}>{thumbnails[node.id] ? <Image unoptimized width={62} height={43} src={thumbnails[node.id]} alt=""/> : <Camera size={24}/>}<i>{index + 1}</i><span>{node.title || t("newStop", { index: index + 1 })}</span></button>)}<button className={styles.addTile} disabled={tour.nodes.length >= 10 || !sceneReady} onClick={addNode}><Plus size={18}/><span>{t("addStop")}</span></button><div className={styles.timelineLabel}>{t("portfolio")}<small>{t("sectionCount", { count: tour.sections.length })}</small></div>{tour.sections.map((section, index) => <button key={section.id} aria-pressed={sectionIndex === index} onClick={() => choose({ section: section.id })}><Layers size={18}/><span>{section.title}</span></button>)}<button className={styles.addTile} disabled={tour.sections.length >= 4} onClick={addSection}><Plus size={18}/><span>{t("addSection")}</span></button></nav>}
 <input ref={importRef} type="file" accept=".json,application/json" tabIndex={-1} className="sr-only" aria-label={old("fileLabel")} onChange={importFile}/>
 <input ref={modelRef} type="file" accept=".glb" tabIndex={-1} className="sr-only" aria-label={t("uploadModel")} onChange={importModel}/>
 {notice && <div className={styles.notice} role="status">{notice}<button aria-label={t("close")} onClick={() => setNotice("")}><X size={13}/></button></div>}
 <Dialog open={delivery} onOpenChange={setDelivery}><DialogContent className={styles.delivery} showCloseButton={false}><button className={styles.close} aria-label={t("close")} onClick={() => setDelivery(false)}><X size={18}/></button><DialogTitle>{t("deliver")}</DialogTitle><DialogDescription>{t("deliveryNote")}</DialogDescription>{!actor && <p className={styles.note}>{t("loginDraftNote")}</p>}<label className={styles.check}><input type="checkbox" checked={review} onChange={e => setReview(e.target.checked)}/>{old("review")}</label><button className={`${styles.wide} ${styles.accent}`} disabled={!review || exporting} onClick={() => download(false)}><ArrowDownToLine size={14}/>{old(exporting ? "preparingDownload" : "download")}</button>{actor ? <button className={styles.wide} disabled={!review || busy || !!tour.model} onClick={save}><Save size={14}/>{old(busy ? "saving" : "save")}</button> : <WorkspaceLink className={styles.wide} href="/login?callbackUrl=%2Fmarket%2Fresume-website">{old("loginToSave")}</WorkspaceLink>}<button className={styles.wide} disabled={exporting} onClick={() => download(true)}>{old("downloadDraft")}</button><button className={styles.wide} onClick={() => importRef.current?.click()}>{old("importDraft")}</button>{state && <><label className={styles.field}>{old("versions")}<select value={selectedVersion} onChange={e => setSelectedVersion(Number(e.target.value))}>{state.versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}</select></label><button className={styles.wide} onClick={() => { const version = state.versions.find(v => v.version === selectedVersion); if (version) {
        replaceDocument(version.document);
        setNotice(old("restored"));
    } }}>{old("restore")}</button><WorkspaceLink className={styles.note} href={`/projects/${state.projectId}/visual-website`}>{old("savedLink")}</WorkspaceLink></>}<p className={styles.note}>{tour.model ? t("localModelSave") : old("private")}</p>{actor&&state&&<VisualWebsitePublication projectId={state.projectId} versions={state.versions.map(version=>version.version)}/>}</DialogContent></Dialog>
 </div>;
}
