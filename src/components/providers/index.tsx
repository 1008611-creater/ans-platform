"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ThemeStyles } from "./theme-styles";
import { BrandingProvider } from "./branding-provider";
import { AgriSubmissionSessionBoundary } from "@/components/competitions/agri-submission-recovery";
import { AgriTaskSessionBoundary } from "@/components/competitions/agri-task-recovery";
import { WorkspaceNavigationProvider } from "./workspace-navigation";
import { AgriIssueSessionBoundary } from "@/components/competitions/agri-issues";
import { AgriReviewSessionBoundary } from "@/components/competitions/agri-review-recovery";
import { AgriOnsiteSessionBoundary } from "@/components/competitions/agri-onsite-recovery";
import { AgriArchiveSessionBoundary } from "@/components/competitions/agri-record-archive-recovery";
import { AgriDemoSessionBoundary } from "@/components/competitions/agri-demo-recovery";
import { ToonflowHostProvider } from "./toonflow-host";
import { DinoTaskSessionProvider } from "@/components/mascot/dino-task-context";

interface ThemeConfig {
  radius: "none" | "sm" | "md" | "lg";
  variant: "flat" | "default" | "brutal";
  density: "compact" | "default" | "comfortable";
  colors: {
    primary: string;
  };
}

interface BrandingConfig {
  name: string;
  logo: string;
  description: string;
  useCloneBranding?: boolean;
}

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  timeZone: string;
  messages: AbstractIntlMessages;
  theme: ThemeConfig;
  branding: BrandingConfig;
}

export function Providers({ children, locale, timeZone, messages, theme, branding }: ProvidersProps) {
  return (
    <SessionProvider>
      <AgriTaskSessionBoundary />
      <AgriSubmissionSessionBoundary />
      <AgriReviewSessionBoundary />
      <AgriDemoSessionBoundary />
      <AgriOnsiteSessionBoundary />
      <AgriArchiveSessionBoundary />
      <AgriIssueSessionBoundary />
      <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={messages}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeStyles 
            radius={theme.radius} 
            variant={theme.variant}
            density={theme.density}
            primaryColor={theme.colors.primary} 
          />
          <BrandingProvider branding={branding}>
            <WorkspaceNavigationProvider><ToonflowHostProvider><DinoTaskSessionProvider>{children}</DinoTaskSessionProvider></ToonflowHostProvider></WorkspaceNavigationProvider>
          </BrandingProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
