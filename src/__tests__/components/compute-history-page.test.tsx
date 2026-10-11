import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "use-intl/core";
import { cleanup, render, screen } from "@testing-library/react";
import zh from "../../../messages/product/zh.json";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), history: vi.fn(), redirect: vi.fn(), view: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/compute/member-history", () => ({ readComputeHistory: mocks.history }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => createTranslator({ locale: "zh", messages: zh, namespace: "computeHistory" }) }));
vi.mock("@/components/workspace/compute-history", () => ({ ComputeHistory: mocks.view }));
vi.mock("next/link", () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
import ComputeHistoryPage, { generateMetadata } from "@/app/workspace/compute/page";
import { ComputeError } from "@/server/compute/policy";
beforeEach(() => {
 vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "authenticated-member" } });
 mocks.redirect.mockImplementation(() => { throw new Error("redirect-for-fixture"); });
 mocks.history.mockResolvedValue({ tasks: [], nextCursor: null, summary: { availablePoints: 10 } });
});
afterEach(cleanup);
describe("compute statement page boundary", () => {
 it("redirects anonymous sessions before querying private account data", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(ComputeHistoryPage({})).rejects.toThrow("redirect-for-fixture");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fworkspace%2Fcompute");
  expect(mocks.history).not.toHaveBeenCalled();
 });
 it("only queries the session account, ignores authority query fields and selects a known filter", async () => {
  const page = await ComputeHistoryPage({ searchParams: Promise.resolve({ filter: "settled", cursor: "valid-cursor", userId: "victim" } as { filter: string; cursor: string }) });
  expect(mocks.history).toHaveBeenCalledWith("authenticated-member", { filter: "settled", cursor: "valid-cursor" });
  expect(page.props).toMatchObject({ filter: "settled", paged: true });
 });
 it("does not render database diagnostics or invent zero balances when reading fails", async () => {
  mocks.history.mockRejectedValue(new Error("PRIVATE_DATABASE_DIAGNOSTIC"));
  render(await ComputeHistoryPage({}));
  expect(screen.getByRole("alert")).toHaveTextContent("账单暂时无法读取");
  expect(document.body.textContent).not.toContain("PRIVATE_DATABASE_DIAGNOSTIC");
  expect(screen.getByRole("link", { name: "重新加载最新账单" })).toHaveAttribute("href", "/workspace/compute?filter=all");
  expect(mocks.view).not.toHaveBeenCalled();
 });
 it.each(["foreign-cursor", "missing-cursor"])("invalid cursors show the same recovery state without owner details: %s", async cursor => {
  mocks.history.mockRejectedValue(new ComputeError("COMPUTE_CURSOR_INVALID", 400));
  render(await ComputeHistoryPage({ searchParams: Promise.resolve({ cursor }) }));
  expect(screen.getByRole("alert")).toHaveTextContent("这页账单无法继续读取");
  expect(document.body.textContent).not.toContain(cursor);
 });
 it("rejects repeated cursor parameters without making a history query", async () => {
  render(await ComputeHistoryPage({ searchParams: Promise.resolve({ cursor: ["first-cursor", "second-cursor"] }) }));
  expect(mocks.history).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent("分页地址无效");
 });
 it("rechecks account availability and requires login when an account was removed", async () => {
  mocks.history.mockRejectedValue(new ComputeError("COMPUTE_ACCOUNT_UNAVAILABLE", 404));
  await expect(ComputeHistoryPage({})).rejects.toThrow("redirect-for-fixture");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fworkspace%2Fcompute");
 });
 it("marks private statements noindex instead of exposing account usage to search", async () => {
  expect((await generateMetadata()).robots).toEqual({ index: false, follow: false });
 });
});
