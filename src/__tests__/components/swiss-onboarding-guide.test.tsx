import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SwissOnboardingBanner } from "@/components/workspace/swiss-onboarding-guide";

afterEach(() => {
  cleanup();
});

describe("SwissOnboardingBanner & 59.1s MG Video Modal", () => {
  it("renders the banner, external agent URL+Key card, and opens the 59s video modal on click", () => {
    render(<SwissOnboardingBanner pageKey="credits" showGatewayCard />);

    expect(screen.getByText(/打开 MG 动画新手引导 \(59s\)/)).toBeVisible();
    expect(screen.getByText("https://ans.cauai.fun/api/v1")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /打开 MG 动画新手引导 \(59s\)/ }));

    const dialog = screen.getByRole("dialog", { name: "ANS 算力积分系统新手引导" });
    expect(dialog).toBeVisible();

    const video = dialog.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/videos/ans-compute-swiss-guide.mp4");

    fireEvent.click(screen.getByRole("button", { name: /关闭引导/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
