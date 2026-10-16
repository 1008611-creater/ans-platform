// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DbTransaction } from "@/lib/db";
const m = vi.hoisted(() => ({ db: { $transaction: vi.fn(), $queryRaw: vi.fn(), $executeRaw: vi.fn(),
  quotaLedger: { create: vi.fn(), findUnique: vi.fn() }, auditLog: { create: vi.fn() },
  workflowRun: { findFirst: vi.fn() }, apiComputeRequest: { findFirst: vi.fn() },
  user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn() } } }));
vi.mock("@/lib/db", () => ({ db: m.db }));
import { claimAgriTeamCredits, getAgriTeamCredits, debitAgriTeamCredits, refundAgriTeamCredits, grantAgriRegistrationCredits, prelockAgriTeamCharge, assertAgriChargeWindowCurrent } from "@/server/competitions/agrihackathon/credits";
import { debitQuota, refundQuota } from "@/server/quota/service";
const tx = m.db as unknown as DbTransaction;
let entry: { id: string; competitionId: string; teamId: string; entryStatus: string; frozen: boolean };
let member: { role: string; status: string };
let workspace: { competitionId: string; enabled: boolean; publishedRuleVersionId: string | null };
let wallet: { id: string; competitionId: string; teamCompetitionId: string; amount: number; used: number } | null;
let points: number | undefined;
let now: Date;
let accountAvailable: boolean;
let clocks: Date[];
let registered: boolean;
let workspaceExists: boolean;
let finalIncludesDeadline: boolean;
let savepoint: { wallet: typeof wallet; ledgers: typeof ledgers } | null;
const ledgers = new Map<string, { id: string; userId: null; amount: number; refType: string; refId: string }>();
const charge = { userId: "captain", costPoints: 0.254321, ref: { type: "workflow_run", id: "run-1" }, note: "Run reservation" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  entry = { id: "entry", competitionId: "edition", teamId: "team", entryStatus: "REGISTERED", frozen: false };
  member = { role: "OWNER", status: "ACTIVE" };
  workspace = { competitionId: "edition", enabled: true, publishedRuleVersionId: "rules" };
  wallet = null; points = 10.123456; now = new Date("2030-01-02T00:00:00Z"); accountAvailable = true; ledgers.clear(); clocks = []; registered = true; workspaceExists = true; finalIncludesDeadline = false; savepoint = null;
  m.db.$transaction.mockImplementation(async fn => {
    const beforeWallet = wallet ? { ...wallet } : null, beforeLedgers = new Map(ledgers);
    try { return await fn(m.db); }
    catch (error) { wallet = beforeWallet; ledgers.clear(); for (const [id, row] of beforeLedgers) ledgers.set(id, row); throw error; }
  });
  m.db.$queryRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const sql = parts.join("?");
    if (sql.includes("FROM agri_workspaces")) return workspaceExists ? [workspace] : [];
    if (sql.includes("FROM users")) return accountAvailable ? [{ flagged: false, deletedAt: null }] : [];
    if (sql.includes("FROM agri_rule_versions")) return [{ id: "rules", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [], ...(points === undefined ? {} : { computeGrantPoints: points }) } }];
    if (sql.includes("FROM agri_stage_windows")) return [{ stage: "REGISTRATION", state: "CONFIRMED", opensAt: new Date("2030-01-01"), closesAt: new Date("2030-01-02"), includesDeadline: false }, { stage: "FINAL", state: "CONFIRMED", opensAt: new Date("2030-01-03"), closesAt: new Date("2030-01-04"), includesDeadline: finalIncludesDeadline }];
    if (sql.includes("clock_timestamp()")) return [{ now: clocks.length ? clocks.shift()! : now }];
    if (sql.includes("SELECT id FROM team_competitions")) return registered ? [{ id: entry.id }] : [];
    if (sql.includes("FROM team_competitions")) return values[0] === entry.id && values[1] === entry.competitionId ? [entry] : [];
    if (sql.includes("FROM team_members")) return [member];
    if (sql.includes("FROM projects")) return [{ teamId: "team", ownerId: "captain", status: "ACTIVE" }];
    if (sql.includes("FROM agri_team_compute_grants g")) return wallet ? [{ id: wallet.id, teamCompetitionId: wallet.teamCompetitionId }] : [];
    if (sql.includes("FROM agri_team_compute_grants")) return wallet ? [{ ...wallet }] : [];
    throw new Error("Unexpected credit query: " + sql);
  });
  m.db.$executeRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const sql = parts.join("?");
    if (sql.startsWith("SAVEPOINT")) savepoint = { wallet: wallet ? { ...wallet } : null, ledgers: new Map(ledgers) };
    else if (sql.startsWith("ROLLBACK TO SAVEPOINT")) { wallet = savepoint!.wallet; ledgers.clear(); for (const [id, row] of savepoint!.ledgers) ledgers.set(id, row); }
    else if (sql.startsWith("RELEASE SAVEPOINT")) savepoint = null;
    else if (sql.startsWith("INSERT INTO agri_team_compute_grants")) wallet = { id: String(values[0]), competitionId: String(values[1]), teamCompetitionId: String(values[2]), amount: Number(values[4]), used: 0 };
    else if (sql.includes("SET used=used+")) wallet!.used = Math.round((wallet!.used + Number(values[0])) * 1e6) / 1e6;
    else if (sql.includes("SET used=used-")) wallet!.used = Math.round((wallet!.used - Number(values[0])) * 1e6) / 1e6;
    else throw new Error("Unexpected credit mutation: " + sql);
    return 1;
  });
  m.db.quotaLedger.findUnique.mockImplementation(async ({ where }) => ledgers.get(where.id) ?? null);
  m.db.quotaLedger.create.mockImplementation(async ({ data }) => { if (ledgers.has(data.id)) throw new Error("duplicate ledger"); if (data.id) ledgers.set(data.id, data); return data; });
  m.db.workflowRun.findFirst.mockResolvedValue({ project: { id: "project", teamId: "team", ownerId: "captain", status: "ACTIVE" } });
});
afterEach(() => vi.unstubAllEnvs());

describe("event compute wallet", () => {
  it("does not fabricate a grant when the published policy has no amount", async () => {
    points = undefined;
    expect(await claimAgriTeamCredits("captain", "entry")).toMatchObject({ state: "UNCONFIGURED", amount: 0, remaining: 0 });
    expect(m.db.$executeRaw).not.toHaveBeenCalled(); expect(m.db.quotaLedger.create).not.toHaveBeenCalled();
  });
  it("grants once per edition/team, binds the exact policy, and preserves the original grant after rule edits", async () => {
    expect(await claimAgriTeamCredits("captain", "entry")).toMatchObject({ state: "GRANTED", amount: 10.123456, remaining: 10.123456 });
    points = 99;
    expect(await claimAgriTeamCredits("captain", "entry")).toMatchObject({ amount: 10.123456 });
    expect(m.db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(m.db.quotaLedger.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: "TEAM_GRANT", userId: null, refType: "AGRIHACKATHON_TEAM_GRANT" }) }));
    expect(m.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ competitionId: "edition", ruleVersionId: "rules", amount: 10.123456 }) }) }));
    const sql = m.db.$queryRaw.mock.calls.map(([parts]) => parts.join("?"));
    expect(sql.some(s => s.includes("FROM agri_workspaces") && s.includes("FOR UPDATE"))).toBe(true);
    expect(sql.some(s => s.includes("FROM team_competitions") && s.includes("FOR UPDATE"))).toBe(true);
  });
  it("requires the current edition, active membership and captain for a manual grant", async () => {
    await expect(claimAgriTeamCredits("captain", "other-entry")).rejects.toMatchObject({ code: "AGRI_ENTRY_NOT_FOUND" });
    member.role = "ADMIN";
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_TEAM_MANAGER_REQUIRED" });
    member.role = "OWNER"; member.status = "LEFT";
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_TEAM_PERMISSION_REQUIRED" });
    member.status = "ACTIVE"; entry.entryStatus = "REJECTED";
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_CREDITS_ENTRY_INACTIVE" });
    expect(m.db.quotaLedger.create).not.toHaveBeenCalled();
  });
  it.each(["disabled", "frozen", "not-started", "closed"])("does not issue a configured grant while %s", async state => {
    if (state === "disabled") workspace.enabled = false;
    if (state === "frozen") entry.frozen = true;
    if (state === "not-started") now = new Date("2029-12-31");
    if (state === "closed") now = new Date("2030-01-04");
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_CREDITS_CYCLE_CLOSED" });
    expect(m.db.quotaLedger.create).not.toHaveBeenCalled();
  });
  it("debits a real owned team workflow and updates fractional remaining without changing personal balance", async () => {
    await claimAgriTeamCredits("captain", "entry");
    await expect(debitQuota(tx, charge)).resolves.toBe(9.869135);
    expect(await getAgriTeamCredits("captain", "entry")).toMatchObject({ used: 0.254321, remaining: 9.869135 });
    expect(m.db.user.updateMany).not.toHaveBeenCalled(); expect(m.db.user.update).not.toHaveBeenCalled();
    expect(m.db.quotaLedger.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: null, amount: -0.254321, reason: "RUN_COST" }) }));
    await debitQuota(tx, charge);
    expect(wallet!.used).toBe(0.254321);
    await expect(debitQuota(tx, { ...charge, costPoints: 0.2 })).rejects.toMatchObject({ message: "AGRI_CREDITS_CHARGE_CONFLICT" });
  });
  it("routes actual metered model reservations through their owned workflow parent", async () => {
    await claimAgriTeamCredits("captain", "entry");
    m.db.apiComputeRequest.findFirst.mockResolvedValue({ price: { parent: { type: "workflow_run", id: "run-1" } } });
    await expect(debitAgriTeamCredits(tx, { ...charge, ref: { type: "api_compute_request", id: "request-1" } })).resolves.toBe(9.869135);
    expect(m.db.workflowRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run-1", userId: "captain" } }));
  });
  it("does not pay for arbitrary market orders, external API calls or another owner's project", async () => {
    await claimAgriTeamCredits("captain", "entry");
    expect(await debitAgriTeamCredits(tx, { ...charge, ref: { type: "market_order", id: "order" } })).toBeNull();
    m.db.apiComputeRequest.findFirst.mockResolvedValue({ price: {} });
    expect(await debitAgriTeamCredits(tx, { ...charge, ref: { type: "api_compute_request", id: "external" } })).toBeNull();
    m.db.workflowRun.findFirst.mockResolvedValue({ project: { id: "project", teamId: "team", ownerId: "another-owner", status: "ACTIVE" } });
    expect(await debitAgriTeamCredits(tx, charge)).toBeNull();
    expect(wallet!.used).toBe(0);
  });
  it("refuses event overspending or revoked membership without falling through to personal points", async () => {
    await claimAgriTeamCredits("captain", "entry");
    await expect(debitQuota(tx, { ...charge, costPoints: 11 })).rejects.toMatchObject({ code: "INSUFFICIENT_QUOTA", status: 402 });
    member.status = "LEFT";
    await expect(debitQuota(tx, charge)).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE", status: 403 });
    expect(m.db.user.updateMany).not.toHaveBeenCalled(); expect(wallet!.used).toBe(0);
  });
  it("returns verified unused points to the original wallet after close, departure or edition unbinding", async () => {
    await claimAgriTeamCredits("captain", "entry"); await debitQuota(tx, charge);
    workspace.enabled = false; member.status = "LEFT"; entry.frozen = true; now = new Date("2031-01-01"); vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "");
    await refundQuota(tx, { ...charge, costPoints: 0.2 });
    expect(wallet!.used).toBe(0.054321);
    await refundQuota(tx, { ...charge, costPoints: 0.2 });
    expect(wallet!.used).toBe(0.054321);
    await expect(refundAgriTeamCredits(tx, { ...charge, costPoints: 0.3 })).rejects.toMatchObject({ code: "AGRI_CREDITS_REFUND_CONFLICT" });
    expect(m.db.user.update).not.toHaveBeenCalled();
  });
  it("prelocks owned team projects before gateway accounts even before a concurrent first grant", async () => {
    await prelockAgriTeamCharge(tx, "captain", { type: "workflow_run", id: "run-1" });
    expect(m.db.$queryRaw.mock.calls.some(([parts]) => parts.join("?").includes("FROM agri_workspaces"))).toBe(true);
  });
  it("keeps valid registration successful when the configured compute cycle is not open", async () => {
    now = new Date("2029-12-31");
    await expect(grantAgriRegistrationCredits(tx, "captain", "edition", "entry")).resolves.toMatchObject({ state: "AVAILABLE", amount: 0, canClaim: false });
    expect(m.db.quotaLedger.create).not.toHaveBeenCalled();
  });
  it("rejects a captain grant when its wallet wait crosses the final deadline", async () => {
    clocks = [now, new Date("2030-01-04")];
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_CREDITS_CYCLE_CLOSED" });
    expect(wallet).toBeNull(); expect(ledgers.size).toBe(0);
  });
  it("rolls back a captain grant and its ledger when the audit completes after the deadline", async () => {
    clocks = [now, now, new Date("2030-01-04")];
    await expect(claimAgriTeamCredits("captain", "entry")).rejects.toMatchObject({ code: "AGRI_CREDITS_CYCLE_CLOSED" });
    expect(wallet).toBeNull(); expect(ledgers.size).toBe(0);
  });
  it("rolls back only an automatic grant crossing cutoff and preserves the valid outer registration", async () => {
    clocks = [now, now, new Date("2030-01-04")];
    const result = await m.db.$transaction((transaction: DbTransaction) => grantAgriRegistrationCredits(transaction, "captain", "edition", "entry"));
    expect(result).toMatchObject({ state: "AVAILABLE", canClaim: false });
    expect(wallet).toBeNull(); expect(ledgers.size).toBe(0);
    expect(m.db.$executeRaw.mock.calls.some(([parts]) => parts.join("?").startsWith("ROLLBACK TO SAVEPOINT"))).toBe(true);
  });
  it.each(["wallet-wait", "ledger-write"])("rejects and rolls back an event debit that crosses cutoff during %s", async phase => {
    await claimAgriTeamCredits("captain", "entry");
    clocks = phase === "wallet-wait" ? [now, new Date("2030-01-04")] : [now, now, new Date("2030-01-04")];
    await expect(m.db.$transaction((transaction: DbTransaction) => debitQuota(transaction, charge))).rejects.toMatchObject({ status: 403 });
    expect(wallet!.used).toBe(0); expect(ledgers.size).toBe(1);
  });
  it("rolls back an event debit when later outer workflow writes cross the final cutoff", async () => {
    await claimAgriTeamCredits("captain", "entry");
    await expect(m.db.$transaction(async (transaction: DbTransaction) => {
      await debitQuota(transaction, charge);
      now = new Date("2030-01-04");
      await assertAgriChargeWindowCurrent(transaction, charge.userId, charge.ref);
    })).rejects.toMatchObject({ code: "AGRI_CREDITS_CYCLE_CLOSED", status: 403 });
    expect(wallet!.used).toBe(0); expect(ledgers.size).toBe(1);
  });
  it("keeps the configured inclusive deadline valid at the final check", async () => {
    finalIncludesDeadline = true; clocks = [now, now, new Date("2030-01-04")];
    expect(await claimAgriTeamCredits("captain", "entry")).toMatchObject({ state: "GRANTED" });
  });
  it("locks an existing workspace before the account even before the team's first registration", async () => {
    registered = false;
    await prelockAgriTeamCharge(tx, "captain", { type: "workflow_run", id: "run-1" });
    const sql = m.db.$queryRaw.mock.calls.map(([parts]) => parts.join("?"));
    expect(sql[0]).toContain("FROM agri_workspaces");
    expect(sql[0]).toContain("FOR UPDATE");
    expect(sql.some(query => query.includes("FROM users"))).toBe(true);
    expect(sql.some(query => query.includes("FROM team_competitions"))).toBe(false);
  });
  it("keeps personal funding fixed when workspace and registration are both absent, despite a later first grant", async () => {
    registered = false; workspaceExists = false;
    const eventFunding = await prelockAgriTeamCharge(tx, "captain", { type: "workflow_run", id: "run-1" });
    expect(eventFunding).toBe("PERSONAL");
    workspaceExists = true; registered = true;
    await claimAgriTeamCredits("captain", "entry");
    m.db.$queryRaw.mockClear();
    m.db.user.findUnique.mockResolvedValue({ id: "captain", quotaPoints: 20, flagged: false, deletedAt: null });
    m.db.user.updateMany.mockResolvedValue({ count: 1 });
    m.db.user.findUniqueOrThrow.mockResolvedValue({ quotaPoints: 19.745679 });
    await expect(debitQuota(tx, { ...charge, eventFunding })).resolves.toBe(19.745679);
    expect(m.db.$queryRaw).not.toHaveBeenCalled();
    expect(wallet!.used).toBe(0);
    expect(m.db.user.updateMany).toHaveBeenCalledOnce();
  });
  it("keeps a registered team closed when its required workspace is missing", async () => {
    workspaceExists = false;
    await expect(prelockAgriTeamCharge(tx, "captain", { type: "workflow_run", id: "run-1" })).rejects.toMatchObject({ code: "AGRI_WORKSPACE_NOT_CONFIGURED" });
  });
  it("allows registration's already-authorized team admin grant but leaves unmanaged events untouched", async () => {
    member.role = "ADMIN";
    expect(await grantAgriRegistrationCredits(tx, "captain", "other-edition", "entry")).toBeNull();
    expect(m.db.$queryRaw).not.toHaveBeenCalled();
    expect(await grantAgriRegistrationCredits(tx, "captain", "edition", "entry")).toMatchObject({ state: "GRANTED" });
  });
});
