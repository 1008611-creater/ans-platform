"use client";
import Link from "next/link";
import { useVibeLanguage } from "../use-vibe-language";
import data from "@/data/vibehub/updates.json";
export default function Updates() {
  const lang = useVibeLanguage(); const en = lang === "en";
  return <main className="vh-page"><header className="vh-feature-heading"><h1>{en ? "Updates" : "更新日志"}</h1><p>{en ? "The official VibeHub development timeline." : "VibeHub 官方的功能、术语与内容更新记录。"}</p></header>
    <div className="vh-timeline">{data.days.map((day) => <section key={day.date}><time dateTime={day.date}>{day.date}</time><h2>{en ? day.milestone.titleEn : day.milestone.title}</h2><ul>{day.items.map((item) => <li key={item.text}>{en ? item.textEn : item.text}</li>)}</ul><div className="vh-topic-row">{day.terms.map((term) => <Link key={term.id} href={`/vibe-hub/${term.id}?lang=${lang}`}>{en ? term.name : term.cn}</Link>)}</div></section>)}</div>
  </main>;
}
