"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { PromptIde } from "@/components/ide/prompt-ide";
import { PromptEnhancer } from "@/components/developers/prompt-enhancer";
import { EmbedDesigner } from "@/components/developers/embed-designer";
import { PromptTokenizer } from "@/components/developers/prompt-tokenizer";
import { Monitor, Code2, Sparkles, Frame, Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function DevelopersPageContent() {
  const t = useTranslations("developers");
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
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("promptEnhancer")}
              </TabsTrigger>
              <TabsTrigger
                value="tokenizer"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              >
                <Hash className="h-3.5 w-3.5" />
                {t("promptTokenizer")}
              </TabsTrigger>
              <TabsTrigger
                value="builder"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              >
                <Code2 className="h-3.5 w-3.5" />
                {t("promptBuilder")}
              </TabsTrigger>
              <TabsTrigger
                value="embed"
                className="h-9 gap-1.5 rounded-none border-0 border-b-2 border-b-transparent px-3 py-2 text-sm data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              >
                <Frame className="h-3.5 w-3.5" />
                {t("embedDesigner")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="enhancer" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <PromptEnhancer />
          </TabsContent>
          <TabsContent value="tokenizer" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <PromptTokenizer />
          </TabsContent>
          <TabsContent value="builder" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <PromptIde />
          </TabsContent>
          <TabsContent value="embed" className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <EmbedDesigner />
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