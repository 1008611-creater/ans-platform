import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { HubDirectory } from "@/components/hubs/hub-directory";
import HubDetailPage from "@/app/hubs/[slug]/page";
import { HUBS, getHub } from "@/domain/hubs/registry";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/server/catalog/service", () => ({ listPublishedCatalog: mocks.list }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span data-testid="real-project-cover">{alt}</span> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => (key: string, values?: Record<string, string | number>) => values ? `${key}:${Object.values(values).join(",")}` : key }));
beforeEach(() => { mocks.list.mockReset(); mocks.list.mockResolvedValue(CATALOG_PROJECTS); });
afterEach(cleanup);

it("keeps unknown project counts unknown while showing real Hub links", async () => {
  render(await HubDirectory({ hubs: HUBS, published: null }));
  expect(screen.getAllByText("unavailable")).toHaveLength(4);
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/hubs/cauhub", "/hubs/vibehub", "/hubs/aigc", "/hubs/full-stack"]);
});
it("keeps CAU explicit and does not claim generic runnable projects", async () => {
  render(await HubDetailPage({ params: Promise.resolve({ slug: "cauhub" }) }));
  expect(screen.getByText("noRunnable")).toBeVisible();
  expect(screen.getByText("noProjects")).toBeVisible();
  expect(screen.getByRole("link", { name: "resources.agrihackathon.title" })).toHaveAttribute("href", "/competitions/agrihackathon");
  expect(screen.queryByRole("link", { name: /prepareWorkflow/ })).toBeNull();
});
it("offers the real fixed recipe through preparation with exact compute cost, without running it", async () => {
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.getByText("recipeCost:2")).toBeVisible();
  expect(screen.getByRole("link", { name: "prepareWorkflow" })).toHaveAttribute("href", "/projects?goal=portfolio&workflow=resume-website#new-project");
  expect(mocks.list).toHaveBeenCalledExactlyOnceWith();
  expect(screen.queryByRole("button", { name: /run|generate/ })).toBeNull();
});
it("omits project cards after a publication read fails and does not expose internal errors", async () => {
  mocks.list.mockRejectedValue(new Error("private database connection"));
  render(await HubDetailPage({ params: Promise.resolve({ slug: "aigc" }) }));
  expect(screen.getByRole("status")).toHaveTextContent("catalogUnavailable");
  expect(screen.queryAllByTestId("real-project-cover")).toHaveLength(0);
  expect(document.body.textContent).not.toContain("private database connection");
  expect(screen.getByRole("link", { name: "resources.hypit.title" })).toHaveAttribute("href", "/workflows/hypit");
});
it("renders exact published-project counts without adding a withdrawn reference", async () => {
  const hub = getHub("aigc")!;
  const published = CATALOG_PROJECTS.filter(project => project.slug !== "comfyui");
  render(await HubDirectory({ hubs: [hub], published }));
  const projects = screen.getByText("counts.projects").parentElement!;
  expect(within(projects).getByText(String(hub.projectSlugs.length - 1))).toBeInTheDocument();
});
it("rejects an invented university route", async () => {
  await expect(HubDetailPage({ params: Promise.resolve({ slug: "made-up-university" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.list).not.toHaveBeenCalled();
});
