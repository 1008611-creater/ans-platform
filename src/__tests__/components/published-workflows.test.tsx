import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PublishedWorkflowList } from "@/app/workflows/published-workflow-list";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/server/workflows/service", () => ({ listPublishedWorkflows: mocks.list }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("distinguishes connection failure from an empty list and retries the same search", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.list.mockRejectedValue(new Error("database exception with private connection details"));
  render(await PublishedWorkflowList({ query: "AI & 视频" }));
  expect(screen.getByText("workflowUnavailableTitle")).toBeInTheDocument();
  expect(screen.queryByText("workflowEmpty")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "retry" })).toHaveAttribute("href", `/workflows?q=${encodeURIComponent("AI & 视频")}`);
  expect(JSON.stringify(log.mock.calls)).not.toContain("private connection details");
});

it("renders the empty state only when the real query succeeds with zero results", async () => {
  mocks.list.mockResolvedValue([]);
  render(await PublishedWorkflowList({ query: "" }));
  expect(screen.getByText("workflowEmpty")).toBeInTheDocument();
  expect(screen.queryByText("workflowUnavailableTitle")).not.toBeInTheDocument();
  expect(mocks.list).toHaveBeenLastCalledWith({ query: undefined, take: 24 });
});
