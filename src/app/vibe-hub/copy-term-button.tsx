"use client";
import { useState } from "react";
export function CopyTermButton({text}:{text:string}){const [copied,setCopied]=useState(false); return <button onClick={async()=>{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1400)}} className="rounded-full border border-[#ded8cf] px-4 py-2 text-sm transition hover:border-[#8274d9]">{copied?"Copied":"Copy prompt"}</button>}
