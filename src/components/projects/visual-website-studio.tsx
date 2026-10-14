"use client";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { WorkspaceLink as Link, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import Image from "next/image";
import { exportVisualWebsite } from "@/lib/projects/visual-website-assets";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, CircleUserRound, Clapperboard, FileCheck2, FolderOpen, Monitor, Plus, RotateCcw, Save, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_APPEARANCE, visualWebsiteSchema, visualWebsiteDraftSchema, type VisualAppearance, type VisualWebsite, type VisualWebsiteState } from "@/contracts/visual-website";
import type { ResumeWebsiteInput } from "@/contracts/resume-website";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import { MarketWorkflowRun, type MarketRunDetails } from "@/components/marketplace/workflow-run";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import styles from "./visual-website.module.css";
import { VisualTourEditor } from "./visual-tour-editor";

const icons = [CircleUserRound, FileCheck2, Clapperboard, CheckCheck];
const newProject = () => ({ name: "", role: "", description: "", url: "" });
function emptyProfile(language: "zh" | "en"): ResumeWebsiteInput { return { fullName: "", headline: "", about: "", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [newProject()], style: "editorial", accent: "emerald", language }; }
function saveFile(content: string, name: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
interface StudioProps { onReturn?:()=>void; immersive?: boolean; beginEditing?: boolean; initial?: VisualWebsiteState; execution?: { listingId: string; version: number; details: MarketRunDetails }; }
export function VisualWebsiteStudio(props: StudioProps) { return props.immersive ? <VisualTourEditor initial={props.initial} onReturn={props.onReturn}/> : <LegacyVisualWebsiteStudio {...props}/>; }
function LegacyVisualWebsiteStudio({ initial, execution, immersive = false, beginEditing = false }: StudioProps) {
 const t = useTranslations("visualWebsite"), locale = useLocale(), actorId = useMarketActorId(), request = useMarketRequest();
 const { register } = useWorkspaceNavigation();
 const language = locale.startsWith("zh") ? "zh" : "en";
 const [demo, setDemo] = useState(!beginEditing && !initial?.versions.length), [step, setStep] = useState(0), [mobile, setMobile] = useState(false);
 const [profile, setProfile] = useState<ResumeWebsiteInput>(() => initial?.versions[0]?.document.profile ?? (beginEditing ? emptyProfile(language) : { ...emptyProfile(language), ...t.raw("exampleProfile") }));
 const [appearance, setAppearance] = useState<VisualAppearance>(() => initial?.versions[0]?.document.appearance ?? DEFAULT_APPEARANCE);
 const [camera, setCamera] = useState(0), [reviewed, setReviewed] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
 const [state, setState] = useState<VisualWebsiteState | undefined>(initial), [selectedVersion, setSelectedVersion] = useState(initial?.versions[0]?.version ?? 0);
 const projectId = useRef(initial?.projectId ?? ""), lock = useRef(false), alive = useRef(true), uploadRef = useRef<HTMLInputElement>(null);
 const inputId = useId();
 const document: VisualWebsite = { format: "ans-visual-website", version: 1, profile, appearance };
 const serialized = JSON.stringify(document);
 const [preview, setPreview] = useState(() => renderVisualWebsite(profile, appearance));
 useEffect(() => { const timer = setTimeout(() => setPreview(renderVisualWebsite(profile, appearance, camera)), 160); return () => clearTimeout(timer); }, [profile, appearance, camera]);
 useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
 // Personal facts remain in memory; only explicit save/download actions persist them.
 const savedDocument = state?.versions[0]?.document;
 const dirty = !demo && serialized !== JSON.stringify(savedDocument);
 useEffect(() => {
  if (!dirty) return;
  const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
  window.addEventListener("beforeunload", warn);
  const unregister = register((proceed, cancel) => {
   if (window.confirm(t("leaveConfirm"))) { window.removeEventListener("beforeunload", warn); proceed(); } else cancel();
  });
  return () => { window.removeEventListener("beforeunload", warn); unregister(); };
 }, [dirty, register, t]);
 function start() { setDemo(false); setProfile(emptyProfile(language)); setReviewed(false); setStep(0); setNotice(""); setError(""); }
 function updateProfile(next: ResumeWebsiteInput) { if (demo) { setDemo(false); setProfile(next); } else setProfile(next); setReviewed(false); setNotice(""); }
 function updateAppearance(next: VisualAppearance) { setAppearance(next); setReviewed(false); setNotice(""); }
 function validDocument() { if (demo) { setError(t("demoGuard")); return null; } const parsed = visualWebsiteSchema.safeParse(document); if (!parsed.success) { setError(t("invalid")); setStep(1); return null; } return parsed.data; }
 async function save() {
  if (lock.current) return; const value = validDocument(); if (!value) return;
  if (!reviewed) { setError(t("reviewRequired")); return; }
  if (!actorId) return;
  lock.current = true; setBusy(true); setError(""); setNotice("");
  projectId.current ||= crypto.randomUUID();
  try {
   const saved = await request<{ projectId: string; version: number }>("/api/visual-websites", "POST", { projectId: projectId.current, expectedVersion: state?.currentVersion ?? 0, document: value });
   if (!alive.current) return;
   const version = { version: saved.version, createdAt: new Date().toISOString(), document: value };
   setState(current => ({ projectId: saved.projectId, currentVersion: saved.version, versions: [version, ...(current?.versions.filter(v => v.version !== saved.version) ?? [])].slice(0,20) })); setSelectedVersion(saved.version); setNotice(t("saved", { version: saved.version }));
  } catch (cause) { if (alive.current) setError(t(cause instanceof Error && /VERSION_CONFLICT/.test(cause.message) ? "conflict" : "saveFailed")); }
  finally { lock.current = false; if (alive.current) setBusy(false); }
 }
 async function download(editable: boolean) {
  if (demo) { setError(t("demoGuard")); return; }
  const parsed = (editable ? visualWebsiteDraftSchema : visualWebsiteSchema).safeParse(document);
  if (!parsed.success) { setError(t("invalid")); setStep(1); return; }
  if (!editable && !reviewed) { setStep(3); setError(t("reviewRequired")); return; }
  setError("");
  try {
   const content = editable ? JSON.stringify(parsed.data, null, 2) : await exportVisualWebsite(parsed.data);
   saveFile(content, editable ? "my-ans-website.json" : "my-portfolio.html", editable ? "application/json;charset=utf-8" : "text/html;charset=utf-8");
  } catch { setError(t("exportFailed")); }
 }
 async function importFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { if (file.size > 100000) throw new Error(); const value = visualWebsiteDraftSchema.parse(JSON.parse(await file.text())); if (!alive.current) return; setProfile(value.profile); setAppearance(value.appearance); setDemo(false); setReviewed(false); setError(""); setNotice(""); } catch { if (alive.current) setError(t("importFailed")); } }
 function restore() { const version = state?.versions.find(v => v.version === selectedVersion); if (!version) return; setProfile(version.document.profile); setAppearance(version.document.appearance); setReviewed(false); setNotice(t("restored")); }
 function field(name: "fullName" | "headline" | "about" | "location" | "email" | "contactUrl" | "education") { const long = name === "about" || name === "education"; const limit = name === "fullName" ? 80 : name === "headline" ? 120 : name === "about" ? 3000 : name === "education" ? 1500 : name === "location" ? 100 : name === "email" ? 254 : 500; return <label className={styles.field} key={name}>{t(`fields.${name}`)}{long ? <Textarea maxLength={limit} rows={3} value={demo ? "" : profile[name]} onChange={e => updateProfile({ ...(demo ? emptyProfile(language) : profile), [name]: e.target.value })} /> : <Input maxLength={limit} type={name === "email" ? "email" : "text"} value={demo ? "" : profile[name]} onChange={e => updateProfile({ ...(demo ? emptyProfile(language) : profile), [name]: e.target.value })} />}</label>; }
 return <div className={`${styles.shell} ${immersive ? styles.immersive : ""}`}>
  <header className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p><div className={styles.pills}>{["free", "minutes", "noCode"].map(key=><span key={key}><Check size={12} aria-hidden="true"/>{t(key)}</span>)}</div></div><div className={styles.heroActions}>{demo && <Button onClick={start} className={styles.lime}>{t("start")}<ArrowRight size={16}/></Button>}<Button variant="outline" onClick={()=>uploadRef.current?.click()}><FolderOpen size={15}/>{t("importDraft")}</Button><input ref={uploadRef} className="sr-only" type="file" accept="application/json,.json" aria-label={t("fileLabel")} onChange={importFile}/></div></header>
  <div className={styles.workspace}><nav className={styles.steps} aria-label={t("stepLabel")}>{icons.map((Icon,index)=><button key={index} type="button" aria-current={index===step?"step":undefined} onClick={()=>setStep(index)}><span className={styles.stepIcon}><Icon size={18}/></span><span><strong>{t(`steps.${index}`)}</strong><small>{t(`stepHints.${index}`)}</small></span><span className={styles.stepNumber}>0{index+1}</span></button>)}</nav>
  <div className={styles.editor}><div className={styles.stepIntro}><span>{t("stepCount",{step:step+1})}</span><h2>{t(["avatarTitle","storyTitle","cameraTitle","finishTitle"][step])}</h2><p>{t(["avatarDescription","storyDescription","cameraDescription","finishDescription"][step])}</p></div>
  {step===0 && <><div className={styles.avatars}>{(["reference","clay","studio","vinyl","faceted"] as const).map((avatar,index)=><button key={avatar} className={styles.avatarOption} type="button" aria-pressed={appearance.avatar===avatar} onClick={()=>updateAppearance({...appearance,avatar})}><span className={styles.avatarFigure} data-avatar={avatar} aria-hidden="true">{avatar === "reference" ? <Image unoptimized src="/visual-portfolio/reference/home/labelman.webp" width={240} height={300} alt=""/> : <><span className={styles.figureHead}><i/><i/></span><span className={styles.figureBody}/></>}</span><span className={styles.avatarCaption}><strong>{t(`avatars.${avatar}`)}</strong><small>{t(`avatarNotes.${avatar}`)}</small></span><span className={styles.optionNumber}>0{index+1}</span>{appearance.avatar===avatar && <Check size={13} className={styles.optionCheck}/>}</button>)}</div><fieldset className={styles.choices}><legend>{t("palette")}</legend>{(["lime","lavender","coral"] as const).map(palette=><button type="button" key={palette} aria-label={t(`palettes.${palette}`)} title={t(`palettes.${palette}`)} aria-pressed={appearance.palette===palette} onClick={()=>updateAppearance({...appearance,palette})} style={{background:{lime:"#d1f54c",lavender:"#c3adff",coral:"#ffa891"}[palette]}}>{appearance.palette===palette && <Check size={15} aria-hidden="true"/>}</button>)}</fieldset><div className={styles.toggleRow}><span>{t("background")}</span><div>{(["dark","light"] as const).map(background=><button type="button" aria-pressed={appearance.background===background} key={background} onClick={()=>updateAppearance({...appearance,background})}>{t(background)}</button>)}</div></div><p className={styles.smallNote}>{t("avatarLimit")}</p></>}
  {step===1 && !demo && <div className={styles.fields}>{(["fullName","headline","about"] as const).map(field)}<label className={styles.field}>{t("fields.skills")}<Input maxLength={1500} value={demo?"":profile.skills.join(", ")} onChange={e=>updateProfile({...profile, skills:e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)})}/></label>{(demo?[newProject()]:profile.projects).map((project,index)=><fieldset className={styles.project} key={index}><legend>{t("project",{index:index+1})}</legend>{(["name","role","description","url"] as const).map(key=><label key={key} className={styles.field}>{t(`fields.${key}`)}{key==="description"?<Textarea rows={3} maxLength={2000} value={project[key]} onChange={e=>updateProfile({...profile,projects:profile.projects.map((p,i)=>i===index?{...p,[key]:e.target.value}:p)})}/>:<Input maxLength={key==="url"?500:100} value={project[key]} onChange={e=>updateProfile({...profile,projects:profile.projects.map((p,i)=>i===index?{...p,[key]:e.target.value}:p)})}/>}</label>)}{profile.projects.length>1 && <Button size="sm" variant="ghost" onClick={()=>updateProfile({...profile,projects:profile.projects.filter((_,i)=>i!==index)})}><Trash2 size={13}/>{t("removeProject")}</Button>}</fieldset>)}{profile.projects.length<6 && <Button variant="outline" size="sm" onClick={()=>updateProfile({...profile,projects:[...profile.projects,newProject()]})}><Plus size={14}/>{t("addProject")}</Button>}{(["education","location","email","contactUrl"] as const).map(field)}<label className={styles.field}>{t("outputLanguage")}<select value={profile.language} onChange={e=>updateProfile({...profile,language:e.target.value as "zh"|"en"})}><option value="zh">{t("languageZh")}</option><option value="en">{t("languageEn")}</option></select></label></div>}
  {step===1 && demo && <Button className={styles.lime} onClick={()=>{start();setStep(1);}}>{t("start")}<ArrowRight size={14}/></Button>}
  {step===2 && <><div className={styles.tags}>{[0,1,2,3].map(index=><button key={index} type="button" aria-pressed={camera===index} onClick={()=>setCamera(index)}><span>0{index+1}</span>{t(`tags.${index}`)}<ChevronRight size={14}/></button>)}</div><label className={styles.slider} htmlFor={`${inputId}-angle`}>{t("angle")}<output>{appearance.stops[camera].angle}°</output><input id={`${inputId}-angle`} type="range" min="-180" max="180" value={appearance.stops[camera].angle} onChange={e=>updateAppearance({...appearance,stops:appearance.stops.map((stop,i)=>i===camera?{...stop,angle:Number(e.target.value)}:stop)})}/></label><label className={styles.slider} htmlFor={`${inputId}-zoom`}>{t("zoom")}<output>{appearance.stops[camera].zoom.toFixed(1)}×</output><input id={`${inputId}-zoom`} type="range" min="0.8" max="1.6" step="0.1" value={appearance.stops[camera].zoom} onChange={e=>updateAppearance({...appearance,stops:appearance.stops.map((stop,i)=>i===camera?{...stop,zoom:Number(e.target.value)}:stop)})}/></label><label className={styles.check}><input type="checkbox" checked={appearance.motion} onChange={e=>updateAppearance({...appearance,motion:e.target.checked})}/>{t("motion")}</label><p className={styles.smallNote}>{t("cameraHint")}</p></>}
  {step===3 && <><ul className={styles.checks}>{[0,1,2].map(i=><li key={i}><Check size={14}/>{t(`checks.${i}`)}</li>)}</ul><label className={styles.check}><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{t("review")}</label><Button className={styles.lime} onClick={()=>download(false)} disabled={demo || !reviewed}><ArrowDownToLine size={15}/>{t("download")}</Button>{actorId ? <Button variant="outline" onClick={()=>void save()} disabled={demo||busy||!reviewed}><Save size={15}/>{t(busy?"saving":"save")}</Button> : <><Button variant="outline" asChild><Link href="/login?callbackUrl=%2Fmarket%2Fresume-website">{t("loginToSave")}</Link></Button><p className={styles.smallNote}>{t("loginNote")}</p></>}<Button variant="ghost" onClick={()=>download(true)} disabled={demo}>{t("downloadDraft")}</Button><p className={styles.smallNote}>{t("draftNote")}</p>{state && <><p className={styles.smallNote}>{t("private")}</p><Link className={styles.savedLink} href={`/projects/${state.projectId}/visual-website`}>{t("savedLink")} ↗</Link>{state.versions.length>0 && <div className={styles.history}><label htmlFor={`${inputId}-version`}>{t("versions")}</label><select id={`${inputId}-version`} value={selectedVersion} onChange={e=>setSelectedVersion(Number(e.target.value))}>{state.versions.map(v=><option value={v.version} key={v.version}>{t("version",{version:v.version})}</option>)}</select><Button size="sm" variant="outline" onClick={restore}><RotateCcw size={13}/>{t("restore")}</Button></div>}</>}{execution && actorId && !demo && <details className={styles.ai}><summary><Sparkles size={14}/>{t("ai")}</summary><p className={styles.smallNote}>{t("aiNotice")}</p><MarketWorkflowRun {...execution} profileInput={profile} onUseCopy={copy=>{updateProfile({...profile,about:copy.summary,projects:profile.projects.map((p,i)=>({...p,description:copy.projects[i].description}))});setNotice(t("copyApplied"));}}/></details>}</>}
  {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
  <div className={styles.stepFooter}>{step>0 && <Button variant="ghost" size="sm" onClick={()=>setStep(step-1)}><ArrowLeft size={13}/>{t("previous")}</Button>}{step<3 && <Button size="sm" className={styles.lime} onClick={()=>{if(demo)start();setStep(step+1);}}>{t("next")}<ArrowRight size={13}/></Button>}</div></div>
  <section className={styles.preview} aria-label={t("preview")}><div className={styles.previewToolbar}><span><i/>{t("live")}</span><div><button aria-label={t("desktop")} aria-pressed={!mobile} onClick={()=>setMobile(false)}><Monitor size={16}/></button><button aria-label={t("mobile")} aria-pressed={mobile} onClick={()=>setMobile(true)}><Smartphone size={16}/></button></div><span className={styles.previewAddress}>portfolio.html</span></div><div className={styles.previewCanvas} data-mobile={mobile}><iframe title={t("preview")} sandbox="allow-scripts" srcDoc={preview}/></div><div className={styles.previewStatus}><span>{t(demo?"example":"editing")}</span><span>{state && !dirty?t("version",{version:state.currentVersion}):t("unsaved")}</span></div></section></div><p className={styles.source}>{t("reference")}</p>
 </div>;
}
