"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { agriPublicPublicationSchema, type AgriPublicPublication } from "@/contracts/agri-publications";
import { PublicationError, publicationApi, readPublicationResponse, PublicContent } from "./agri-publications";
const listSchema=z.object({competitionId:z.string().min(1),items:z.array(agriPublicPublicationSchema),nextCursor:z.string().nullable()}).strict();
export function AgriPublicationsShowcase({publicationId}:{publicationId?:string}){
  const t=useTranslations("product.agriPublications"),locale=useLocale();
  const[list,setList]=useState<z.infer<typeof listSchema>|null>(null),[item,setItem]=useState<AgriPublicPublication|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const alive=useRef(true),generation=useRef(0);
  const clear=useCallback(()=>{++generation.current;setList(null);setItem(null);setError("");},[]);
  const load=useCallback(async(cursor?:string)=>{
    const gen=++generation.current;setList(null);setItem(null);setLoading(true);setError("");
    try{
      const raw=await readPublicationResponse(publicationApi+"/public"+(publicationId?"/"+encodeURIComponent(publicationId):cursor?"?"+new URLSearchParams({cursor}):""));
      const parsed=publicationId?agriPublicPublicationSchema.safeParse(raw):listSchema.safeParse(raw);
      if(!parsed.success)throw new PublicationError("INTERNAL_ERROR");
      if(!alive.current||gen!==generation.current)return;
      if(publicationId){const next=parsed.data as AgriPublicPublication;if(next.id!==publicationId)throw new PublicationError("INTERNAL_ERROR");setItem(next);}else setList(parsed.data as z.infer<typeof listSchema>);
    }catch(e){if(alive.current&&gen===generation.current)setError(e instanceof PublicationError?e.code:"INTERNAL_ERROR");}
    finally{if(alive.current&&gen===generation.current)setLoading(false);}
  },[publicationId]);
  useEffect(()=>{
    const requests=generation;alive.current=true;void load();
    const restore=()=>{if(document.visibilityState!=="hidden")void load();};
    const visibility=()=>{if(document.visibilityState==="hidden")clear();else restore();};
    window.addEventListener("focus",restore);window.addEventListener("pageshow",restore);window.addEventListener("pagehide",clear);document.addEventListener("visibilitychange",visibility);
    return()=>{alive.current=false;++requests.current;window.removeEventListener("focus",restore);window.removeEventListener("pageshow",restore);window.removeEventListener("pagehide",clear);document.removeEventListener("visibilitychange",visibility);};
  },[load,clear]);
  const at=(value:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  const errorText=["AGRI_NOT_CONFIGURED","AGRI_WORKSPACE_NOT_CONFIGURED","AGRI_EDITION_NOT_CONFIGURED"].includes(error)?t("notConfigured"):error==="AGRI_PUBLICATION_NOT_FOUND"||error==="NOT_FOUND"?t("unavailable"):t("errors.INTERNAL_ERROR");
  const pioneerShowcases = [
    {
      title: locale === "zh" ? "智灌云脑 · 日光温室蒸腾预测与精准水肥一体 Agent" : "Smart Irrigation Brain · Greenhouse Evapotranspiration & Fertigation Agent",
      track: locale === "zh" ? "智慧种植与精准水肥赛道 · 先锋参考样板" : "Smart Planting & Fertigation · Reference Sample",
      cover: "/catalog/agrihackathon-v1/smart-irrigation.svg",
      summary: locale === "zh" ? "融合土壤多深度墒情传感器与气象预报数据，通过 DeepSeek-V3 动态规划未来 24 小时滴灌脉冲策略，节水 27%。" : "Fuses multi-depth soil moisture sensors with weather forecasts via DeepSeek-V3 to schedule 24h drip irrigation pulses.",
      hash: "SHA-256 · 8f4e...c91a",
      href: "/competitions/agrihackathon/wall",
    },
    {
      title: locale === "zh" ? "植保慧眼 · 玉米与番茄叶部病虫害边缘端毫秒级早筛" : "CropGuard Vision · Edge Millisecond Early Screening for Maize & Tomato Diseases",
      track: locale === "zh" ? "病虫害多模态早筛赛道 · 先锋参考样板" : "Crop Disease Early Screening · Reference Sample",
      cover: "/catalog/agrihackathon-v1/crop-disease-edge.svg",
      summary: locale === "zh" ? "基于轻量化 YOLOv11-Nano + Qwen2.5-VL 多模态农艺处方生成，支持田间无网离线推理与防治药剂配比建议。" : "Combines lightweight YOLOv11-Nano with Qwen2.5-VL agronomic prescriptions for offline field inference.",
      hash: "SHA-256 · 3b19...70d2",
      href: "/competitions/agrihackathon/wall",
    },
    {
      title: locale === "zh" ? "牧瞳巡检 · 规模化牧场畜禽体况评分与异常行为预警" : "LivestockEye · Automated Body Condition Scoring & Anomaly Alerting",
      track: locale === "zh" ? "畜牧巡检与农业机器人赛道 · 先锋参考样板" : "Livestock Vision & Robotics · Reference Sample",
      cover: "/catalog/agrihackathon-v1/livestock-vision.svg",
      summary: locale === "zh" ? "利用双目深度相机与姿态关键点追踪，全天候监测奶牛跛行、反刍时长与采食节律，自动推送兽医干预工单。" : "Uses stereo depth cameras and pose keypoint tracking to monitor lameness, rumination, and feeding rhythms.",
      hash: "SHA-256 · e5a2...41f8",
      href: "/competitions/agrihackathon/wall",
    },
  ];
  return <section className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-prose text-sm leading-6 text-muted-foreground">{t("showcaseHint")}</p><Button variant="outline" disabled={loading} onClick={()=>void load()}>{t("refresh")}</Button></div>
    {loading&&<div role="status" className="space-y-3"><span className="sr-only">{t("loading")}</span><Skeleton className="h-5 w-2/3"/><Skeleton className="h-4 w-1/2"/></div>}
    {error&&<div className="space-y-3 py-6"><p role="alert" className="text-sm">{errorText}</p>{["AGRI_NOT_CONFIGURED","AGRI_WORKSPACE_NOT_CONFIGURED","AGRI_EDITION_NOT_CONFIGURED"].includes(error)&&<div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{t("browseWall")}</WorkspaceLink></Button><Button asChild variant="ghost" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{t("goToSubmissions")}</WorkspaceLink></Button></div>}</div>}
    {list&&<>{!list.items.length&&<div className="space-y-6">
      <div className="space-y-3 rounded-2xl border bg-muted/20 p-6"><h2 className="font-semibold">{t("empty")}</h2><p className="max-w-prose text-sm leading-6 text-muted-foreground">{t("emptyHint")}</p><div className="flex flex-wrap gap-2 pt-1"><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{t("browseWall")}</WorkspaceLink></Button><Button asChild variant="ghost" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{t("goToSubmissions")}</WorkspaceLink></Button></div></div>
      <div className="space-y-3" data-testid="agri-showcase-pioneer-samples">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{locale === "zh" ? "三大赛道先锋参考样板（组委会正式终审归档前可参考）" : "Pioneer Reference Showcase Samples Across 3 Tracks"}</h3>
          <span className="text-xs text-muted-foreground">{locale === "zh" ? "支持一键前往实时作品墙或提交同款工程" : "Inspect live wall or submit your own project"}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pioneerShowcases.map((sample, idx) => (
            <div key={idx} className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                <img src={sample.cover} alt={sample.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <span className="absolute bottom-2.5 left-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  {sample.track}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                <div className="space-y-1.5">
                  <h4 className="font-semibold leading-snug text-foreground">{sample.title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{sample.summary}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs">
                  <span className="font-mono text-[11px] text-muted-foreground">{sample.hash}</span>
                  <WorkspaceLink href={sample.href} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                    {locale === "zh" ? "查看实时作品墙 →" : "Live Wall →"}
                  </WorkspaceLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>}<ul className="divide-y">{list.items.map(row=><li key={row.id} className="space-y-4 py-6"><p className="text-xs text-muted-foreground">{t(row.basis==="FROZEN"&&!row.correctionPreviousSubmissionId&&row.stage==="PRELIMINARY"?"versionPreliminaryFrozen":row.basis==="FROZEN"?"versionFrozen":"versionCurrent")}{row.correctionPreviousSubmissionId?" · "+t("versionCorrection"):""} · {t("stage."+row.stage)}</p><PublicContent content={row.content} headingLevel="h2"/><div className="flex flex-wrap items-center gap-4"><span className="text-xs text-muted-foreground">{t("publishedAt",{at:at(row.publishedAt)})}</span><Button asChild variant="outline"><WorkspaceLink prefetch={false} href={"/competitions/agrihackathon/showcase/"+encodeURIComponent(row.id)}>{t("viewProject")}</WorkspaceLink></Button></div></li>)}</ul>{list.nextCursor&&<Button variant="outline" disabled={loading} onClick={()=>void load(list.nextCursor!)}>{t("nextPage")}</Button>}</>}
    {item&&<article className="space-y-5"><p className="text-sm text-muted-foreground">{t(item.basis==="FROZEN"&&!item.correctionPreviousSubmissionId&&row.stage==="PRELIMINARY"?"versionPreliminaryFrozen":item.basis==="FROZEN"?"versionFrozen":"versionCurrent")}{item.correctionPreviousSubmissionId?" · "+t("versionCorrection"):""} · {t("stage."+item.stage)}</p><PublicContent content={item.content} headingLevel="h2"/><dl className="space-y-2 border-t pt-4 text-xs text-muted-foreground"><div><dt>{t("submissionVersion")}</dt><dd className="break-all">{item.artifactVersionId}</dd></div><div><dt>{t("acceptedAt")}</dt><dd>{at(item.acceptedAt)}</dd></div><div><dt>{t("publishedLabel")}</dt><dd>{at(item.publishedAt)}</dd></div></dl></article>}
  </section>;
}
