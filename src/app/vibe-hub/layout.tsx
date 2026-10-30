import { Suspense } from "react";
import type { Metadata } from "next";
import { VibeHubFooter } from "./footer";
import { VibeHubShell } from "./shell";
import { RouteMessages } from "@/components/providers/route-messages";

export const metadata: Metadata = {
  title: { default: "ANS VibeHub", template: "%s | ANS VibeHub" },
  description: "ANS 的知识与实践入口：查懂术语，整理真实资料，用项目与工作流完成自己的作品。",
  icons: { icon: "/favicon/favicon.svg", apple: "/favicon/apple-touch-icon.png" },
  alternates: { canonical: "/vibe-hub" },
  openGraph: { title: "ANS VibeHub", siteName: "ANS VibeHub", images: ["/favicon/web-app-manifest-512x512.png"] },
};

export default function VibeHubLayout({ children }: { children: React.ReactNode }) {
  return <RouteMessages><Suspense><VibeHubShell>{children}<VibeHubFooter /></VibeHubShell></Suspense></RouteMessages>;
}
