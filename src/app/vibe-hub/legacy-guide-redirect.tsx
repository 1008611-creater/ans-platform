"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// A fragment never reaches the server. Read it before leaving the legacy page.
export function LegacyGuideRedirect({ href, title, loading }: { href: string; title: string; loading: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href + window.location.hash, { scroll: false });
  }, [href, router]);

  return <main className="ans-knowledge-container ans-guide-page">
    <h1>{title}</h1>
    <p role="status">{loading}</p>
    <a href={href} className="ans-editorial-link">{title}</a>
  </main>;
}
