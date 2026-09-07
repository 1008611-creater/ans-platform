"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Domain = { id: string; slug: string; name: string; children: { id: string; slug: string; name: string }[] };
export function TemplateFilters({ domains, initialDomain = "", initialScene = "" }: { domains: Domain[]; initialDomain?: string; initialScene?: string }) {
  const [domain, setDomain] = useState(initialDomain);
  const [scene, setScene] = useState(initialScene);
  const scenes = domain ? domains.find((item) => item.slug === domain)?.children ?? [] : domains.flatMap((item) => item.children);
  return <form action="/templates" className="mb-5 flex flex-wrap items-end gap-3">
    <label className="space-y-1 text-sm">父领域
      <select name="domain" value={domain} onChange={(event) => { setDomain(event.target.value); setScene(""); }} className="block rounded-md border bg-background p-2">
        <option value="">全部领域</option>{domains.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </label>
    <label className="space-y-1 text-sm">子场景
      <select name="scene" value={scene} onChange={(event) => setScene(event.target.value)} className="block rounded-md border bg-background p-2">
        <option value="">全部场景</option>{scenes.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </label>
    <Button type="submit">筛选</Button><Button asChild variant="outline"><Link href="/templates">清除筛选</Link></Button>
  </form>;
}
