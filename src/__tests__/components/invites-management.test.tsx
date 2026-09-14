import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InvitesManagement, inviteCooldownKey } from "@/components/admin/invites-management";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const invite = {
  id: "inv1",
  code: "ABCD2345",
  maxUses: 5,
  usedCount: 1,
  expiresAt: null,
  createdAt: "2026-09-13T03:00:00.000Z",
  creator: { email: "admin@prompts.chat" },
  emailDeliveries: [],
  redemptions: [],
};

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
  } as unknown as Response;
}

function listResponse() {
  return jsonResponse({ view: "invites", items: [invite], total: 1, page: 1, totalPages: 1 });
}

function sendButton() {
  return screen.getByRole("button", { name: /^(发送|\d+ 秒后重发)$/ });
}

function sendCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((call) => String(call[0]).includes("/api/admin/invites/send"));
}

async function openMailPanel() {
  render(<InvitesManagement />);
  fireEvent.click(await screen.findByRole("button", { name: /发送邮件/ }));
  return screen.getByPlaceholderText(/收件邮箱/);
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("邀请码邮件发送冷却", () => {
  it("发送成功后进入 60 秒冷却，按钮禁用且不再重复请求", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/admin/invites/send")) return jsonResponse({ code: "ABCD2345", email: "student@cau.edu.cn" });
      return listResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const input = await openMailPanel();
    fireEvent.change(input, { target: { value: "Student@CAU.edu.cn " } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "60 秒后重发" })).toBeDisabled());
    expect(sendCalls(fetchMock)).toHaveLength(1);
    expect(JSON.parse(String((sendCalls(fetchMock)[0][1] as RequestInit).body))).toEqual({
      inviteId: "inv1",
      email: "student@cau.edu.cn",
    });

    // 冷却期间再次点击不会重复投递。
    fireEvent.click(screen.getByRole("button", { name: "60 秒后重发" }));
    expect(sendCalls(fetchMock)).toHaveLength(1);
  });

  it("服务端返回 429 时按 Retry-After 剩余秒数禁用重发", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/admin/invites/send")) {
        return jsonResponse(
          { error: "resend_cooldown", message: "该邀请码刚刚已发送给此邮箱，请 60 秒后再试" },
          { status: 429, headers: { "Retry-After": "42" } },
        );
      }
      return listResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const input = await openMailPanel();
    fireEvent.change(input, { target: { value: "student@cau.edu.cn" } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "42 秒后重发" })).toBeDisabled());
  });

  it("冷却按邀请码与邮箱组合隔离，换邮箱后仍可发送", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/admin/invites/send")) return jsonResponse({ code: "ABCD2345", email: "a@cau.edu.cn" });
      return listResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const input = await openMailPanel();
    fireEvent.change(input, { target: { value: "a@cau.edu.cn" } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByRole("button", { name: "60 秒后重发" })).toBeDisabled());

    // 同一邀请码换一个收件邮箱，不受上一个邮箱的冷却影响。
    fireEvent.change(screen.getByPlaceholderText(/收件邮箱/), { target: { value: "b@cau.edu.cn" } });
    expect(sendButton()).toBeEnabled();
  });

  it("冷却键按邀请码与邮箱组合生成，忽略大小写与首尾空格", () => {
    expect(inviteCooldownKey("inv1", " Student@CAU.edu.cn ")).toBe(inviteCooldownKey("inv1", "student@cau.edu.cn"));
    expect(inviteCooldownKey("inv1", "a@cau.edu.cn")).not.toBe(inviteCooldownKey("inv2", "a@cau.edu.cn"));
  });
});
