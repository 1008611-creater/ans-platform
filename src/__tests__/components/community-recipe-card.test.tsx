import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, string>) => values ? `${key}:${Object.values(values).join(",")}` : key }));

import { RecipeCard } from "@/components/community/recipe-card";

const writeText = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  writeText.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("copies the prompt before opening the tool so the clipboard still has focus", async () => {
  const order: string[] = [];
  writeText.mockImplementation(async () => { order.push("copy"); });
  const open = vi.spyOn(window, "open").mockImplementation(() => { order.push("open"); return null; });
  render(<RecipeCard recipe={{ tool: "Midjourney", url: "https://www.midjourney.com", prompt: "ink wash cat" }} />);
  expect(screen.getByText("ink wash cat")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "makeSame" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("copied"));
  expect(writeText).toHaveBeenCalledWith("ink wash cat");
  expect(open).toHaveBeenCalledWith("https://www.midjourney.com", "_blank", "noopener,noreferrer");
  expect(order).toEqual(["copy", "open"]);
  open.mockRestore();
});

it("only copies when there is no link, and says so when copying fails", async () => {
  const open = vi.spyOn(window, "open");
  writeText.mockRejectedValue(new Error("denied"));
  render(<RecipeCard recipe={{ tool: "可灵", prompt: "镜头缓慢推进" }} />);
  fireEvent.click(screen.getByRole("button", { name: "copyOnly" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("copyFailed"));
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});
