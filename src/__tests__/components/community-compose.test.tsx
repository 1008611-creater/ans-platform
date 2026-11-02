import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PostCompose, type RelayTarget } from "@/components/community/post-compose";

const relay: RelayTarget = { id: "root1", label: "Day 03", authorName: "lsb", board: "CAMPUS", count: 0, cover: null };
const assign = vi.fn();

beforeEach(() => {
  nav.push.mockReset(); nav.refresh.mockReset(); assign.mockReset();
  window.localStorage.clear();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lets a visitor write a relay first, keeps the words and sends them to sign in", async () => {
  render(<PostCompose guest teams={[]} competitions={[]} relay={relay} returnTo="/community/posts/root1?relay=1" />);
  fireEvent.click(screen.getByRole("button", { name: "open" }));
  fireEvent.click(screen.getByRole("button", { name: "kinds.TEXT" }));
  fireEvent.change(screen.getByLabelText("textBody"), { target: { value: "我想用 AI 做个记账小程序" } });
  fireEvent.click(screen.getByRole("button", { name: "loginToSubmit" }));
  expect(assign).toHaveBeenCalledWith("/login?callbackUrl=%2Fcommunity%2Fposts%2Froot1%3Frelay%3D1");
  expect(JSON.parse(window.localStorage.getItem("ans:community-draft:relay:root1") ?? "{}")).toMatchObject({ kind: "TEXT", body: "我想用 AI 做个记账小程序" });
});

it("opens with the saved words after sign-in and lands back on the relay chain without refreshing first", async () => {
  window.localStorage.setItem("ans:community-draft:relay:root1", JSON.stringify({ kind: "TEXT", body: "我想用 AI 做个记账小程序" }));
  const fetchMock = vi.fn(async (url: string) => url === "/api/community/posts" ? new Response(JSON.stringify({ ok: true, id: "r9" }), { status: 201 }) : new Response("{}"));
  const posts = () => fetchMock.mock.calls.filter(([url]) => url === "/api/community/posts");
  vi.stubGlobal("fetch", fetchMock);
  render(<PostCompose teams={[]} competitions={[]} relay={relay} defaultOpen />);
  const body = await screen.findByLabelText("textBody");
  await waitFor(() => expect(body).toHaveValue("我想用 AI 做个记账小程序"));
  fireEvent.click(screen.getByRole("button", { name: "submit" }));
  await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/community/posts/root1?relayed=r9#relays"));
  expect(posts()).toHaveLength(1);
  expect(nav.refresh).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("ans:community-draft:relay:root1")).toBeNull();
});
