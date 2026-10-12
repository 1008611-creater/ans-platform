import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketAccountBoundary, useMarketUpload } from "@/components/marketplace/account-boundary";
import { ListingEditor } from "@/components/marketplace/listing-editor";
import { CreatePointsOrder } from "@/components/marketplace/create-points-order";
import { MarketStar } from "@/components/marketplace/market-star";
import { MarketRequestRejection } from "@/components/marketplace/request";
const m = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn(), push: vi.fn(), actor: "buyer", fetch: vi.fn() }));
vi.mock("next/image", () => ({ default: (props: { src: string; alt: string }) => <span role="img" aria-label={props.alt} data-src={props.src}/> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: "authenticated" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: m.push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => true }) }));
vi.mock("@/components/marketplace/request", async original => ({ ...await original<typeof import("@/components/marketplace/request")>(), marketRequest: m.request }));
beforeEach(() => { vi.clearAllMocks(); m.actor = "buyer"; vi.stubGlobal("fetch", m.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = (children: React.ReactNode) => <MarketAccountBoundary actorId="buyer">{children}</MarketAccountBoundary>;
const tiers = [{ id: "basic", title: "Basic", description: "One outcome", priceMinor: 100, deliverables: ["File"] }, { id: "full", title: "Full", description: "More outcomes", priceMinor: 500, deliverables: ["File", "Support"] }];
function Upload() { const upload = useMarketUpload(); return <button onClick={() => void upload(new File(["original"], "cover.png", { type: "image/png" })).then(result => m.push(result.url)).catch(() => {})}>upload</button>; }
describe("project market account and commands", () => {
  it("submits selected tier without accepting a client supplied price", async () => {
    m.request.mockResolvedValue({ order: { id: "order" } }); render(wrap(<CreatePointsOrder listingId="listing" version={3} available tiers={tiers}/>));
    fireEvent.click(screen.getByRole("radio", { name: /Full/ })); fireEvent.click(screen.getByRole("button", { name: "createPointsOrder" }));
    await act(async () => {}); expect(m.request.mock.calls[0][2]).toMatchObject({ listingId: "listing", expectedVersion: 3, tierId: "full" }); expect(m.request.mock.calls[0][2]).not.toHaveProperty("priceMinor"); expect(m.push).toHaveBeenCalledWith("/market/orders/order");
  });
  it("freezes tier selection and retries exactly the original command after ambiguous failure", async () => {
    m.request.mockRejectedValueOnce(new Error("INTERNAL_ERROR")).mockResolvedValueOnce({ order: { id: "order" } }); render(wrap(<CreatePointsOrder listingId="listing" version={3} available tiers={tiers}/>));
    fireEvent.click(screen.getByRole("button", { name: "createPointsOrder" })); await act(async () => {});
    expect(screen.getByRole("radio", { name: /Full/ })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "createPointsOrder" })); await act(async () => {});
    expect(m.request.mock.calls[1][2]).toEqual(m.request.mock.calls[0][2]);
  });
  it("releases selection only on a confirmed request rejection", async () => {
    m.request.mockRejectedValue(new MarketRequestRejection("INVALID_INPUT", 400)); render(wrap(<CreatePointsOrder listingId="listing" version={3} available tiers={tiers}/>));
    fireEvent.click(screen.getByRole("button", { name: "createPointsOrder" })); await act(async () => {}); expect(screen.getByRole("radio", { name: /Full/ })).toBeEnabled();
  });
  it("blocks buying the current account's own project", () => {
    render(wrap(<CreatePointsOrder listingId="listing" version={3} available tiers={tiers} isOwner/>)); expect(screen.getByRole("button", { name: "ownProject" })).toBeDisabled(); expect(m.request).not.toHaveBeenCalled();
  });
  it("does not navigate after a points order arrives for the old account", async () => {
    let resolve: (value: unknown) => void = () => {}; m.request.mockReturnValue(new Promise(done => { resolve = done; }));
    const child = <CreatePointsOrder listingId="listing" version={3} available tiers={tiers}/>; const view = render(wrap(child)); fireEvent.click(screen.getByRole("button", { name: "createPointsOrder" })); m.actor = "other"; view.rerender(wrap(child)); await act(async () => resolve({ order: { id: "private-order" } })); expect(m.push).not.toHaveBeenCalled();
  });
  it("retries the same desired Star value after ambiguous failure and uses the server count", async () => {
    m.request.mockRejectedValueOnce(new Error("INTERNAL_ERROR")).mockResolvedValueOnce({ starCount: 9, starred: true }); render(wrap(<MarketStar listingId="listing" initialCount={7} initialStarred={false}/>));
    fireEvent.click(screen.getByRole("button", { name: /star 7/ })); await act(async () => {}); fireEvent.click(screen.getByRole("button", { name: /star 7/ })); await act(async () => {});
    expect(m.request.mock.calls.map(call => call[2])).toEqual([{ starred: true }, { starred: true }]); expect(screen.getByRole("button", { name: /starred 9/ })).toHaveAttribute("aria-pressed", "true");
  });
  it("sends original cover bytes as FormData with the current actor and no JSON content-type", async () => {
    m.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { url: "https://ans.cauai.fun/media/cover.png" } }) }); render(wrap(<Upload/>)); fireEvent.click(screen.getByRole("button", { name: "upload" })); await act(async () => {});
    const options = m.fetch.mock.calls[0][1]; expect(options.headers).toEqual({ "x-ans-actor": "buyer" }); expect(options.body).toBeInstanceOf(FormData); const file = options.body.get("file") as File; expect(file.name).toBe("cover.png"); expect(file.size).toBe(8); expect(m.push).toHaveBeenCalledWith("https://ans.cauai.fun/media/cover.png");
  });
  it("aborts an old account cover upload and suppresses a late URL", async () => {
    let resolve: (value: unknown) => void = () => {}; m.fetch.mockReturnValue(new Promise(done => { resolve = done; })); const view = render(wrap(<Upload/>)); fireEvent.click(screen.getByRole("button", { name: "upload" }));
    const signal = m.fetch.mock.calls[0][1].signal as AbortSignal; m.actor = "other"; view.rerender(wrap(<Upload/>)); expect(signal.aborted).toBe(true); await act(async () => resolve({ ok: true, json: async () => ({ ok: true, data: { url: "https://ans.cauai.fun/old.png" } }) })); expect(m.push).not.toHaveBeenCalled();
  });
});

function fillBase() {
  fireEvent.change(screen.getByRole("textbox", { name: "fields.title" }), { target: { value: "Actual project" } });
  fireEvent.change(screen.getByRole("textbox", { name: "fields.summary" }), { target: { value: "A clear and actual project summary." } });
  fireEvent.change(screen.getByRole("textbox", { name: "fields.description" }), { target: { value: "The project solves an actual problem with a concrete implementation." } });
  fireEvent.change(screen.getByRole("textbox", { name: "fields.deliverables" }), { target: { value: "Source code\nDeployment guide" } });
  fireEvent.change(screen.getByRole("textbox", { name: "fields.licenseTerms" }), { target: { value: "Personal use with author permission." } });
}
function fillPaid() {
  fillBase(); fireEvent.change(screen.getByRole("textbox", { name: "fields.slug" }), { target: { value: "actual-project" } });
  fireEvent.change(screen.getByRole("textbox", { name: "tierTitle" }), { target: { value: "Basic" } });
  fireEvent.change(screen.getByRole("textbox", { name: "tierPrice" }), { target: { value: "2.50" } });
  fireEvent.change(screen.getByRole("textbox", { name: "tierDescription" }), { target: { value: "Source and docs" } });
  fireEvent.change(screen.getByRole("textbox", { name: /tierDeliverables/ }), { target: { value: "Source code\nGuide" } });
}
describe("project publishing draft", () => {
  it("accepts a free project with a GitHub URL alone and keeps that URL in its draft", async () => {
    m.request.mockResolvedValue({ listing: { id: "new" } }); render(wrap(<ListingEditor share/>)); fillBase();
    fireEvent.change(screen.getByRole("textbox", { name: /githubUrl/ }), { target: { value: "https://github.com/owner/project" } });
    fireEvent.submit(screen.getByRole("button", { name: "save" }).closest("form")!); await act(async () => {});
    expect(m.request.mock.calls[0][2]).toMatchObject({ priceMinor: 0, githubUrl: "https://github.com/owner/project", pricingTiers: [] }); expect(m.push).toHaveBeenCalledWith("/market/creator/new");
  });
  it("saves two independently priced tiers with stable IDs and previews only author input", async () => {
    m.request.mockResolvedValue({ listing: { id: "new" } }); render(wrap(<ListingEditor/>)); fillPaid();
    fireEvent.click(screen.getByRole("button", { name: "addTier" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "tierTitle" })[1], { target: { value: "Full" } });
    fireEvent.change(screen.getAllByRole("textbox", { name: "tierPrice" })[1], { target: { value: "10" } });
    fireEvent.change(screen.getAllByRole("textbox", { name: "tierDescription" })[1], { target: { value: "Source and deployment" } });
    expect(screen.getByRole("heading", { name: "Actual project" })).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("button", { name: "save" }).closest("form")!); await act(async () => {});
    const submitted = m.request.mock.calls[0][2]; expect(submitted.pricingTiers).toHaveLength(2); expect(submitted.pricingTiers.map((tier: { priceMinor: number }) => tier.priceMinor)).toEqual([250, 1000]); expect(submitted.pricingTiers[0].id).toBe("basic"); expect(submitted.pricingTiers[1].deliverables).toEqual(["Source code", "Deployment guide"]);
  });
  it("rejects a zero priced paid tier without sending a create command", async () => {
    render(wrap(<ListingEditor/>)); fillPaid(); fireEvent.change(screen.getByRole("textbox", { name: "tierPrice" }), { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("button", { name: "save" }).closest("form")!); await act(async () => {}); expect(m.request).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent("errors.INVALID_INPUT");
  });
  it("rejects an oversized cover before transmitting it", async () => {
    render(wrap(<ListingEditor/>)); const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/uploadCover/), { target: { files: [oversized] } }); await act(async () => {}); expect(m.fetch).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent("coverInvalid");
  });
});
