import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { HubDirectory } from "@/components/hubs/hub-directory";
import HubDetailPage from "@/app/hubs/[slug]/page";
import { HUBS, getHub } from "@/domain/hubs/registry";
import { resetHubReadCache } from "@/server/hubs/public-reads";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";

const mocks = vi.hoisted(() => ({ members: vi.fn(), list: vi.fn(), platform: vi.fn(), market: vi.fn() }));
vi.mock("@/server/hubs/workflows", () => ({ readHubMemberWorkflows: mocks.members }));
vi.mock("@/components/hubs/hub-member-workflows", () => ({ HubMemberWorkflowList: () => null }));
vi.mock("@/server/workflows/platform-recipes", () => ({ findPublishedPlatformRecipe: mocks.platform }));
vi.mock("@/server/marketplace/workflows", () => ({ publishedRecipeMarketPath: mocks.market }));
vi.mock("@/server/integrations/metered-cost", () => ({ unifiedModelBilling: () => process.env.ANS_UNIFIED_POINTS_ENABLED === "1" }));
vi.mock("@/server/catalog/service", () => ({ listPublishedCatalog: mocks.list }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span data-testid="real-project-cover">{alt}</span> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (href: string) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => (key: string, values?: Record<string, string | number>) => values ? `${key}:${Object.values(values).join(",")}` : key }));
beforeEach(() => { resetHubReadCache(); mocks.members.mockReset(); mocks.members.mockResolvedValue({items:[],total:0,nextCursor:null}); vi.unstubAllEnvs(); mocks.platform.mockReset(); mocks.platform.mockResolvedValue(null); mocks.market.mockReset(); mocks.market.mockResolvedValue(null); mocks.list.mockReset(); mocks.list.mockResolvedValue(CATALOG_PROJECTS); });
afterEach(cleanup);

it("leaves unknown counts out and links single-entry Hubs straight to their entry", async () => {
  render(await HubDirectory({ hubs: HUBS, published: null, publishedRecipeIds: [] }));
  expect(screen.queryByText(/unavailable|summary\.projects/)).toBeNull();
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/competitions/agrihackathon", "/vibe-hub", "/hubs/aigc", "/hubs/full-stack"]);
});
it("sends a Hub whose only content is one entry straight to that entry", async () => {
  await expect(HubDetailPage({ params: Promise.resolve({ slug: "cauhub" }) })).rejects.toThrow("REDIRECT:/competitions/agrihackathon");
  await expect(HubDetailPage({ params: Promise.resolve({ slug: "vibehub" }) })).rejects.toThrow("REDIRECT:/vibe-hub");
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.platform).not.toHaveBeenCalled();
});
it("keeps a single-entry Hub page once it has member workflows, without empty sections", async () => {
  mocks.members.mockResolvedValue({ items: [{ id: "member-1" }], total: 1, nextCursor: null });
  render(await HubDetailPage({ params: Promise.resolve({ slug: "cauhub" }) }));
  expect(screen.getByText("items.cauhub.description")).toBeVisible();
  expect(screen.queryByText("noOfficialWorkflows")).toBeNull();
  expect(screen.queryByText("noProjects")).toBeNull();
  expect(screen.getByRole("link", { name: "resources.agrihackathon.title" })).toHaveAttribute("href", "/competitions/agrihackathon");
  expect(screen.queryByRole("link", { name: /prepareWorkflow/ })).toBeNull();
});
it("omits executable claims and generic preparation when the real registration is absent", async () => {
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.queryByText("noOfficialWorkflows")).toBeNull();
  expect(screen.queryByRole("heading", { name: "officialWorkflowsTitle" })).toBeNull();
  expect(screen.queryByRole("link", { name: "prepareWorkflow" })).toBeNull();
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
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
  render(await HubDirectory({ hubs: [hub], published, publishedRecipeIds: [] }));
  expect(screen.getByText(`summary.projects:${hub.projectSlugs.length - 1}summary.separatorsummary.resources:2`)).toBeInTheDocument();
});
it("rejects an invented university route", async () => {
  await expect(HubDetailPage({ params: Promise.resolve({ slug: "made-up-university" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.list).not.toHaveBeenCalled();
});

it("links the registered platform recipe and its published market version without enqueueing", async () => {
  mocks.platform.mockResolvedValue({ workflow: { id: "real-recipe-id", authorId: "real-owner", slug: "ans-portfolio-website" }, version: { id: "immutable-version", version: 1 }, recipe: { catalogRecipeId: "resume-website", definitionHash: "verified-hash" } });
  mocks.market.mockResolvedValue("/market/real-published-card");
  vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1");
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
  expect(screen.getByRole("link", { name: "viewMarketCard" })).toHaveAttribute("href", "/market/real-published-card");
  expect(screen.getByText("recipeMeteredCost:2")).toBeVisible();
  expect(mocks.market).toHaveBeenCalledWith(expect.objectContaining({ id: "real-recipe-id" }), { id: "immutable-version", version: 1 }, "verified-hash");
  expect(screen.queryByRole("button", { name: /run|generate/ })).toBeNull();
});
it("does not claim a withdrawn market card exists or add a generic recipe to CAU", async () => {
  mocks.platform.mockResolvedValue({ workflow: { id: "real-recipe-id", authorId: "real-owner", slug: "ans-portfolio-website" }, version: { id: "immutable-version", version: 1 }, recipe: { catalogRecipeId: "resume-website", definitionHash: "verified-hash" } });
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
  expect(screen.queryByRole("link", { name: "viewMarketCard" })).toBeNull();
  cleanup(); mocks.platform.mockClear(); resetHubReadCache();
  mocks.members.mockResolvedValue({ items: [{ id: "member-1" }], total: 1, nextCursor: null });
  render(await HubDetailPage({ params: Promise.resolve({ slug: "cauhub" }) }));
  expect(mocks.platform).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
});

it("shows unknown execution availability without losing references after attestation read failure", async () => {
  mocks.platform.mockRejectedValue(new Error("private connection detail"));
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.getByRole("status")).toHaveTextContent("workflowsUnavailable");
  expect(screen.queryByText("noOfficialWorkflows")).toBeNull();
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
  expect(screen.queryByRole("link", { name: "prepareWorkflow" })).toBeNull();
  expect(screen.getByRole("link", { name: "Hello \u7b97\u6cd5" })).toBeVisible();
  expect(document.body.textContent).not.toContain("private connection detail");
  expect(mocks.market).not.toHaveBeenCalled();
});
it("keeps attested recipe information and references without an execution shortcut when its market read fails", async () => {
  mocks.platform.mockResolvedValue({ workflow: { id: "real-recipe-id", authorId: "real-owner", slug: "ans-portfolio-website" }, version: { id: "immutable-version", version: 1 }, recipe: { catalogRecipeId: "resume-website", definitionHash: "verified-hash" } });
  mocks.market.mockRejectedValue(new Error("private market connection detail"));
  render(await HubDetailPage({ params: Promise.resolve({ slug: "full-stack" }) }));
  expect(screen.queryByRole("link", { name: "openWorkflow" })).toBeNull();
  expect(screen.queryByRole("link", { name: "viewMarketCard" })).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("marketUnavailable");
  expect(screen.getByRole("link", { name: "Hello \u7b97\u6cd5" })).toBeVisible();
  expect(document.body.textContent).not.toContain("private market connection detail");
});
it("shows failed recipe counts as unknown only for Hubs which actually configure them", async () => {
  render(await HubDirectory({ hubs: HUBS, published: [], publishedRecipeIds: null }));
  expect(screen.queryByText(/summary\.workflows/)).toBeNull();
  expect(screen.queryByText(/^0$/)).toBeNull();
});

it("adds approved member counts and never converts failed availability to zero", async () => {
 render(await HubDirectory({hubs:HUBS,published:[],publishedRecipeIds:[],memberCounts:{cauhub:3,vibehub:0,aigc:null,"full-stack":2}}));
 const cau=screen.getByRole("link",{name:"items.cauhub.name"});
 expect(cau).toHaveAttribute("href","/hubs/cauhub");
 expect(within(cau.closest("article")!).getByText("summary.workflows:3summary.separatorsummary.resources:1")).toBeVisible();
 const aigc=screen.getByRole("link",{name:"items.aigc.name"}).closest("article")!;
 expect(within(aigc).queryByText(/summary\.workflows/)).toBeNull();
 expect(screen.getByRole("link",{name:"items.vibehub.name"})).toHaveAttribute("href","/vibe-hub");
});
