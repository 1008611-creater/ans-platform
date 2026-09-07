import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileForm } from "@/components/settings/profile-form";

vi.mock("next-auth/react", () => ({ useSession: () => ({ update: vi.fn() }) }));
vi.mock("next-intl", () => {
  const translate = (key: string) => key;
  return { useTranslations: () => translate };
});
vi.mock("@/lib/analytics", () => ({ analyticsProfile: { updateProfile: vi.fn(), updateAvatar: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const user = { id: "user1", name: "旧显示名", username: "testuser", email: "test@example.com", avatar: null, verified: false };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (_url, options) => ({
    ok: true,
    json: async () => options?.method === "PATCH"
      ? { ...user, ...JSON.parse(options.body) }
      : { ...user, nickname: "当前昵称", nicknameSetAt: "2026-09-01T00:00:00Z" },
  }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("settings 昵称表单", () => {
  it("标签改为昵称，并从本人 GET 读取昵称而不是陈旧 name", async () => {
    render(<ProfileForm user={user} />);
    const input = await screen.findByLabelText("昵称");
    await waitFor(() => expect(input).toHaveValue("当前昵称"));
    expect(fetchMock).toHaveBeenCalledWith("/api/user/profile", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByLabelText("email")).toHaveValue(user.email);
    expect(screen.getByLabelText("email")).toBeDisabled();
  });
  it("提交显式 nickname，不再提交独立 name", async () => {
    render(<ProfileForm user={user} />);
    const input = await screen.findByLabelText("昵称");
    await waitFor(() => expect(input).toHaveValue("当前昵称"));
    fireEvent.change(input, { target: { value: "新昵称" } });
    fireEvent.click(screen.getByRole("button", { name: "saveChanges" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH")![1].body);
    expect(body).toMatchObject({ nickname: "新昵称", username: "testuser" });
    expect(body).not.toHaveProperty("name");
  });
  it.each(["一", "a".repeat(41), "test@example.com", "a\u200bb"])("客户端阻止非法新昵称 %j", async (nickname) => {
    render(<ProfileForm user={user} />);
    const input = await screen.findByLabelText("昵称");
    await waitFor(() => expect(input).toHaveValue("当前昵称"));
    fireEvent.change(input, { target: { value: nickname } });
    fireEvent.click(screen.getByRole("button", { name: "saveChanges" }));
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });
  it("本人 GET 失败时不能使用旧 name 提交昵称", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "forbidden" }) });
    render(<ProfileForm user={user} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "saveChanges" })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });
});
