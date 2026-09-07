import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import CommunityPage from "@/app/community/page";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/community/community-panel", () => ({ CommunityPanel: () => <div>社区面板已挂载</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});
afterEach(cleanup);
it("社区页面未登录跳转并保留回调地址", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(CommunityPage()).rejects.toThrow("REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=/community");
});
it("已登录零级用户无需权限判断即可访问社区面板", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", xp: 0, role: "USER", verified: false } });
  render(await CommunityPage());
  expect(screen.getByText("社区面板已挂载")).toBeInTheDocument();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
