"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { PRESET_STICKERS, STICKER_CATEGORIES, type PresetSticker, type StickerStyle } from "@/contracts/visual-stickers";
import styles from "./visual-tour-editor.module.css";
export function VisualStickerLibrary({selected,onSelect}:{selected:string|undefined;onSelect:(preset:PresetSticker)=>void}) {
 const t=useTranslations("visualWebsite.tour");
 const [style,setStyle]=useState<StickerStyle>("doodle"),[search,setSearch]=useState(""),[expanded,setExpanded]=useState<string[]>([]);
 const query=search.trim().toLocaleLowerCase();
 const visible=PRESET_STICKERS.filter(item=>item.style===style&&(!query||`${t(`stickerLabels.${item.key}`)} ${item.key}`.toLocaleLowerCase().includes(query)));
 return <section aria-label={t("presetStickers")}>
  <div className={styles.stickerStyles} role="group" aria-label={t("stickerStyle")}>{(["doodle","retro"] as const).map(value=><button key={value} type="button" aria-pressed={style===value} onClick={()=>setStyle(value)}>{t(`stickerStyles.${value}`)}</button>)}</div>
  <Input aria-label={t("stickerSearch")} placeholder={t("stickerSearch")} value={search} onChange={event=>setSearch(event.target.value)}/>
  <p className={styles.note}>{t("stickerCount",{count:visible.length})}</p>
  {!visible.length&&<p role="status" className={styles.note}>{t("stickerEmpty")}</p>}
  {STICKER_CATEGORIES.map(category=>{
   const items=visible.filter(item=>item.category===category);if(!items.length)return null;
   const open=!!query||expanded.includes(category);
   return <section key={category} aria-label={t(`stickerCategories.${category}`)}>
    <h3>{t(`stickerCategories.${category}`)}</h3>
    <div className={styles.stickerGrid}>{(open?items:items.slice(0,3)).map(item=><button className={styles.imageSticker} type="button" key={item.id} aria-pressed={selected===item.id} onClick={()=>onSelect(item)}>
     <Image unoptimized loading="lazy" width={72} height={72} src={item.path} alt=""/><span>{t(`stickerLabels.${item.key}`)}</span>
    </button>)}</div>
    {!query&&items.length>3&&<button type="button" className={styles.stickerExpand} aria-expanded={open} onClick={()=>setExpanded(previous=>open?previous.filter(value=>value!==category):[...previous,category])}>{t(open?"stickerLess":"stickerMore",{count:items.length})}</button>}
   </section>;
  })}
 </section>;
}
