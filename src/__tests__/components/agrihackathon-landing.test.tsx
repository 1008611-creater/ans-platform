import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import zh from "../../../messages/zh.json";
import agriWall from "../../../messages/agri-wall/zh.json";
import product from "../../../messages/product/zh.json";
import AgriHackathonPage from "@/app/competitions/agrihackathon/page";

const mocks = vi.hoisted(() => ({ find: vi.fn(), guide: vi.fn() }));
vi.mock("@/server/competitions/service", () => ({ findAgriHackathonCompetition: mocks.find }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({ readAgriPublicGuide: mocks.guide }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async (namespace: string) => {
    const messages: unknown = { ...zh, product, agriWall };
    const read = (key: string): unknown => `${namespace}.${key}`.split(".").reduce<unknown>(
      (value, part) => (value as Record<string, unknown>)[part], messages,
    );
    return Object.assign((key: string) => read(key) as string, { raw: read });
  },
}));
beforeEach(() => { mocks.guide.mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the historical-rules notice and no edition entry when no competition is bound", async () => {
  mocks.find.mockResolvedValue(null);
  render(await AgriHackathonPage());
  const notice = screen.getByRole("complementary", { name: product.agrihackathon.rulesPendingTitle });
  expect(within(notice).getByText(product.agrihackathon.rulesPendingBody)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: zh.agriHackathon.enterWorkbench })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: agriWall.publish })).toHaveAttribute("href", "/explore/submit?event=agrihackathon");
  expect(screen.getByRole("link", { name: agriWall.title })).toHaveAttribute("href", "/explore?category=competition&subcategory=agri-wall");
});

it("keeps historical rules marked pending even when the exact edition is bound", async () => {
  mocks.find.mockResolvedValue({ id: "confirmed-edition", status: "UPCOMING", startsAt: null, endsAt: null });
  render(await AgriHackathonPage());
  expect(screen.getByRole("complementary", { name: product.agrihackathon.rulesPendingTitle })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: zh.agriHackathon.enterWorkbench })).toHaveAttribute("href", "/competitions/confirmed-edition");
});

it("shows only explicitly published guidance and links to authorized management", async () => {
  mocks.find.mockResolvedValue(null);
  mocks.guide.mockResolvedValue({ competitionId: "edition", enabled: false, rule: { version: 3, guidanceMarkdown: "Published technical guidance", windows: [
    { stage: "PRELIMINARY", state: "CONFIRMED", opensAt: "2026-10-11T03:00:00Z", closesAt: "2026-10-11T05:00:00Z", includesDeadline: false },
    { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null, includesDeadline: null },
  ] } });
  render(await AgriHackathonPage());
  expect(screen.getByText("Published technical guidance")).toBeInTheDocument();
  expect(screen.queryByText(product.agrihackathon.rulesPendingBody)).not.toBeInTheDocument();
  expect(screen.getByText(product.agriWorkspace.title).closest("a")).toHaveAttribute("href", "/competitions/agrihackathon/manage");
});


it("keeps every scoring criterion, rule and operational entry behind optional disclosures", async () => {
  mocks.find.mockResolvedValue(null);
  const { container } = render(await AgriHackathonPage());
  const scoring = screen.getByText(zh.agriHackathon.scoringTitle).closest("details");
  expect(scoring).not.toHaveAttribute("open");
  for (const item of Object.values(zh.agriHackathon.scoring)) {
    expect(within(scoring!).getByText(item.label)).toBeInTheDocument();
    expect(within(scoring!).getByText(item.description)).toBeInTheDocument();
  }
  for (const rule of Object.values(zh.agriHackathon.rules)) expect(screen.getByText(rule)).toBeInTheDocument();
  for (const href of ["/explore/agrihackathon/submit", "/competitions/agrihackathon/submissions", "/competitions/agrihackathon/tasks", "/competitions/agrihackathon/works", "/competitions/agrihackathon/onsite", "/competitions/agrihackathon/popularity", "/competitions/agrihackathon/publication-review", "/competitions/agrihackathon/manage"]) {
    expect(container.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
  }
  expect(container.querySelectorAll("h1")).toHaveLength(1);
  expect(container.querySelectorAll('[data-slot="button"].bg-primary')).toHaveLength(1);
});
