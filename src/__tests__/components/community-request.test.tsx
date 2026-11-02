import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), error: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));

import { useCommunityRequest } from "@/components/community/use-community-request";

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.refresh.mockReset();
});

it("lets only one write out at a time, so a double click posts once", async () => {
  let finish: (value: Response) => void = () => {};
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
  const { result } = renderHook(() => useCommunityRequest());
  let first: Promise<unknown> = Promise.resolve();
  let second: unknown;
  await act(async () => {
    first = result.current.send("/api/community/posts", { body: "a" });
    second = await result.current.send("/api/community/posts", { body: "a" });
  });
  expect(second).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => { finish(new Response(JSON.stringify({ id: "p1" }), { status: 201 })); await first; });
  await expect(first).resolves.toEqual({ id: "p1" });
});

it("skips the page refresh when the caller is about to navigate away", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "p1" }), { status: 201 }));
  const { result } = renderHook(() => useCommunityRequest());
  await act(async () => { await result.current.send("/api/community/posts", {}, { refresh: false }); });
  expect(mocks.refresh).not.toHaveBeenCalled();
  await act(async () => { await result.current.send("/api/community/posts", {}); });
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
