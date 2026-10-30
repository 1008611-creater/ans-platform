import { lazy, Suspense, type ComponentProps, type ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import zh from "../../../messages/preview/zh.json";
import { FIRST_VISIT_RISE_DELAY_MS, HomeWelcomeModal, readFirstVisitGuideSeen } from "@/components/homepage/home-welcome-modal";

const session = vi.hoisted(() => ({ status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated" }));

vi.mock("next-intl", async original => await original<typeof import("next-intl")>());
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: session.status }) }));
vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => <a {...props} /> }));
// next/dynamic 在 vitest 里换成 React.lazy：仍然是真弹窗本体，只是加载方式不同。
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<ComponentType<Record<string, unknown>>>) => {
    const Lazy = lazy(() => loader().then(component => ({ default: component })));
    return function Dynamic(props: Record<string, unknown>) { return <Suspense><Lazy {...props} /></Suspense>; };
  },
}));

beforeEach(() => {
  session.status = "unauthenticated";
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => { cleanup(); window.localStorage.clear(); window.history.replaceState(null, "", "/"); });

function mount() {
  return render(
    <NextIntlClientProvider locale="zh" messages={{ preview: zh }}>
      <HomeWelcomeModal />
    </NextIntlClientProvider>,
  );
}

/** 等过升起的那一拍，确认仍然没有弹窗。 */
async function expectNoModal() {
  await act(() => new Promise(resolve => setTimeout(resolve, FIRST_VISIT_RISE_DELAY_MS + 250)));
  expect(screen.queryByTestId("home-welcome-modal")).toBeNull();
}

it("首访未登录：首页稳住后升起，带兔兔龙舞台与五张分流卡，并记下已看", async () => {
  mount();
  expect(screen.queryByTestId("home-welcome-modal")).toBeNull();
  const dialog = await screen.findByTestId("home-welcome-modal", undefined, { timeout: 3000 });
  expect(within(dialog).getByText(zh.firstVisit.title)).toBeTruthy();
  expect(within(dialog).getAllByRole("link")).toHaveLength(5);
  expect(readFirstVisitGuideSeen()).toBe(true);
});

it("本地已有已看标记：不弹", async () => {
  window.localStorage.setItem("ans:first-visit-guide:v1:guest", "1");
  mount();
  await expectNoModal();
});

it("已登录：不弹，也不记已看（弹过才算看过）", async () => {
  session.status = "authenticated";
  mount();
  await expectNoModal();
  expect(readFirstVisitGuideSeen()).toBe(false);
});

it("登录访问后登出，再来首页：引导照常弹出，弹出时才记已看", async () => {
  session.status = "authenticated";
  const signedIn = mount();
  await expectNoModal();
  signedIn.unmount();

  session.status = "unauthenticated";
  mount();
  await screen.findByTestId("home-welcome-modal", undefined, { timeout: 3000 });
  expect(readFirstVisitGuideSeen()).toBe(true);
});

it("同一页里会话从已登录变成登出（不刷新）：引导弹出", async () => {
  session.status = "authenticated";
  const view = mount();
  await expectNoModal();
  session.status = "unauthenticated";
  view.rerender(
    <NextIntlClientProvider locale="zh" messages={{ preview: zh }}>
      <HomeWelcomeModal />
    </NextIntlClientProvider>,
  );
  await screen.findByTestId("home-welcome-modal", undefined, { timeout: 3000 });
  expect(readFirstVisitGuideSeen()).toBe(true);
});

it("升起前就登录了：这次不弹，也不记已看", async () => {
  const view = mount();
  session.status = "authenticated";
  view.rerender(
    <NextIntlClientProvider locale="zh" messages={{ preview: zh }}>
      <HomeWelcomeModal />
    </NextIntlClientProvider>,
  );
  await expectNoModal();
  expect(readFirstVisitGuideSeen()).toBe(false);
});

it("登录状态还没确定：先不弹", async () => {
  session.status = "loading";
  mount();
  await expectNoModal();
  expect(readFirstVisitGuideSeen()).toBe(false);
});

it("带 ?campaign=1：给活动弹窗让位，且不记已看，下次正常进站再弹", async () => {
  window.history.replaceState(null, "", "/?campaign=1");
  mount();
  await expectNoModal();
  expect(readFirstVisitGuideSeen()).toBe(false);
});

it("关掉之后只弹这一次：再进首页不再弹", async () => {
  const view = mount();
  const dialog = await screen.findByTestId("home-welcome-modal", undefined, { timeout: 3000 });
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByTestId("home-welcome-modal")).toBeNull());
  view.unmount();
  mount();
  await expectNoModal();
});

it("点任意一张分流卡：弹窗退场", async () => {
  mount();
  const dialog = await screen.findByTestId("home-welcome-modal", undefined, { timeout: 3000 });
  const team = within(dialog).getAllByRole("link").find(link => link.getAttribute("href") === "/teams")!;
  team.addEventListener("click", event => event.preventDefault());
  fireEvent.click(team);
  await waitFor(() => expect(screen.queryByTestId("home-welcome-modal")).toBeNull());
});
