"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

import { Monitor, Code2, Sparkles, Frame, Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Load heavy tools only after a desktop viewport is confirmed. The page heading,
// tab shell and mobile guidance remain available in server-rendered HTML.
const PromptIde = dynamic(() => import("@/components/ide/prompt-ide").then((module) => module.PromptIde), { ssr: false });
const PromptEnhancer = dynamic(() => import("@/components/developers/prompt-enhancer").then((module) => module.PromptEnhancer), { ssr: false });
const EmbedDesigner = dynamic(() => import("@/components/developers/embed-designer").then((module) => module.EmbedDesigner), { ssr: false });
const PromptTokenizer = dynamic(() => import("@/components/developers/prompt-tokenizer").then((module) => module.PromptTokenizer), { ssr: false });

const VALID_TABS = ["enhancer", "tokenizer", "builder", "embed"] as const;
type TabValue = (typeof VALID_TABS)[number];
const TAB_HASH_CHANGE_EVENT = "developers-tab-hashchange";

function getTabFromHash(): TabValue {
  const hash = window.location.hash.slice(1);
  return VALID_TABS.includes(hash as TabValue) ? (hash as TabValue) : "enhancer";
}

function subscribeToTabHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener(TAB_HASH_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener(TAB_HASH_CHANGE_EVENT, onStoreChange);
  };
}

const DESKTOP_QUERY = "(min-width: 1024px)";

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function subscribeToDesktop(onStoreChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

export default function DevelopersPageContent() {
  const t = useTranslations("developers");
  const isDesktop = useSyncExternalStore(subscribeToDesktop, getDesktopSnapshot, () => false);
  const activeTab = useSyncExternalStore(subscribeToTabHash, getTabFromHash, () => "enhancer");

  const handleTabChange = (value: string) => {
    if (!VALID_TABS.includes(value as TabValue)) return;

    const tab = value as TabValue;

    window.history.replaceState(null, "", `#${tab}`);
    window.dispatchEvent(new Event(TAB_HASH_CHANGE_EVENT));
  };

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      <div className="hidden h-[calc(100vh-4rem-1.65rem)] flex-col overflow-hidden lg:flex">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col gap-0 overflow-hidden">
          <div className="flex h-10 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsList className="h-9 gap-2 border-0 bg-transparent p-0">
              <TabsTrigger
                value="enhancer"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                {t("promptEnhancer")}
              </TabsTrigger>
              <TabsTrigger
                value="tokenizer"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                {t("promptTokenizer")}
              </TabsTrigger>
              <TabsTrigger
                value="builder"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <Code2 aria-hidden="true" className="h-3.5 w-3.5" />
                {t("promptBuilder")}
              </TabsTrigger>
              <TabsTrigger
                value="embed"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <Frame aria-hidden="true" className="h-3.5 w-3.5" />
                {t("embedDesigner")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="enhancer" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            {isDesktop && <PromptEnhancer />}
          </TabsContent>
          <TabsContent value="tokenizer" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            {isDesktop && <PromptTokenizer />}
          </TabsContent>
          <TabsContent value="builder" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            {isDesktop && <PromptIde />}
          </TabsContent>
          <TabsContent value="embed" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            {isDesktop && <EmbedDesigner />}
          </TabsContent>
        </Tabs>
      </div>

      <div className="container flex min-h-[60vh] flex-col items-center justify-center px-4 text-center lg:hidden">
        <Monitor aria-hidden="true" className="mb-6 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-2xl font-bold">{t("desktopOnly")}</h2>
        <p className="mb-6 max-w-md text-muted-foreground">{t("desktopOnlyDescription")}</p>
        <Button asChild>
          <Link href="/prompts">{t("browsePrompts")}</Link>
        </Button>
      </div>
    </>
  );
}