import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CompanionReply } from "@/components/mascot/companion-reply";
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
afterEach(cleanup);
it("formats tables and code while refusing tracking images, HTML and executable links", () => {
  const view = render(<CompanionReply text={'## 建议\n\n- 第一项\n- 第二项\n\n| 步骤 | 说明 |\n| --- | --- |\n| 1 | 准备 |\n\n```js\nconst value = 1;\n```\n\n[站内](/hubs) [外部](https://github.com/example) [禁止](javascript:alert(1)) ![追踪](https://example.test/pixel) <script>alert(1)</script>'} />);
  expect(screen.getByRole("heading", { name: "建议" })).toBeInTheDocument(); expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "站内" })).toHaveAttribute("href", "/hubs");
  expect(screen.getByRole("link", { name: "外部" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(view.container.querySelector("img,script")).toBeNull(); expect(screen.queryByRole("link", { name: "禁止" })).toBeNull();
});
it("copies the actual reply and gives failure feedback", async () => {
  const copy = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("blocked"));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
  render(<CompanionReply text="原始回复" />);
  fireEvent.click(screen.getByRole("button", { name: "copyReply" }));
  await screen.findByRole("button", { name: "replyCopied" }); expect(copy).toHaveBeenCalledWith("原始回复");
  fireEvent.click(screen.getByRole("button", { name: "replyCopied" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("replyCopyFailed"));
});
