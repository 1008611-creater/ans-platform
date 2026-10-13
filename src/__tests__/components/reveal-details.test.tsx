import Link from "next/link";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RevealDetails } from "@/components/catalog/reveal-details";

beforeEach(() => { vi.stubGlobal("PointerEvent", class extends MouseEvent { pointerType: string; constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerType = init.pointerType ?? "mouse"; } }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("hides auxiliary copy until mouse hover and keeps the panel hoverable", () => {
  render(<RevealDetails id="info" label="About" details={<p>Source and summary</p>}><h2>Project</h2></RevealDetails>);
  const panel = document.getElementById("info")!;
  expect(panel).toHaveAttribute("aria-hidden", "true");
  const root = screen.getByRole("article");
  fireEvent.pointerEnter(root, { pointerType: "mouse" });
  expect(panel).toHaveAttribute("aria-hidden", "false");
  fireEvent.pointerLeave(root);
  expect(panel).toHaveAttribute("aria-hidden", "true");
});
it("supports touch disclosure, Escape and dismissal outside the surface", () => {
  const onChange = vi.fn();
  render(<RevealDetails id="info" label="About" details={<p>Summary</p>} onRevealChange={onChange}><Link href="/project">Project</Link></RevealDetails>);
  const button = screen.getByRole("button", { name: "About" });
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(button);
  fireEvent.pointerDown(document.body);
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(onChange).toHaveBeenCalledWith(true);
  expect(onChange).toHaveBeenCalledWith(false);
});
it("reveals on keyboard focus without nesting the information button inside a link", () => {
  render(<RevealDetails id="info" label="About" details={<p>Summary</p>}><Link href="/project">Project</Link></RevealDetails>);
  fireEvent.focus(screen.getByRole("link"));
  expect(document.getElementById("info")).toHaveAttribute("aria-hidden", "false");
  expect(screen.getByRole("button").closest("a")).toBeNull();
  act(() => fireEvent.blur(screen.getByRole("link"), { relatedTarget: document.body }));
  expect(document.getElementById("info")).toHaveAttribute("aria-hidden", "true");
});
