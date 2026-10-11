import type { Metadata } from "next";
export const metadata: Metadata = { title: "VibeHub · Frontend Terms for Vibe Coding", description: "A visual guide to interface terms, interaction patterns, and precise prompts for AI coding agents.", icons: { icon: "/vibe-hub/oil-favicon.png" }, openGraph: { title: "VibeHub · Frontend Terms for Vibe Coding", description: "A visual guide to interface terms and interaction patterns.", images: ["/vibe-hub/social-card-en.png"] } };
export default function VibeHubLayout({children}:{children:React.ReactNode}){return children;}
