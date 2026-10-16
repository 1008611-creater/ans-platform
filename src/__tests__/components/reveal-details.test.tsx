import Link from "next/link";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RevealDetails } from "@/components/catalog/reveal-details";

beforeEach(() => {
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerType = init.pointerType ?? "mouse"; }
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("keeps the closed description available without exposing hidden focus targets", () => {
  render(<RevealDetails id="info" label="About" details={<Link href="/source">Source</Link>}><h2>Project</h2></RevealDetails>);
  expect(document.getElementById("info")).toHaveAttribute("hidden");
  expect(document.getElementById("info")).toHaveAttribute("inert");
  expect(screen.queryByRole("link", { name: "Source" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("lets the pointer cross the gap into a portalled panel without stealing focus", () => {
  vi.useFakeTimers();
  render(<RevealDetails id="info" label="About" details={<p>Source and summary</p>}><Link href="/project">Project</Link></RevealDetails>);
  const root = screen.getByRole("article");
  fireEvent.pointerEnter(root, { pointerType: "mouse" });
  const panel = screen.getByRole("dialog", { name: "About" });
  expect(root.contains(panel)).toBe(false);
  expect(document.activeElement).toBe(document.body);
  fireEvent.pointerLeave(root, { pointerType: "mouse" });
  act(() => { vi.advanceTimersByTime(80); });
  fireEvent.pointerEnter(panel, { pointerType: "mouse" });
  act(() => { vi.advanceTimersByTime(200); });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.pointerLeave(panel, { pointerType: "mouse" });
  act(() => { vi.advanceTimersByTime(141); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("pins on the first touch click, toggles closed and dismisses outside", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<RevealDetails id="info" label="About" details={<p>Summary</p>} onRevealChange={onChange}><Link href="/project">Project</Link></RevealDetails>);
  const button = screen.getByRole("button", { name: "About" });
  await user.pointer([{ target: button, keys: "[TouchA>]" }, { keys: "[/TouchA]" }]);
  expect(button).toHaveAttribute("aria-expanded", "true");
  fireEvent.pointerLeave(screen.getByRole("article"), { pointerType: "touch" });
  expect(button).toHaveAttribute("aria-expanded", "true");
  await user.pointer([{ target: button, keys: "[TouchA>]" }, { keys: "[/TouchA]" }]);
  expect(button).toHaveAttribute("aria-expanded", "false");
  await user.click(button);
  await user.click(document.body);
  await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
  expect(onChange).toHaveBeenCalledWith(true);
  expect(onChange).toHaveBeenCalledWith(false);
});

it("opens on keyboard focus, closes on Escape and does not reopen until reentry", async () => {
  const user = userEvent.setup();
  render(<><RevealDetails id="info" label="About" details={<p>Summary</p>}><Link href="/project">Project</Link></RevealDetails><button>Next</button></>);
  await user.tab();
  expect(screen.getByRole("link")).toHaveFocus();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "About" })).toHaveFocus();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("supports keyboard activation, panel links, Escape focus return and a subsequent Tab away", async () => {
  const user = userEvent.setup();
  render(<><RevealDetails id="info" label="About" details={<Link href="/source">Source</Link>}><h2>Project</h2></RevealDetails><button>Next</button></>);
  await user.tab();
  const trigger = screen.getByRole("button", { name: "About" });
  expect(trigger.closest("a")).toBeNull();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("dialog")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("link", { name: "Source" })).toHaveFocus();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
});

it("clears a pinned panel when focus leaves instead of leaving stale revealed state", async () => {
  const user = userEvent.setup();
  render(<><RevealDetails id="info" label="About" details={<p>Summary</p>}><h2>Project</h2></RevealDetails><button>Next</button></>);
  await user.click(screen.getByRole("button", { name: "About" }));
  act(() => screen.getByRole("button", { name: "Next" }).focus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "About" })).toHaveAttribute("aria-expanded", "false");
});
