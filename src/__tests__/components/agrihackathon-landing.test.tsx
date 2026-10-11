import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import zh from "../../../messages/zh.json";
import product from "../../../messages/product/zh.json";
import AgriHackathonPage from "@/app/competitions/agrihackathon/page";

const mocks = vi.hoisted(() => ({ find: vi.fn(), guide: vi.fn() }));
vi.mock("@/server/competitions/service", () => ({ findAgriHackathonCompetition: mocks.find }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({ readAgriPublicGuide: mocks.guide }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async (namespace: string) => {
    const messages: unknown = { ...zh, product };
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
  expect(screen.getByRole("link", { name: zh.agriHackathon.createProject })).toHaveAttribute("href", "/projects");
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
  expect(screen.getByRole("link", { name: product.agriWorkspace.title })).toHaveAttribute("href", "/competitions/agrihackathon/manage");
});
