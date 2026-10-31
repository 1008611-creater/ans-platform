import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AgriMobileSegments } from "@/components/competitions/agri-mobile-segments";

const labels = { pipeline: "闯关", tracks: "赛道", guide: "指南" };
const view = () => render(<AgriMobileSegments label="分段" labels={labels}>
  <section data-agri-segment="pipeline"><a href="#tracks">赛道与规则</a></section>
  <section data-agri-segment="tracks" id="tracks">Tracks</section>
  <section data-agri-segment="guide">Guide</section>
</AgriMobileSegments>);
const active = (container: HTMLElement) => container.querySelector(".ans-agri-segments")!.getAttribute("data-agri-active");

let phone = true;
beforeEach(() => {
  phone = true;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: phone && query.includes("max-width"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });

it("starts on the steps segment and switches with the segment buttons", () => {
  const { container } = view();
  expect(active(container)).toBe("pipeline");
  expect(screen.getByRole("button", { name: "闯关" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "指南" }));
  expect(active(container)).toBe("guide");
  expect(screen.getByRole("button", { name: "指南" })).toHaveAttribute("aria-pressed", "true");
  // Every section stays in the DOM; CSS hides the inactive ones on phones only.
  expect(screen.getByText("Tracks")).toBeInTheDocument();
});

it("follows an in-page anchor into the segment that holds it on phones", () => {
  const { container } = view();
  fireEvent.click(screen.getByRole("link", { name: "赛道与规则" }));
  expect(active(container)).toBe("tracks");
  expect(window.location.hash).toBe("#tracks");
});

it("leaves anchors alone on wider screens", () => {
  phone = false;
  const { container } = view();
  fireEvent.click(screen.getByRole("link", { name: "赛道与规则" }));
  expect(active(container)).toBe("pipeline");
});

it("opens the tracks segment when the page is loaded at #tracks", async () => {
  window.history.replaceState(null, "", "/#tracks");
  const { container } = view();
  await waitFor(() => expect(active(container)).toBe("tracks"));
});
