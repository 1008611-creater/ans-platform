import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import zh from "../../../messages/zh.json";
import en from "../../../messages/en.json";
import CompetitionsPage from "@/app/competitions/page";
import AigcCompetitionPage from "@/app/competitions/(full)/aigc/page";
import { AIGC_CONNECTORS, AIGC_DELIVERABLES } from "@/lib/aigc/cluster";

const state = vi.hoisted(() => ({ locale: "zh" }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => state.locale,
  getTranslations: async (request?: string | { locale: string; namespace: string }) => {
    const namespace = typeof request === "string" ? request : request?.namespace;
    const locale = typeof request === "object" ? request.locale : state.locale;
    const messages = locale === "zh" ? zh : en;
    const raw = (key: string): unknown => (namespace ? `${namespace}.${key}` : key).split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], messages);
    return Object.assign((key: string, values?: Record<string,string>) => {
      const message = raw(key);
      if (typeof message !== "string") throw new Error(`Missing message: ${namespace}.${key}`);
      return message.replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? `{${name}}`);
    }, { raw });
  },
}));
afterEach(() => { cleanup(); state.locale = "zh"; });

for (const locale of ["zh", "en", "ja"]) {
  it(`keeps event choices and planning facts accessible without a questionnaire (${locale})`, async () => {
    state.locale = locale;
    const copy = locale === "zh" ? zh.competitionsHub : en.competitionsHub;
    const { container } = render(await CompetitionsPage());
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.items.agrihackathon.cta })).toHaveAttribute("href", "/competitions/agrihackathon");
    expect(screen.getByRole("link", { name: copy.items.aigc.cta })).toHaveAttribute("href", "/competitions/aigc");
    expect(screen.getByRole("link", { name: copy.continueTeam })).toHaveAttribute("href", "/teams");
    expect(container.querySelector("form")).toBeNull();
    for (const highlight of copy.items.agrihackathon.highlights) expect(screen.getByText(highlight)).toBeInTheDocument();
    const overview = container.querySelector("details")!;
    expect(overview).not.toHaveAttribute("open");
    fireEvent.click(within(overview).getByText(copy.eventOverview));
    expect(overview).toHaveAttribute("open");
  });

  it(`keeps all real tool destinations, separate-login notice and preparation checks (${locale})`, async () => {
    state.locale = locale;
    const copy = locale === "zh" ? zh.aigcCompetition : en.aigcCompetition;
    const { container } = render(await AigcCompetitionPage());
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="button"].bg-primary')).toHaveLength(1);
    for (const connector of AIGC_CONNECTORS) {
      const name = copy.openNamedTool.replace("{name}", copy.connectors[connector.id].name);
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", connector.url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByText(copy.externalNotice)).toBeInTheDocument();
    for (const item of AIGC_DELIVERABLES) expect(screen.getByText(copy.deliverables[item])).toBeInTheDocument();
  });
}
