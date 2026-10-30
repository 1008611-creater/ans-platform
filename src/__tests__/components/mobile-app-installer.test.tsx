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
    ).toEqual({ platform: "wechat", inAppName: "WeChat", underlyingOs: "ios" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36 V1_AND_SQ_9.0.0 QQ/9.0.0",
      ),
    ).toEqual({ platform: "wechat", inAppName: "QQ", underlyingOs: "android" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ platform: "ios", inAppName: null, underlyingOs: "ios" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Linux; Android 14; SM-S9180) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
      ),
    ).toEqual({ platform: "android", inAppName: null, underlyingOs: "android" });

    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
      ),
    ).toEqual({ platform: "desktop", inAppName: null, underlyingOs: "desktop" });
  });

  it("shows prominent WeChat escape banner when opened inside WeChat built-in browser", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0.50",
    );

    render(<MobileAppInstaller />);
    expect(screen.getByTestId("wechat-escape-banner")).toBeInTheDocument();
    expect(screen.getByTestId("guide-panel-wechat")).toBeInTheDocument();
    expect(screen.getAllByText(/在默认浏览器中打开/).length).toBeGreaterThan(0);
  });

  it("auto-triggers APK download and exposes direct download links on Android browsers", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125.0.0.0 Mobile Safari/537.36",
    );
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<MobileAppInstaller />);
    expect(screen.getByTestId("guide-panel-android")).toBeInTheDocument();
    expect(screen.getByTestId("download-android-apk-link")).toHaveAttribute(
      "href",
      "/api/app/download?platform=android",
    );
    expect(screen.getByTestId("download-ios-profile-link")).toHaveAttribute(
      "href",
      "/api/app/download?platform=ios",
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(screen.getByTestId("auto-download-status")).toHaveTextContent(
      /已为您自动发起安卓安装包/,
    );

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
    vi.useRealTimers();
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
