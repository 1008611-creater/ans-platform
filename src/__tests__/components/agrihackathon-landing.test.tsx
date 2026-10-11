import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import zh from "../../../messages/zh.json";
import product from "../../../messages/product/zh.json";
import AgriHackathonPage from "@/app/competitions/agrihackathon/page";

const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@/server/competitions/service", () => ({ findAgriHackathonCompetition: mocks.find }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages: unknown = { ...zh, product };
    const read = (key: string): unknown => `${namespace}.${key}`.split(".").reduce<unknown>(
      (value, part) => (value as Record<string, unknown>)[part], messages,
    );
    return Object.assign((key: string) => read(key) as string, { raw: read });
  },
}));
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
