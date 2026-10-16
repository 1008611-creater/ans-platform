import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ session: { status: "authenticated", data: { user: { id: "a" } } } as { status: string; data: { user: { id: string } } | null }, fetch: vi.fn(), refresh: vi.fn(), push: vi.fn(), analytics: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => mock.session }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mock.refresh, push: mock.push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/analytics", () => ({ analyticsFavorite: { add: mock.analytics, remove: mock.analytics } }));
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { FavoriteListItem } from "@/components/favorites/favorite-list-item";
beforeEach(() => { vi.clearAllMocks(); mock.session = { status: "authenticated", data: { user: { id: "a" } } }; vi.stubGlobal("fetch", mock.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("binds the request and discards a response after account switch", async () => {
  let resolve!: (r: { ok: boolean }) => void; mock.fetch.mockReturnValue(new Promise(r => { resolve = r; }));
  const props = { accountId: "a", targetType: "PROJECT" as const, targetId: "real", initialFavorited: false };
  const view = render(<FavoriteButton {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "save" }));
  expect(mock.fetch).toHaveBeenCalledWith("/api/favorites", expect.objectContaining({ headers: expect.objectContaining({ "x-vibehub-account-id": "a" }) }));
  const signal = mock.fetch.mock.calls[0][1].signal as AbortSignal;
  mock.session = { status: "authenticated", data: { user: { id: "b" } } }; view.rerender(<FavoriteButton {...props} />);
  expect(signal.aborted).toBe(true); expect(screen.queryByRole("button", { name: "saved" })).toBeNull();
  await act(async () => { resolve({ ok: true }); });
  expect(mock.analytics).not.toHaveBeenCalled(); expect(mock.refresh).not.toHaveBeenCalled();
});
it("hides previous-account collection titles immediately", () => {
  const props = { accountId: "a", targetType: "PROJECT" as const, targetId: "real", title: "Account A saved project", href: "/explore/real", subtitle: null, authorName: null, costPoints: null };
  const view = render(<FavoriteListItem {...props} />); expect(screen.getByText(props.title)).toBeTruthy();
  mock.session = { status: "authenticated", data: { user: { id: "b" } } }; view.rerender(<FavoriteListItem {...props} />); expect(screen.queryByText(props.title)).toBeNull();
  mock.session = { status: "loading", data: null }; view.rerender(<FavoriteListItem {...props} />); expect(screen.queryByText(props.title)).toBeNull();
});
it("returns to a clean state after logout while a mutation is pending", () => {
  mock.fetch.mockReturnValue(new Promise(() => {})); const props = { accountId: "a", targetType: "PROJECT" as const, targetId: "real", initialFavorited: false };
  const view = render(<FavoriteButton {...props} />); fireEvent.click(screen.getByRole("button", { name: "save" }));
  mock.session = { status: "unauthenticated", data: null }; view.rerender(<FavoriteButton {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "save" })); expect(mock.push).toHaveBeenCalledWith(expect.stringContaining("/login?callbackUrl=")); expect(mock.fetch).toHaveBeenCalledTimes(1);
});
