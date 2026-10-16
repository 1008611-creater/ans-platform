import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgriCredits } from "@/components/competitions/agri-credits";
const changed = vi.fn();
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => true }) }));
const granted = { competitionId: "edition", teamCompetitionId: "entry", state: "GRANTED", amount: 20, used: 3.5, remaining: 16.5, canClaim: false, spendingEnabled: true };
const ok = (data: unknown) => Response.json({ ok: true, data });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { vi.clearAllMocks(); fetchMock = vi.fn().mockResolvedValue(ok(granted)); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("participant compute status", () => {
  it("reads the selected team's actual balance without issuing a grant or personal transfer", async () => {
    render(<AgriCredits actorId="captain" teamCompetitionId="entry" onAccountChanged={changed} />);
    expect(await screen.findByText("16.5")).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/competitions/agrihackathon/credits?teamCompetitionId=entry", expect.objectContaining({ headers: { "x-ans-submission-actor": "captain" }, cache: "no-store" }));
    expect(screen.queryByRole("button", { name: "claim" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([, init]) => !init.method)).toBe(true);
  });
  it("sends one explicit captain claim and replaces pending state with confirmed remaining", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...granted, state: "AVAILABLE", amount: 0, remaining: 0, canClaim: true }));
    render(<AgriCredits actorId="captain" teamCompetitionId="entry" onAccountChanged={changed} />);
    fireEvent.click(await screen.findByRole("button", { name: "claim" }));
    expect(await screen.findByText("16.5")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", body: JSON.stringify({ action: "claim", teamCompetitionId: "entry" }), headers: { "x-ans-submission-actor": "captain", "Content-Type": "application/json" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not display a fabricated allowance when the organizer has not configured one", async () => {
    fetchMock.mockResolvedValue(ok({ ...granted, state: "UNCONFIGURED", amount: 0, used: 0, remaining: 0 }));
    render(<AgriCredits actorId="captain" teamCompetitionId="entry" onAccountChanged={changed} />);
    expect(await screen.findByText("unconfigured")).toBeInTheDocument();
    expect(screen.queryByText("16.5")).not.toBeInTheDocument();
  });
  it("discards a delayed previous account response and clears displayed balances on a switch", async () => {
    let finishOld!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve; })).mockResolvedValue(ok({ ...granted, amount: 9, used: 1, remaining: 8 }));
    const view = render(<AgriCredits actorId="old" teamCompetitionId="entry" onAccountChanged={changed} />);
    view.rerender(<AgriCredits actorId="new" teamCompetitionId="other-entry" onAccountChanged={changed} />);
    expect(await screen.findByText("8")).toBeInTheDocument();
    await act(async () => finishOld(ok(granted)));
    expect(screen.queryByText("16.5")).not.toBeInTheDocument();
  });
  it("invalidates the participant workspace when the authenticated account has changed", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: false, error: { code: "ACCOUNT_CHANGED" } }, { status: 409 }));
    render(<AgriCredits actorId="captain" teamCompetitionId="entry" onAccountChanged={changed} />);
    await act(async () => {});
    expect(changed).toHaveBeenCalledOnce();
  });
});
