import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => (({ email: "邮箱", password: "密码", login: "登录" } as Record<string, string>)[key] ?? key) }));
vi.mock("@/lib/analytics", () => ({ analyticsAuth: { login: vi.fn(), loginFailed: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("登录密码控件", () => {
  it("支持切换两次、失焦保持、标签关联和重新挂载后默认隐藏", () => {
    const view = render(<LoginForm />);
    const input = screen.getByLabelText("密码");
    const toggle = screen.getByRole("button", { name: "显示密码" });

    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByText("密码", { selector: "label" })).toHaveAttribute("for", input.getAttribute("id"));
    expect(toggle).toHaveAttribute("aria-controls", input.getAttribute("id"));
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "隐藏密码" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.blur(input);
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(input).toHaveAttribute("type", "password");

    view.unmount();
    render(<LoginForm />);
    expect(screen.getByLabelText("密码")).toHaveAttribute("type", "password");
  });
});
