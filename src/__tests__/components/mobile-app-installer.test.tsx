import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANDROID_DOWNLOAD_PATH,
  MobileAppInstaller,
  detectDeviceEnvironment,
} from "@/components/mobile/mobile-app-installer";

const localeState = vi.hoisted(() => ({ locale: "zh" as "zh" | "en" }));

vi.mock("next-intl", () => ({
  useLocale: () => localeState.locale,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ""} />,
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }: { value: string; title: string }) => (
    <svg role="img" aria-label={title} data-qr-value={value} />
  ),
}));

vi.mock("@/components/providers/workspace-navigation", () => ({
  WorkspaceLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/125.0.0.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const release = { versionName: "1.3.0", sizeLabel: "1.2 MB" };

function mockUserAgent(ua: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
}

describe("MobileAppInstaller & detectDeviceEnvironment", () => {
  beforeEach(() => {
    localeState.locale = "zh";
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

    expect(detectDeviceEnvironment(IPHONE_UA)).toEqual({ platform: "ios", inAppName: null, underlyingOs: "ios" });
    expect(detectDeviceEnvironment(ANDROID_UA)).toEqual({
      platform: "android",
      inAppName: null,
      underlyingOs: "android",
    });
    expect(
      detectDeviceEnvironment(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
      ),
    ).toEqual({ platform: "desktop", inAppName: null, underlyingOs: "desktop" });
  });

  it("covers the page with an open-in-browser overlay inside WeChat and never auto-downloads", () => {
    vi.useFakeTimers();
    mockUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36 MicroMessenger/8.0.50");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<MobileAppInstaller androidRelease={release} />);
    const overlay = screen.getByTestId("wechat-escape-banner");
    expect(overlay).toHaveTextContent("点右上角「···」");
    expect(overlay).toHaveTextContent("在浏览器打开");
    expect(screen.getByTestId("guide-panel-android")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(clickSpy).not.toHaveBeenCalled();

    fireEvent.click(overlay);
    expect(screen.queryByTestId("wechat-escape-banner")).not.toBeInTheDocument();
  });

  it("starts the APK download once on Android browsers and keeps a manual button", () => {
    vi.useFakeTimers();
    mockUserAgent(ANDROID_UA);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<MobileAppInstaller androidRelease={release} />);
    const button = screen.getByTestId("direct-download-installer-btn");
    expect(button).toHaveAttribute("href", ANDROID_DOWNLOAD_PATH);
    expect(screen.getByText("v1.3.0 · 1.2 MB")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(screen.getByTestId("auto-download-status")).toHaveTextContent("已开始下载");
  });

  it("does not offer a download before an Android release exists", () => {
    vi.useFakeTimers();
    mockUserAgent(ANDROID_UA);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<MobileAppInstaller androidRelease={null} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId("direct-download-installer-btn")).not.toBeInTheDocument();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("guides iPhone users to Add to Home Screen instead of downloading a profile", () => {
    mockUserAgent(IPHONE_UA);
    render(<MobileAppInstaller androidRelease={release} />);
    const panel = screen.getByTestId("guide-panel-ios");
    expect(panel).toHaveTextContent("添加到主屏幕");
    expect(panel).not.toHaveTextContent("描述文件");
  });

  it("shows quick links instead of install steps when already running inside the App", () => {
    mockUserAgent(`${ANDROID_UA} ANSMobileApp/1.3.0`);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<MobileAppInstaller androidRelease={release} />);
    expect(screen.getByTestId("standalone-active-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("guide-panel-android")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(links).toEqual(
      expect.arrayContaining(["/competitions/agrihackathon", "/explore", "/workspace/credits", "/workspace"]),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("shows a scan-to-install QR code on desktop and keeps the brand name exact", () => {
    render(<MobileAppInstaller androidRelease={release} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ANS (AI Never Stops) 手机 App");
    expect(screen.getByTestId("guide-panel-desktop")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "手机扫码安装" })).toHaveAttribute(
      "data-qr-value",
      "https://ans.cauai.fun/app",
    );

    fireEvent.click(screen.getByTestId("platform-tab-ios"));
    expect(screen.getByTestId("guide-panel-ios")).toBeInTheDocument();
  });
});
