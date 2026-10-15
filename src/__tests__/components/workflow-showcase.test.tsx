import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WorkflowShowcase } from "@/components/workflows/workflow-showcase";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
afterEach(cleanup);
it("uses the exact reviewed market listing instead of a retired workflow destination", async () => {
  render(await WorkflowShowcase({ title: "Real workflow", summary: "Real description", href: "/workflows/retired", marketPath: "/market/exact-reviewed-version", version: 3 }));
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(2);
  for (const link of links) expect(link).toHaveAttribute("href", "/market/exact-reviewed-version");
  expect(screen.getByText("viewMarket")).toBeInTheDocument();
});
it("keeps an unlisted Hub workflow as honest information with no execution link", async () => {
  render(await WorkflowShowcase({ title: "Unlisted workflow", summary: "Available information", version: 2, marketPath: null }));
  expect(screen.getByRole("heading", { name: "Unlisted workflow" })).toBeInTheDocument();
  expect(screen.getByText("notListed")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByText("start")).not.toBeInTheDocument();
});
