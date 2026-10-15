import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import english from "@/../messages/visual-website/en.json";
import messages from "@/../messages/visual-website/zh.json";
import { VisualStickerLibrary } from "@/components/projects/visual-sticker-library";
vi.mock("next-intl", async original => await original<typeof import("next-intl")>());
afterEach(cleanup);
describe("sticker library filters", () => {
 it("combines style, category and bilingual search without losing the selected preset", () => {
  const onSelect = vi.fn();
  render(<NextIntlClientProvider locale="zh" timeZone="UTC" messages={{ visualWebsite: messages }}><VisualStickerLibrary selected="fluent-rocket" onSelect={onSelect}/></NextIntlClientProvider>);
  expect(screen.getByRole("status")).toHaveTextContent("304 张贴纸");
  expect(screen.getByRole("status")).toHaveTextContent("已选择：火箭");
  fireEvent.click(screen.getByRole("button", { name: "Fluent 3D" }));
  expect(screen.getByRole("status")).toHaveTextContent("24 张贴纸");
  fireEvent.change(screen.getByLabelText(messages.tour.stickerCategory), { target: { value: "hobby" } });
  fireEvent.change(screen.getByLabelText(messages.tour.stickerSearch), { target: { value: "rocket" } });
  const rocket = screen.getByRole("button", { name: "火箭 · Fluent 3D" });
  expect(rocket).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(rocket);expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "fluent-rocket" }));
  fireEvent.change(screen.getByLabelText(messages.tour.stickerSearch), { target: { value: "不存在的贴纸" } });
  fireEvent.click(screen.getByRole("button", { name: messages.tour.stickerClear }));
  expect(screen.getByRole("status")).toHaveTextContent("304 张贴纸");
 });
 it("finds Chinese sticker names while the interface uses English", () => {
  render(<NextIntlClientProvider locale="en" timeZone="UTC" messages={{ visualWebsite: english }}><VisualStickerLibrary selected={undefined} onSelect={vi.fn()}/></NextIntlClientProvider>);
  fireEvent.change(screen.getByLabelText(english.tour.stickerSearch), { target: { value: "火箭" } });
  expect(screen.getByRole("button", { name: "Rocket · Fluent 3D" })).toBeVisible();
 });

});
