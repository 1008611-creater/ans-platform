import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import mascotMessages from "../../../messages/product/zh.json";
import companionMessages from "../../../messages/companion/zh.json";
import { resetSitePreferences } from "@/lib/site-preferences";

vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => null }));
vi.mock("@/components/mascot/dino-avatar", () => ({ DinoAvatar: () => null }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "member" } }, status: "authenticated" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: string) => {
  const source = namespace === "companion" ? companionMessages : mascotMessages.mascot;
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source);
  const t = (key: string, values?: Record<string, string | number>) => {
    let result = String(lookup(key) ?? key);
    for (const [name, value] of Object.entries(values ?? {})) result = result.split("{" + name + "}").join(String(value));
    return result;
  };
  t.has = (key: string) => typeof lookup(key) === "string";
  return t;
} }));

afterEach(() => { cleanup(); resetSitePreferences(); vi.unstubAllGlobals(); });

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

it("asks for confirmation before charging and resends the confirmed amount", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json({ ok: false, error: "CONFIRM_REQUIRED", toolUsed: "play_claw_arcade", replyZh: "免费币用完了，继续要花 10 积分", replyEn: "costs 10 pts", balancePoints: 12, data: { requiresConfirmation: true, pricePoints: 10, intent: "claw" }, links: [] }))
    .mockResolvedValueOnce(json({ ok: true, toolUsed: "play_claw_arcade", replyZh: "抓娃娃成功", replyEn: "won", balancePoints: 2, links: [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });
  fireEvent.click(within(dialog).getByTestId("pi-agent-action-claw"));

  const card = await screen.findByTestId("pi-agent-confirm");
  expect(card.textContent).toContain("10");
  const firstBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
  expect(firstBody).toMatchObject({ action: "pi_action", intent: "claw" });
  expect(firstBody).not.toHaveProperty("confirmedPoints");

  fireEvent.click(within(card).getByRole("button", { name: /确认扣 10 积分/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const secondBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
  expect(secondBody).toMatchObject({ action: "pi_action", intent: "claw", confirmedPoints: 10 });
  await waitFor(() => expect(screen.queryByTestId("pi-agent-confirm")).toBeNull());
});

it("never sends a paid action when the user cancels the quote", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(json({ ok: false, error: "CONFIRM_REQUIRED", toolUsed: "redeem_market_item", replyZh: "兑换需要 5 积分", replyEn: "costs 5 pts", data: { requiresConfirmation: true, pricePoints: 5, intent: "redeem" }, links: [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });
  fireEvent.click(within(dialog).getByTestId("pi-agent-action-redeem"));

  const card = await screen.findByTestId("pi-agent-confirm");
  fireEvent.click(within(card).getByRole("button", { name: "取消" }));
  expect(screen.queryByTestId("pi-agent-confirm")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
