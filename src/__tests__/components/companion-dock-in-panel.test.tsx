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

it("把 Agent / 工作模式 两个入口放进小恐龙面板内部（不再浮在页面角落）", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, replyZh: "", replyEn: "", links: [] }), { status: 200 })));
  render(<DinoGuide />);

  // 面板关闭时：页面上不出现这两个浮动入口
  expect(document.querySelector('[data-testid="ans-companion-dock"]')).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });

  // 打开后：两个入口出现在面板内部的槽位里
  const dock = await waitFor(() => within(dialog).getByTestId("ans-companion-dock"), { timeout: 3000 });
  expect(dock.closest("#ans-companion-panel")).toBe(dialog);
  expect(dock.parentElement?.className).toContain("ans-companion-dock-slot");
  expect(within(dock).getByText(companionMessages.bar.dockAgent)).toBeTruthy();
  expect(within(dock).getByText(companionMessages.bar.dockWorkMode)).toBeTruthy();
});
