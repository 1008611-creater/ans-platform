import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoAvatar } from "@/components/mascot/dino-avatar";
import { DinoGuide } from "@/components/mascot/dino-guide";
import mascotMessages from "../../../messages/product/zh.json";
import companionMessages from "../../../messages/companion/zh.json";
import { resetSitePreferences } from "@/lib/site-preferences";

vi.mock("next/image", () => ({ default: ({ className }: { className?: string }) => <span data-testid="static-mascot" className={className} /> }));
vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => null }));
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

afterEach(() => { cleanup(); resetSitePreferences(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("does not download the 3D frame on mount even when WebGL is available, and loads it after the first interaction", () => {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const view = render(<DinoAvatar phase="idle" open={false} />);
  // 首屏不再预下载约 9MB 的 3D 场景，只显示静态立绘。
  expect(view.container.querySelector("iframe")).toBeNull();
  expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
  act(() => { window.dispatchEvent(new CustomEvent("ans:dino-activate")); });
  expect(view.container.querySelector("iframe")).not.toBeNull();
});

it("keeps the bottom-right speech bubble keyboard operable, dismisses it on click and never polls every 90ms", () => {
  const intervals = vi.spyOn(window, "setInterval");
  render(<DinoGuide />);
  expect(intervals.mock.calls.filter(([, delay]) => delay === 90)).toHaveLength(0);
  const bubble = document.getElementById("ans-dino-live-bubble");
  expect(bubble?.tagName).toBe("BUTTON");
  expect(bubble?.getAttribute("aria-label")).toBeTruthy();
  expect(bubble?.getAttribute("data-bubble-state")).toBe("alert");
  fireEvent.click(bubble as HTMLElement);
  expect(document.getElementById("ans-dino-live-bubble")).toBeNull();
});
