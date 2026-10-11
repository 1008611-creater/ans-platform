import { Suspense } from "react";
import type { Metadata } from "next";
import { VibeHubFooter } from "./footer";
import { VibeHubShell } from "./shell";

export const metadata: Metadata = {
  title: { default: "ANS VibeHub", template: "%s | ANS VibeHub" },
  description: "Vibe Coding 可视化术语图鉴：前端、后端、AI、Git、设计风格与交互练习。",
  icons: { icon: "/favicon/favicon.svg", apple: "/favicon/apple-touch-icon.png" },
  alternates: { canonical: "/vibe-hub" },
  openGraph: { title: "ANS VibeHub", siteName: "ANS VibeHub", images: ["/favicon/web-app-manifest-512x512.png"] },
};

export default function VibeHubLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><VibeHubShell>{children}<VibeHubFooter /></VibeHubShell></Suspense>;
}
