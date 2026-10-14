"use client";
import { useEffect, useRef, useState } from "react";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ArrowUpRight, Brain, BriefcaseBusiness, Check, CircleDot, FileText, FolderOpen, Heart, Link2, Orbit, PawPrint, Plus, Save, Sparkles, Zap } from "lucide-react";
import { useMarketActorId } from "@/components/marketplace/account-boundary";
import { BilingualToggle } from "@/components/layout/bilingual-toggle";
import { VisualWebsiteStudio } from "./visual-website-studio";
import styles from "./visual-website-experience.module.css";

type StudioProps = Parameters<typeof VisualWebsiteStudio>[0];
const portraits = [1,2,3,4,5,6,7,9,10,11,12,13];
const looks = ["clay-figure", "pixel-voxel", "vinyl-figure", "picasso"];
const tagIcons = [BriefcaseBusiness, Heart, Brain, PawPrint];
const useIcons = [FileText, FolderOpen, Link2, BriefcaseBusiness];
const featureIcons = [Orbit, Save, Zap];
const underline = "M0.312 89.67C82.812 23.67 273.312 -19.829 259.812 10.171C246.312 40.171 127.812 119.671 193.812 89.671C259.812 59.671 518.312 10.171 769.312 10.171";

export function VisualWebsiteExperience({execution, licenseTerms}: Pick<StudioProps,"execution"> & {licenseTerms?:string}) {
 const t=useTranslations("visualWebsite.landing"), actor=useMarketActorId();
 const [editing,setEditing]=useState(false),[started,setStarted]=useState(false),[stop,setStop]=useState(0),[look,setLook]=useState(0);
 const iframe=useRef<HTMLIFrameElement>(null);
 const send=(index:number)=>iframe.current?.contentWindow?.postMessage({channel:"ans-visual-scene",type:"select",index},window.location.origin);
 useEffect(()=>{const ready=(event:MessageEvent)=>{if(event.source===iframe.current?.contentWindow && event.origin===window.location.origin && event.data?.channel==="ans-visual-scene" && event.data?.type==="ready")send(stop);};window.addEventListener("message",ready);return()=>window.removeEventListener("message",ready);},[stop]);
 function start(){setStarted(true);setEditing(true);window.scrollTo({top:0,behavior:"instant"});}
 return <div data-visual-experience className={styles.experience} data-editing={editing}>
  <a className={styles.skip} href={editing?"#visual-editor":"#visual-content"}>{t("navHow")}</a>
  <nav className={styles.nav} aria-label={t("brand")}>
   <Link href="/market" className={styles.logo} aria-label={t("back")}><span className={styles.logoMark}><Orbit size={25}/></span><b>ANS<span>3d</span></b></Link>
   <div className={styles.navLinks}>{editing?<button onClick={()=>setEditing(false)}><ArrowLeft size={14}/>{t("returnPreview")}</button>:<><a href="#visual-pricing">{t("navPricing")}</a><a href="#visual-faq">{t("navFaq")}</a></>}</div>
   <div className={styles.navRight}><BilingualToggle/>{actor?<Link className={styles.login} href="/projects">{t("benefits.1")}</Link>:<Link className={styles.login} href="/login?callbackUrl=%2Fmarket%2Fresume-website">{t("login")}</Link>}</div>
  </nav>
  {started && <main id="visual-editor" hidden={!editing} className={styles.studio}><VisualWebsiteStudio execution={execution} immersive beginEditing onReturn={()=>setEditing(false)}/></main>}{!editing && <main id="visual-content">
   <section className={styles.hero}>
    <h1>{t("heroTop")}<br/><span>{t("heroAccent")}<svg viewBox="0 0 770 97" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d={underline} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg></span></h1>
    <p>{t("heroDescription")}</p><button className={styles.primary} onClick={start}>{t("cta")}<ArrowRight size={16}/></button>
   </section>
   <div className={styles.gallery} aria-label={t("lookTitle")}><div className={styles.galleryTrack}>{[0,1].map(copy=><div key={copy} className={styles.galleryGroup} aria-hidden={copy===1}>{portraits.map((number,index)=><div className={styles.portrait} key={number}><Image unoptimized priority={copy===0&&index<6} src={`/visual-portfolio/reference/banner/${String(number).padStart(2,"0")}.webp`} width={340} height={460} alt={copy===0?t("heroAlt",{index:index+1}):""}/></div>)}</div>)}</div></div>
   <div className={styles.benefits}>{featureIcons.map((Icon,index)=><div key={index}><span><Icon size={20}/></span><div><strong>{t(`benefits.${index}`)}</strong><p>{t(`benefitNotes.${index}`)}</p></div></div>)}</div>
   <section className={styles.section} id="visual-tour">
    <div className={styles.sectionHead}><span>{t("coreKicker")}</span><h2>{t("coreTitle")}</h2><p>{t("coreDescription")}</p></div>
    <div className={styles.tour}>
     <aside className={styles.tagList}><button className={styles.overview} aria-pressed={stop===0} onClick={()=>{setStop(0);send(0);}}><span><Orbit size={22}/></span><div><strong>{t("overview")}</strong><small>{t("overviewTag")}</small></div><CircleDot size={20}/></button><p className={styles.smallLabel}>{t("pickTag")}</p><div>{tagIcons.map((Icon,index)=><button key={index} className={styles.tag} aria-pressed={stop===index+1} onClick={()=>{setStop(index+1);send(index+1);}}><span>0{index+1}</span><Icon size={21}/><strong>{t(`tags.${index}`)}</strong><small>{t(`tagTypes.${index}`)}</small></button>)}</div><button className={styles.more} onClick={start}><Plus size={21}/><span><strong>{t("more")}</strong><small>{t("moreDescription")}</small></span></button><button className={styles.outlineCta} onClick={start}>{t("cta")}<span><ArrowUpRight size={18}/></span></button></aside>
     <div className={styles.scene}>
      <iframe ref={iframe} src="/visual-portfolio/scene.html?v=7" title={t("sceneTitle")} sandbox="allow-scripts allow-same-origin" loading="lazy"/>
      <div className={styles.sourceBadge}><Image unoptimized src="/visual-portfolio/reference/home/labelman.webp" width={44} height={44} alt={t("sourcePhoto")}/><span><small><Sparkles size={11}/>{t("liveModel")}<i>PHOTO → 3D</i></small><strong>{t("modelNote")}</strong></span></div>
      {stop>0&&<div key={stop} className={styles.storyCard}><span>{t(`tagTypes.${stop-1}`)}</span><h3>{t(`tags.${stop-1}`)}</h3><p>{t(`tagDescriptions.${stop-1}`)}</p></div>}
     </div>
    </div>
   </section>
   <section className={styles.section}>
    <div className={styles.sectionHead}><span>{t("usesKicker")}</span><h2>{t("usesTitle")}</h2><p>{t("usesDescription")}</p></div>
    <div className={styles.uses}>{useIcons.map((Icon,index)=><article key={index}><div><Icon size={22}/><span>{t(`useTypes.${index}`)}</span></div><h3>{t(`uses.${index}`)}</h3><p>{t(`useDescriptions.${index}`)}</p></article>)}</div>
   </section>
   <section className={styles.section}>
    <div className={styles.sectionHead}><span>{t("lookKicker")}</span><h2>{t("lookTitle")}</h2><p>{t("lookDescription")}</p></div>
    <div className={styles.looks}><div className={styles.lookMain}><div className={styles.lookPoster} key={look}><Image unoptimized src={`/visual-portfolio/reference/styles/${looks[look]}.webp`} width={800} height={1000} alt={t(`styles.${look}`)}/><div className={styles.lookPosterText}><small>{t(`styleCodes.${look}`)} <span>AI</span></small><h3>{t(`styles.${look}`)}</h3><span>0{look+1} / 04</span></div></div><div className={styles.lookCaption}><p>{t(`styleNotes.${look}`)}</p><button className={styles.outlineCta} onClick={start}>{t("styleCta")}<span><ArrowUpRight size={18}/></span></button></div></div><aside className={styles.lookSelector}><span className={styles.smallLabel}>{t("selectLook")}</span><div className={styles.lookThumbs}>{looks.map((file,index)=><button key={file} aria-label={t(`styles.${index}`)} aria-pressed={look===index} onClick={()=>setLook(index)}><Image unoptimized src={`/visual-portfolio/reference/styles/${file}.webp`} width={150} height={190} alt=""/>{look===index&&<span><Check size={13}/></span>}</button>)}</div><div className={styles.lookStats}>{["STYLES","OUTPUT","CONTROL"].map((label,index)=><div key={label}><span>{label}</span><strong>{t(`styleStats.${index}`)}</strong></div>)}</div><p className={styles.referenceNote}>{t("styleNote")}</p></aside></div>
   </section>
   <section className={styles.section} id="visual-how"><div className={styles.sectionHead}><span>{t("howKicker")}</span><h2>{t("howTitle")}</h2><p>{t("howDescription")}</p></div><div className={styles.how}>{[0,1,2,3].map(index=><article key={index}><div><Image unoptimized src={`/visual-portfolio/reference/steps/0${index+1}.webp`} width={650} height={450} alt={t(`howTitles.${index}`)}/></div><span>0{index+1}</span><h3>{t(`howTitles.${index}`)}</h3><p>{t(`howDescriptions.${index}`)}</p></article>)}</div></section>
   <section className={styles.section} id="visual-pricing"><div className={styles.sectionHead}><span>{t("pricingKicker")}</span><h2>{t("pricingTitle")}</h2><p>{t("pricingDescription")}</p></div><div className={styles.pricing}>{[0,1,2].map(index=><article key={index}><small>{t(`planNames.${index}`)}</small><p>{t(`planDescriptions.${index}`)}</p><strong>{t(`planPrices.${index}`)}</strong><button className={index===0?styles.primary:styles.outlineCta} onClick={index===0?start:()=>document.getElementById("visual-faq")?.scrollIntoView({behavior:"smooth"})}>{t(`planCtas.${index}`)}<ArrowRight size={14}/></button><ul>{(t.raw(`planFeatures.${index}`) as string[]).map(feature=><li key={feature}><Check size={13}/>{feature}</li>)}</ul></article>)}</div><p className={styles.referenceNote}>{t("pricingNote")}</p></section>
   <section className={`${styles.section} ${styles.faq}`} id="visual-faq"><div className={styles.sectionHead}><span>{t("faqKicker")}</span><h2>{t("faqTitle")}</h2><p>{t("faqDescription")}</p></div><div className={styles.faqList}>{[0,1,2,3,4,5].map(index=><details key={index} open={index===0}><summary>{t(`faqQuestions.${index}`)}<Plus size={16}/></summary><p>{t(`faqAnswers.${index}`)}</p></details>)}</div></section>
   <section className={styles.closing}><span className={styles.smallLabel}>{t("closingKicker")}</span><h2>{t("closingTitle")}</h2><p>{t("closingDescription")}</p><button className={styles.primary} onClick={start}>{t("cta")}<ArrowRight size={16}/></button><small>{t("closingNote")}</small></section>
  </main>}
  <footer className={styles.footer}><div className={styles.footerBrand}><Link href="/market" className={styles.logo}><Orbit size={25}/><b>ANS<span>3d</span></b></Link><p>{t("footerDescription")}</p></div><div><h3>{t("footerGroups.0")}</h3><a href="#visual-pricing">{t("footerLinks.0")}</a></div><div><h3>{t("footerGroups.1")}</h3><Link href="/projects">{t("footerLinks.1")}</Link><Link href="/settings">{t("footerLinks.2")}</Link></div><div><h3>{t("footerGroups.2")}</h3><a href="#visual-faq">{t("footerLinks.3")}</a><Link href="/privacy">{t("footerLinks.4")}</Link><Link href="/terms">{t("footerLinks.5")}</Link></div><div className={styles.footerBottom}><span>© {t("footerCopyright")}</span><small>{t("referenceNote")}</small><BilingualToggle/></div>{licenseTerms&&<details><summary>{t("modelNote")}</summary><p>{licenseTerms}</p></details>}</footer>
 </div>;
}
