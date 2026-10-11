import { Suspense } from "react";
import type { Metadata } from "next";
import { VibeHubFooter } from "./footer";
import { VibeHubShell } from "./shell";

export const metadata: Metadata = {
  title: { default: "VibeHub | ANS", template: "%s | VibeHub · ANS" },
  description: "Vibe Coding 可视化术语图鉴：前端、后端、AI、Git、设计风格与交互练习。",
  icons: { icon: "/vibe-hub/oil-favicon.png" },
  alternates: { canonical: "/vibe-hub" },
  openGraph: { title: "VibeHub · ANS", images: ["/vibe-hub/social-card-zh.png"] },
};

export default function VibeHubLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><VibeHubShell>{children}<VibeHubFooter /></VibeHubShell></Suspense>;
}
