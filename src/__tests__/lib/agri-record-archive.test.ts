import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { agriRecordArchiveCommandSchema, agriRecordArchiveReadQuerySchema, canonicalAgriArchiveJSON, type AgriRecordArchiveSnapshot } from "@/contracts/agri-record-archive";
import { createAgriRecordArchive, readAgriRecordArchive } from "@/server/competitions/agrihackathon/record-archive";
import { collectAgriArchiveOnsite } from "@/server/competitions/agrihackathon/archive-onsite";
import { collectAgriRecordSummary } from "@/server/competitions/agrihackathon/record-summary";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent } from "@/server/competitions/agrihackathon/workspace";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
vi.mock("@/server/competitions/agrihackathon/archive-onsite", () => ({ collectAgriArchiveOnsite: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: vi.fn() } }));
vi.mock("@/server/competitions/agrihackathon/record-summary", () => ({ collectAgriRecordSummary: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({ lockAgriWorkspace: vi.fn(), requireAgriScope: vi.fn(), assertAgriAuthorityCurrent: vi.fn() }));
const tx = { $queryRaw: vi.fn(), $executeRaw: vi.fn(), auditLog: { create: vi.fn() } };
const ctx = { actorId: "staff", workspace: { id: "workspace", competitionId: "edition", enabled: true, draftRevision: 1, rulesDraft: null, confirmedRuleVersionId: "rule", publishedRuleVersionId: "rule" } };
const request = { action: "createArchive", submissionId: "submission", selection: { includePrivate: false, includeInternal: false }, idempotencyKey: "ffab9357-b58b-4eb5-8bb1-3ec7d62b94f4" };
const record = { schemaVersion: 1, source: "ANS_AGRI_LIVE_RECORD_SUMMARY", generatedAt: "2026-10-08T00:00:00.000Z", competitionId: "edition", teamCompetitionId: "entry", teamName: "Local", submission: { id: "submission", entryStageId: "stage", stage: "PRELIMINARY", sequence: 1, artifactVersionId: "artifact", artifactVersion: 1, ruleVersionId: "rule", acceptedAt: "2026-10-07T00:00:00.000Z", isCurrent: false, isFrozen: false }, rule: { id: "rule", version: 1, confirmedAt: "2026-10-07T00:00:00.000Z" }, selection: { includePrivate: false, includeInternal: false }, limits: { maxPerCollection: 100, complete: true }, stageHistory: [], technicalChecks: [], demoChecks: [], issues: [], issueEvents: [] } as const;
function stored(selection = { includePrivate: false, includeInternal: false }) {
  const snapshot: AgriRecordArchiveSnapshot = { schemaVersion: 1, source: "ANS_AGRI_SAVED_RECORD_ARCHIVE", includesOnsite: false, archiveId: "archive", sequence: 1, previousArchiveId: null, createdById: "staff", collectedAt: record.generatedAt, record: { ...record, selection, stageHistory: [], technicalChecks: [], demoChecks: [], issues: [], issueEvents: [] } };
  const snapshotCanonical = canonicalAgriArchiveJSON(snapshot);
  return { id: "archive", competitionId: "edition", submissionId: "submission", entryStageId: "stage", artifactVersionId: "artifact", ruleVersionId: "rule", sequence: 1, previousArchiveId: null, createdById: "staff", collectedAt: new Date(record.generatedAt), ...selection, snapshotSchemaVersion: 1, snapshotCanonical, snapshotHash: createHash("sha256").update(snapshotCanonical).digest("hex"), byteLength: Buffer.byteLength(snapshotCanonical) };
}
beforeEach(() => {
  vi.clearAllMocks(); tx.$queryRaw.mockReset(); vi.mocked(db.$transaction).mockReset();
  vi.mocked(db.$transaction).mockImplementation(async run => (run as unknown as (value: typeof tx) => Promise<unknown>)(tx) as never);
  vi.mocked(lockAgriWorkspace).mockResolvedValue(ctx); vi.mocked(requireAgriScope).mockImplementation(async (_tx,_ctx,scope) => ({ id: scope, expiresAt: null } as never));
  vi.mocked(collectAgriRecordSummary).mockResolvedValue(record as never); vi.mocked(collectAgriArchiveOnsite).mockResolvedValue({ items: [], events: [] });
});
describe("immutable private archive service", () => {
  it("accepts explicit save selection and refuses forged publication, download downgrade and unknown flags", () => {
    expect(agriRecordArchiveCommandSchema.parse({ ...request, selection: undefined }).selection).toEqual({ includePrivate: false, includeInternal: false });
    for (const extra of [{ public: true }, { includesOnsite: true }, { actorId: "other" }]) expect(agriRecordArchiveCommandSchema.safeParse({ ...request, ...extra }).success).toBe(false);
    expect(agriRecordArchiveCommandSchema.safeParse({ ...request, selection: { includePrivate: "false" } }).success).toBe(false);
    expect(agriRecordArchiveReadQuerySchema.safeParse({ includePrivate: false }).success).toBe(false);
  });
  it("collects and saves in one supplied transaction, then checks every authority after receipt and audit", async () => {
    tx.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const result = await createAgriRecordArchive("staff", request);
    expect(result).toMatchObject({ sequence: 1, duplicate: false }); expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable", timeout: 20000 });
    expect(collectAgriRecordSummary).toHaveBeenCalledWith(tx, ctx, "submission", request.selection);
    expect(vi.mocked(requireAgriScope).mock.calls.map(call => call[2])).toEqual(["WORKS_READ", "ARCHIVE_WRITE", "ONSITE_READ"]);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2); expect(tx.auditLog.create).toHaveBeenCalledTimes(1); expect(assertAgriAuthorityCurrent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(assertAgriAuthorityCurrent).mock.invocationCallOrder[0]).toBeGreaterThan(tx.auditLog.create.mock.invocationCallOrder[0]);
  });
  it("new snapshots keep fixed onsite facts and operators while legacy reads do not acquire onsite authority", async () => {
    const onsite = { items: [], events: [] };
    vi.mocked(collectAgriArchiveOnsite).mockResolvedValue(onsite);
    tx.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await createAgriRecordArchive("staff", request);
    const insert = tx.$executeRaw.mock.calls[0];
    const canonical = insert.find(value => typeof value === "string" && value.includes("ANS_AGRI_SAVED_RECORD_ARCHIVE")) as string;
    const value = JSON.parse(canonical);
    expect(value).toMatchObject({ schemaVersion: 2, includesOnsite: true, onsite });
    expect(collectAgriArchiveOnsite).toHaveBeenCalledWith(tx, ctx, "submission", request.selection);
    vi.mocked(requireAgriScope).mockClear(); tx.$queryRaw.mockResolvedValueOnce([stored()]);
    await readAgriRecordArchive("staff", "archive");
    expect(vi.mocked(requireAgriScope).mock.calls.map(call => call[2])).toEqual(["WORKS_READ"]);
  });
  it("v2 refuses an onsite payload whose event points outside its fixed item collection", async () => {
    const row = stored(), value = JSON.parse(row.snapshotCanonical);
    Object.assign(value, { schemaVersion: 2, includesOnsite: true, onsite: { items: [], events: [{ id: "event", itemId: "foreign", revision: 1, action: "createOnsite", actorId: "staff", createdAt: record.generatedAt, published: false, fields: { title: "Local", mode: "LIVE", summary: "", backupSummary: "", operations: { device: "", conditions: "", schedule: { state: "UNKNOWN", at: null }, status: "NOT_STARTED", result: null } } }] } });
    row.snapshotSchemaVersion = 2; row.snapshotCanonical = canonicalAgriArchiveJSON(value); row.snapshotHash = createHash("sha256").update(row.snapshotCanonical).digest("hex"); row.byteLength = Buffer.byteLength(row.snapshotCanonical);
    tx.$queryRaw.mockResolvedValueOnce([row]);
    await expect(readAgriRecordArchive("staff", "archive")).rejects.toMatchObject({ code: "AGRI_ARCHIVE_INTEGRITY_FAILED" });
  });
  it("requires stored private and internal permissions as a whole, without reading a live source or silently lowering", async () => {
    tx.$queryRaw.mockResolvedValueOnce([stored({ includePrivate: true, includeInternal: true })]);
    vi.mocked(requireAgriScope).mockImplementation(async (_tx,_ctx,scope) => { if(scope === "INTERNAL_NOTES_READ") throw new AgriWorkspaceError("AGRI_SCOPE_REQUIRED",403); return {id:scope} as never; });
    await expect(readAgriRecordArchive("staff","archive")).rejects.toMatchObject({code:"AGRI_SCOPE_REQUIRED"});
    expect(vi.mocked(requireAgriScope).mock.calls.map(call=>call[2])).toEqual(["WORKS_READ","PRIVATE_MATERIALS_READ","INTERNAL_NOTES_READ"]); expect(collectAgriRecordSummary).not.toHaveBeenCalled();
  });
  it("verifies stored bytes and exact row provenance, including tampering with a recomputed valid hash", async () => {
    const corrupt = stored(); corrupt.snapshotCanonical += " "; corrupt.snapshotHash = createHash("sha256").update(corrupt.snapshotCanonical).digest("hex"); corrupt.byteLength++;
    tx.$queryRaw.mockResolvedValueOnce([corrupt]); await expect(readAgriRecordArchive("staff","archive")).rejects.toMatchObject({code:"AGRI_ARCHIVE_INTEGRITY_FAILED"});
    tx.$queryRaw.mockResolvedValueOnce([{...stored(),ruleVersionId:"different-rule"}]); await expect(readAgriRecordArchive("staff","archive")).rejects.toMatchObject({code:"AGRI_ARCHIVE_INTEGRITY_FAILED"});
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it("downloads only with independent EXPORT and audits provenance after verifying stored integrity", async () => {
    tx.$queryRaw.mockResolvedValueOnce([stored()]); const value = await readAgriRecordArchive("staff","archive",{mode:"exportJSON"});
    expect(value.snapshot.source).toBe("ANS_AGRI_SAVED_RECORD_ARCHIVE"); expect(value.snapshot.includesOnsite).toBe(false);
    expect(vi.mocked(requireAgriScope).mock.calls.map(call=>call[2])).toEqual(["WORKS_READ","EXPORT"]); expect(tx.auditLog.create).toHaveBeenCalledTimes(1); expect(assertAgriAuthorityCurrent).toHaveBeenCalledTimes(1);
  });
  it("replay verifies hash and current permissions without collecting, inserting or auditing another version", async () => {
    const hash=createHash("sha256").update(canonicalAgriArchiveJSON(request)).digest("hex");
    tx.$queryRaw.mockResolvedValueOnce([{requestHash:hash,archiveId:"archive"}]).mockResolvedValueOnce([stored()]);
    expect(await createAgriRecordArchive("staff",request)).toMatchObject({archiveId:"archive",sequence:1,duplicate:true});
    expect(tx.$executeRaw).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled(); expect(collectAgriRecordSummary).not.toHaveBeenCalled(); expect(assertAgriAuthorityCurrent).toHaveBeenCalledTimes(1);
  });
  it("retries only precise stale-sequence/serialization conflicts, never unrelated database errors", async () => {
    const conflict=new Prisma.PrismaClientKnownRequestError("conflict",{clientVersion:"6.19.3",code:"P2010",meta:{code:"23505",message:'Key ("submissionId", sequence) already exists'}});
    vi.mocked(db.$transaction).mockRejectedValueOnce(conflict as never); tx.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect((await createAgriRecordArchive("staff",request)).duplicate).toBe(false); expect(db.$transaction).toHaveBeenCalledTimes(2);
    vi.mocked(db.$transaction).mockClear().mockRejectedValueOnce(new Error("unrelated")); await expect(createAgriRecordArchive("staff",request)).rejects.toThrow("unrelated"); expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
