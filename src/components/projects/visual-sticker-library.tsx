"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { PRESET_STICKERS, STICKER_CATEGORIES, presetSticker, type PresetSticker, type StickerStyle, type StickerCategory } from "@/contracts/visual-stickers";
import styles from "./visual-tour-editor.module.css";

export function VisualStickerLibrary({ selected, onSelect }: { selected: string | undefined; onSelect: (preset: PresetSticker) => void }) {
 const t = useTranslations("visualWebsite.tour");
 const [style, setStyle] = useState<StickerStyle | "all">("all");
 const [category, setCategory] = useState<StickerCategory | "all">("all");
 const [search, setSearch] = useState("");
 const [expanded, setExpanded] = useState<string[]>([]);
 const query = search.trim().toLocaleLowerCase();
 const visible = PRESET_STICKERS.filter(item =>
  (style === "all" || item.style === style) && (category === "all" || item.category === category) &&
  (!query || `${t(`stickerLabels.${item.key}`)} ${item.keywords ?? ""} ${item.key.replaceAll("-", " ")} ${item.key} ${t(`stickerCategories.${item.category}`)} ${item.style}`.toLocaleLowerCase().includes(query)));
 const chosen = selected ? presetSticker(selected) : undefined;
 return <section aria-label={t("presetStickers")}>
  <div className={styles.stickerStyles} role="group" aria-label={t("stickerStyle")}>
   {(["all", "doodle", "retro", "fluent"] as const).map(value => <button key={value} type="button" aria-pressed={style === value} onClick={() => setStyle(value)}>{t(`stickerStyles.${value}`)}</button>)}
  </div>
  <div className={styles.stickerFilters}>
   <Input aria-label={t("stickerSearch")} placeholder={t("stickerSearch")} value={search} onChange={event => setSearch(event.target.value)}/>
   <select aria-label={t("stickerCategory")} value={category} onChange={event => setCategory(event.target.value as StickerCategory | "all")}>
    <option value="all">{t("stickerAllCategories")}</option>
    {STICKER_CATEGORIES.map(value => <option key={value} value={value}>{t(`stickerCategories.${value}`)}</option>)}
   </select>
  </div>
  <p className={styles.note} role="status">{t("stickerCount", { count: visible.length })}{chosen && <span className={styles.stickerSelected}>{t("stickerSelected", { name: t(`stickerLabels.${chosen.key}`) })}</span>}</p>
  {!visible.length && <div className={styles.stickerEmpty}><p>{t("stickerEmpty")}</p><button type="button" onClick={() => { setSearch(""); setCategory("all"); setStyle("all"); }}>{t("stickerClear")}</button></div>}
  {STICKER_CATEGORIES.map(group => {
   const items = visible.filter(item => item.category === group);
   if (!items.length) return null;
   const open = !!query || category !== "all" || expanded.includes(group);
   return <section key={group} aria-label={t(`stickerCategories.${group}`)}>
    <h3>{t(`stickerCategories.${group}`)} <span className={styles.stickerGroupCount}>{items.length}</span></h3>
    <div className={styles.stickerGrid}>{(open ? items : items.slice(0, 6)).map(item => <button className={styles.imageSticker} type="button" key={item.id} aria-label={`${t(`stickerLabels.${item.key}`)} · ${t(`stickerStyles.${item.style}`)}`} aria-pressed={selected === item.id} onClick={() => onSelect(item)}>
     <Image unoptimized loading="lazy" width={72} height={72} src={item.path} alt=""/><span>{t(`stickerLabels.${item.key}`)}</span>
    </button>)}</div>
    {!query && category === "all" && items.length > 6 && <button type="button" className={styles.stickerExpand} aria-expanded={open} onClick={() => setExpanded(previous => open ? previous.filter(value => value !== group) : [...previous, group])}>{t(open ? "stickerLess" : "stickerMore", { count: items.length })}</button>}
   </section>;
  })}
  <a className={styles.stickerAttribution} href="/visual-portfolio/stickers/LICENSE.fluent-emoji" target="_blank" rel="noopener noreferrer">{t("stickerLicense")} ↗</a>
 </section>;
}
