import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterForm } from "@/components/auth/register-form";

const mocks = vi.hoisted(() => ({ render: vi.fn(), reset: vi.fn(), remove: vi.fn(), fetch: vi.fn() }));
vi.mock("next/script", () => ({ default: ({ onReady }: { onReady: () => void }) => <button type="button" onClick={onReady}>加载验证脚本</button> }));
vi.mock("@/lib/analytics", () => ({ analyticsAuth: { register: vi.fn(), registerFailed: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
let callbacks: Record<string, (value?: string) => void>;

beforeEach(() => {
  vi.resetAllMocks();
  callbacks = {};
  mocks.render.mockImplementation((_node, options) => { callbacks = options; return "widget-1"; });
  mocks.fetch.mockResolvedValue(Response.json({ siteKey: "public-key" }));
  vi.stubGlobal("fetch", mocks.fetch);
  Object.assign(window, { turnstile: { render: mocks.render, reset: mocks.reset, remove: mocks.remove } });
});
afterEach(() => { vi.unstubAllGlobals(); delete (window as Window & { turnstile?: unknown }).turnstile; });

async function ready() {
  const view = render(<RegisterForm />);
  fireEvent.click(screen.getByText("加载验证脚本"));
  await waitFor(() => expect(mocks.render).toHaveBeenCalled());
  return view;
}

describe("注册表单人机验证生命周期", () => {
  it("使用昵称而非真实姓名，明确验证码和邀请码", async () => {
    await ready();
    expect(screen.getByLabelText("昵称")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱验证码")).toBeInTheDocument();
    expect(screen.getByLabelText("邀请码（非 cau.edu.cn 邮箱必填）")).toBeInTheDocument();
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "register", sitekey: "public-key" }));
  });
  it("过期和错误立即禁用发送，重置和卸载清理 widget", async () => {
    const view = await ready();
    await act(async () => callbacks.callback("valid-token"));
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeEnabled();
    await act(async () => callbacks["expired-callback"]());
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "重新进行人机验证" }));
    expect(mocks.reset).toHaveBeenCalledWith("widget-1");
    await act(async () => callbacks.callback("new-token"));
    await act(async () => callbacks["error-callback"]());
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeDisabled();
    view.unmount();
    expect(mocks.remove).toHaveBeenCalledWith("widget-1");
  });
  it("发码消耗 challenge 后必须重置，冷却阻止重复点击", async () => {
    await ready();
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "student@cau.edu.cn" } });
    await act(async () => callbacks.callback("valid-token"));
    mocks.fetch.mockResolvedValueOnce(Response.json({ success: true, retryAfter: 60 }));
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));
    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /秒后重发/ })).toBeDisabled();
    expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({ email: "student@cau.edu.cn", turnstileToken: "valid-token" });
  });
  it("配置获取失败时不渲染 widget 且不能注册", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ message: "注册未配置" }, { status: 503 }));
    render(<RegisterForm />);
    await waitFor(() => expect(screen.getByText("注册未配置")).toBeInTheDocument());
    expect(mocks.render).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "注册" })).toBeDisabled();
  });
});
