import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MobileAppInstaller,
  detectDeviceEnvironment,
  type BeforeInstallPromptEvent,
} from "@/components/mobile/mobile-app-installer";

const localeState = vi.hoisted(() => ({ locale: "zh" as "zh" | "en" }));

vi.mock("next-intl", () => ({
  useLocale: () => localeState.locale,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ""} />,
}));

vi.mock("@/components/providers/workspace-navigation", () => ({
  WorkspaceLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("MobileAppInstaller & detectDeviceEnvironment", () => {
  beforeEach(() => {
    localeState.locale = "zh";
    window.__ansInstallPrompt = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("classifies WeChat, QQ, iOS, Android, and Desktop user agents accurately", () => {
    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 MicroMessenger/8.0.50",
      ),
    ).toEqual({ platform: "wechat", inAppName: "WeChat" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36 V1_AND_SQ_9.0.0 QQ/9.0.0",
      ),
    ).toEqual({ platform: "wechat", inAppName: "QQ" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ platform: "ios", inAppName: null });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Linux; Android 14; SM-S9180) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
      ),
    ).toEqual({ platform: "android", inAppName: null });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
      ),
    ).toEqual({ platform: "desktop", inAppName: null });
  });

  it("auto-selects the WeChat guide when opened inside WeChat built-in browser", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0.50",
    );

    render(<MobileAppInstaller />);
    expect(screen.getByTestId("guide-panel-wechat")).toBeInTheDocument();
    expect(screen.getByText(/在默认浏览器中打开/)).toBeInTheDocument();
  });

  it("captures beforeinstallprompt on Android and invokes native prompt() on click", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125.0.0.0 Mobile Safari/537.36",
    );

    render(<MobileAppInstaller />);
    expect(screen.getByTestId("guide-panel-android")).toBeInTheDocument();

    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const fakeEvent = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEvent;
    Object.assign(fakeEvent, {
      platforms: ["web"],
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    const installBtn = screen.getByTestId("native-pwa-install-btn");
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptSpy).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(/已发起 ANS 手机桌面安装/);
  });

  it("renders standalone Quick Launch hub when running in standalone App mode", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<MobileAppInstaller />);
    expect(screen.getByTestId("standalone-active-badge")).toBeInTheDocument();
    const links = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(links).toContain("/competitions/agrihackathon");
    expect(links).toContain("/explore");
    expect(links).toContain("/workspace/credits");
    expect(links).toContain("/workspace");
  });

  it("supports switching device tabs and keeps ANS (AI Never Stops) brand accuracy", () => {
    render(<MobileAppInstaller />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "ANS (AI Never Stops) 手机端 App",
    );

    fireEvent.click(screen.getByTestId("platform-tab-ios"));
    expect(screen.getByTestId("guide-panel-ios")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("platform-tab-desktop"));
    expect(screen.getByTestId("guide-panel-desktop")).toBeInTheDocument();
  });
});
