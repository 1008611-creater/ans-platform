import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "@/app/reset-password/page";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("找回密码页面", () => {
  it("发送成功后进入 60 秒冷却，按钮禁用并显示倒计时", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "如果该邮箱已注册，验证码已发送。" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /秒后可重新发送/ })).toBeDisabled());
    expect(screen.getByRole("button", { name: "60 秒后可重新发送" })).toBeDisabled();
    expect(screen.getByLabelText("邮箱")).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 冷却期间再次点击不会重复请求。
    fireEvent.click(screen.getByRole("button", { name: "60 秒后可重新发送" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("服务端返回 429 时按剩余秒数禁用重发并提示", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "48" } })));

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("48 秒后重试"));
    expect(screen.getByRole("button", { name: "48 秒后可重新发送" })).toBeDisabled();
  });

  it("验证码阶段的密码框提供显示/隐藏切换", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "如果该邮箱已注册，验证码已发送。" })));

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    const password = await screen.findByLabelText("新密码");
    expect(password).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "显示密码" });
    expect(toggle).toHaveAttribute("aria-controls", password.getAttribute("id"));
    fireEvent.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
