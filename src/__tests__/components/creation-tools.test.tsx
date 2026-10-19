import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CreationTools } from "@/components/workspace/creation-tools";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string, values?: { title?: string }) => values?.title ? `About ${values.title}` : key),
}));

it("keeps all nine destinations with separate, initially hidden explanations", async () => {
  render(await CreationTools());
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual([
    "/workflows/mine", "https://hb.cauai.fun/", "/workflows/easel", "/explore/submit",
    "/market/creator", "/projects", "/teams", "/market", "/market/orders",
  ]);
  const buttons = screen.getAllByRole("button");
  expect(buttons).toHaveLength(9);
  for (const button of buttons) {
    expect(button.closest("a")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).not.toBeVisible();
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toHaveAttribute("inert");
  }
  fireEvent.click(buttons[0]);
  expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById(buttons[0].getAttribute("aria-controls")!)).toHaveTextContent("toolNotes.workflows");
});
