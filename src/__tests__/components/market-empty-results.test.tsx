import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketPage from "@/app/market/page";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/marketplace/listings", () => ({ listMarketListings: vi.fn(async () => []) }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }));
vi.mock("@/components/marketplace/frame", () => ({
  MarketFrame: ({ children, tools }: { children: ReactNode; tools: ReactNode }) => <main>{tools}{children}</main>,
}));
vi.mock("@/components/marketplace/offer-card", () => ({ MarketOfferCard: () => null }));

describe("market empty results", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a buyer recover from a filtered empty result without starting a listing", async () => {
    render(await MarketPage({ searchParams: Promise.resolve({ q: "no-match", fulfillment: "resource" }) }));
    expect(screen.getByRole("heading", { name: "noMatches" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "clearFilters" }).every(link => link.getAttribute("href") === "/market")).toBe(true);
    expect(screen.getByRole("searchbox")).toHaveValue("no-match");
    expect(document.querySelector('input[name="fulfillment"]')).toHaveValue("resource");
  });

  it("distinguishes an empty market from a search with no matches", async () => {
    render(await MarketPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "empty" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "clearFilters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "exploreProjects" })).toHaveAttribute("href", "/explore");
    expect(screen.getByRole("link", { name: "uploadFirst" })).toHaveAttribute("href", "/market/creator/new");
  });
});
