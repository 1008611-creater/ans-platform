"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { imeBlocks } from "@/lib/ui/ime-enter-guard";
export type AssociationChoice = { slug: string; title: string };
export function AssociationPicker({ kind, selected, choices, onChange }: {
  kind: "workflows" | "offers"; selected: string[]; choices: AssociationChoice[]; onChange: (slugs: string[]) => void;
}) {
  const t = useTranslations("product.connectionsAdmin");
  const id = useId();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  function add() {
    const slug = value.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) { setInvalid(true); return; }
    if (!selected.includes(slug) && selected.length < 8) onChange([...selected, slug]);
    setValue(""); setInvalid(false);
  }
  return <div className="space-y-3">
    <label htmlFor={id} className="block text-sm font-medium">{t(kind)}</label>
    <div className="flex gap-2"><Input id={id} list={id + "-choices"} value={value} disabled={selected.length >= 8} aria-invalid={invalid} aria-describedby={id + "-hint"} placeholder={t("placeholder")} onChange={event => { setValue(event.target.value); setInvalid(false); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!imeBlocks(event)) add(); } }} />
      <Button type="button" variant="outline" onClick={add} disabled={!value.trim() || selected.length >= 8}><Plus size={15} aria-hidden="true" /><span>{t("add")}</span></Button></div>
    <datalist id={id + "-choices"}>{choices.filter(choice => !selected.includes(choice.slug)).map(choice => <option key={choice.slug} value={choice.slug}>{choice.title}</option>)}</datalist>
    <p id={id + "-hint"} className="text-xs leading-6 text-muted-foreground">{t("hint")}</p>
    {invalid && <p role="alert" className="text-sm text-destructive">{t("invalid")}</p>}
    {selected.length > 0 && <ul className="divide-y border-y">{selected.map(slug => <li key={slug} className="flex min-w-0 items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{choices.find(choice => choice.slug === slug)?.title ?? slug}</p><p className="break-all text-xs text-muted-foreground">{slug}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => onChange(selected.filter(item => item !== slug))} aria-label={t("remove", { slug })}><X size={15} aria-hidden="true" /></Button></li>)}</ul>}
  </div>;
}
