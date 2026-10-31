import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeaderPointsPill } from "@/components/layout/header-points-pill";

vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("next-intl", () => ({ useLocale: () => "zh" }));
vi.mock("@/components/providers/workspace-navigation", () => ({
  WorkspaceLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

const fetcher = vi.fn();
let phone = true;
beforeEach(() => {
  phone = true;
  fetcher.mockResolvedValue(new Response(JSON.stringify({ points: 1020.5 })));
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: phone, media: query }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); fetcher.mockReset(); });

it("shows the real balance on phones and links to the credits page", async () => {
  render(<HeaderPointsPill userId="member-a" label="积分" />);
  expect(screen.getByRole("link", { name: "积分" })).toHaveAttribute("href", "/workspace/credits");
  await waitFor(() => expect(screen.getByRole("link", { name: "积分 1,020.5" })).toBeInTheDocument());
  expect(fetcher).toHaveBeenCalledWith("/api/me/points", expect.objectContaining({ cache: "no-store" }));
});

it("keeps the plain label when the balance cannot be read", async () => {
  fetcher.mockResolvedValue(new Response("{}", { status: 500 }));
  render(<HeaderPointsPill userId="member-a" label="积分" />);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(screen.getByRole("link", { name: "积分" })).toHaveTextContent("积分");
});

it("does not request the balance on wide screens", () => {
  phone = false;
  render(<HeaderPointsPill userId="member-a" label="积分" />);
  expect(fetcher).not.toHaveBeenCalled();
});
