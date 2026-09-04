"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FolderTree, Tags, FileText, Webhook, Flag, ShieldCheck, Puzzle } from "lucide-react";

const VALID_TABS = ["users", "categories", "tags", "webhooks", "prompts", "skills", "reports", "governance"] as const;
type TabValue = (typeof VALID_TABS)[number];

interface AdminTabsProps {
  translations: {
    users: string;
    categories: string;
    tags: string;
    webhooks: string;
    prompts: string;
    skills: string;
    reports: string;
    governance: string;
  };
  pendingReportsCount: number;
  visibleTabs?: readonly TabValue[];
  children: {
    users: React.ReactNode;
    categories: React.ReactNode;
    tags: React.ReactNode;
    webhooks: React.ReactNode;
    prompts: React.ReactNode;
    skills: React.ReactNode;
    reports: React.ReactNode;
    governance: React.ReactNode;
  };
}

export function AdminTabs({ translations, pendingReportsCount, visibleTabs, children }: AdminTabsProps) {
  const allowedTabs = visibleTabs && visibleTabs.length > 0 ? visibleTabs : [...VALID_TABS];
  const [activeTab, setActiveTab] = useState<TabValue>(allowedTabs[0] || "users");
  const [mounted, setMounted] = useState(false);

  const updateTabFromHash = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    if (VALID_TABS.includes(hash as TabValue) && allowedTabs.includes(hash as TabValue)) {
      setActiveTab(hash as TabValue);
    }
  }, [allowedTabs]);

  useEffect(() => {
    setMounted(true);
    updateTabFromHash();
    window.addEventListener("hashchange", updateTabFromHash);
    return () => {
      window.removeEventListener("hashchange", updateTabFromHash);
    };
  }, [updateTabFromHash]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    window.history.replaceState(null, "", `#${value}`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max sm:w-auto">
          {allowedTabs.includes("users") && <TabsTrigger value="users" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><Users className="h-4 w-4" /><span className="hidden sm:inline">{translations.users}</span></TabsTrigger>}
          {allowedTabs.includes("categories") && <TabsTrigger value="categories" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><FolderTree className="h-4 w-4" /><span className="hidden sm:inline">{translations.categories}</span></TabsTrigger>}
          {allowedTabs.includes("tags") && <TabsTrigger value="tags" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><Tags className="h-4 w-4" /><span className="hidden sm:inline">{translations.tags}</span></TabsTrigger>}
          {allowedTabs.includes("webhooks") && <TabsTrigger value="webhooks" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><Webhook className="h-4 w-4" /><span className="hidden sm:inline">{translations.webhooks}</span></TabsTrigger>}
          {allowedTabs.includes("prompts") && <TabsTrigger value="prompts" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><FileText className="h-4 w-4" /><span className="hidden sm:inline">{translations.prompts}</span></TabsTrigger>}
          {allowedTabs.includes("skills") && <TabsTrigger value="skills" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><Puzzle className="h-4 w-4" /><span className="hidden sm:inline">{translations.skills}</span></TabsTrigger>}
          {allowedTabs.includes("reports") && <TabsTrigger value="reports" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><Flag className="h-4 w-4" /><span className="hidden sm:inline">{translations.reports}</span>{pendingReportsCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-white rounded-full">{pendingReportsCount}</span>}</TabsTrigger>}
          {allowedTabs.includes("governance") && <TabsTrigger value="governance" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">{translations.governance}</span></TabsTrigger>}
        </TabsList>
      </div>

      {allowedTabs.includes("users") && <TabsContent value="users">{children.users}</TabsContent>}
      {allowedTabs.includes("categories") && <TabsContent value="categories">{children.categories}</TabsContent>}
      {allowedTabs.includes("tags") && <TabsContent value="tags">{children.tags}</TabsContent>}
      {allowedTabs.includes("webhooks") && <TabsContent value="webhooks">{children.webhooks}</TabsContent>}
      {allowedTabs.includes("prompts") && <TabsContent value="prompts">{children.prompts}</TabsContent>}
      {allowedTabs.includes("skills") && <TabsContent value="skills">{children.skills}</TabsContent>}
      {allowedTabs.includes("reports") && <TabsContent value="reports">{children.reports}</TabsContent>}
      {allowedTabs.includes("governance") && <TabsContent value="governance">{children.governance}</TabsContent>}
    </Tabs>
  );
}
