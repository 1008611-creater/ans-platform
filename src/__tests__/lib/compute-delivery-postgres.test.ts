// @vitest-environment node
// Opt-in only: this suite writes synthetic fixtures to an explicitly disposable
// local PostgreSQL database. It never calls models or accepts a production URL.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { computeDeliveryArtifactSchema, computeDeliveryMutationSchema, computeDeliveryReadSchema, type ComputeDeliveryCommand } from "@/contracts/compute-delivery";
import type { DbTransaction } from "@/lib/db";
vi.unmock("@/lib/db");
const databaseUrl = process.env.ANS_DELIVERY_TEST_DATABASE_URL;
let safe = false;
try {
  const url = new URL(databaseUrl ?? "");
  safe = url.protocol === "postgresql:" && url.hostname === "127.0.0.1" && url.pathname === "/delivery_fixture"
    && url.username === "delivery_fixture" && process.env.ANS_DELIVERY_TEST_ALLOW_DISPOSABLE_WRITE === "yes";
} catch { /* Default test runs must not open any database. */ }
let db: typeof import("@/lib/db")["db"];
let service: typeof import("@/server/compute/delivery-service");
let compute: typeof import("@/server/compute/service");
const artifact = { relativePath: "assets/generated/output.png", sha256: "a".repeat(64), mimeType: "image/png" as const, sizeBytes: 1024 };
type Fixture = { userId: string; taskId: string; revision: number };
async function fixture(unit: "image" | "second" | "token" = "image", start = true): Promise<Fixture> {
  const userId = "delivery-test-" + randomUUID();
  await db.user.create({ data: { id: userId, email: userId + "@fixture.invalid", username: userId, quotaPoints: 1000 } });
  const reserved = await compute.executeComputeCommand({ action: "reserve", userId, modelId: unit, maxUnits: 1, idempotencyKey: "reserve-" + randomUUID() });
  if (!("taskId" in reserved)) throw new Error("Expected compute reservation");
  if (!start) return { userId, taskId: reserved.taskId, revision: reserved.revision };
  const started = await compute.executeComputeCommand({ action: "start", userId, taskId: reserved.taskId, eventId: "start-" + randomUUID(), expectedRevision: reserved.revision });
  if (!("taskId" in started)) throw new Error("Expected compute start");
  return { userId, taskId: started.taskId, revision: started.revision };
}
function command(item: Fixture, action: ComputeDeliveryCommand["action"], expectedDeliveryRevision = 0): ComputeDeliveryCommand {
  const fields = { version: 1 as const, userId: item.userId, computeTaskId: item.taskId,
    deliveryId: service.computeDeliveryId(item.userId, item.taskId), eventId: "event-" + randomUUID(), expectedDeliveryRevision };
  return action === "available" ? { ...fields, action, artifact } : action === "failed" || action === "unavailable"
    ? { ...fields, action, failureCode: "WORKSPACE_WRITE_FAILED" } : { ...fields, action };
}
async function settle(item: Fixture, outcome = "succeeded") {
  const result = await compute.executeComputeCommand({ action: "settle", userId: item.userId, taskId: item.taskId,
    eventId: "settle-" + randomUUID(), expectedRevision: item.revision, units: 1, outcome, evidenceRef: "fixture-usage-" + randomUUID() });
  if (!("taskId" in result)) throw new Error("Expected compute settlement"); item.revision = result.revision;
}
async function accounting(item: Fixture) {
  // Compare persisted values, including Decimal amounts and timestamps, without ORM instance prototypes.
  return JSON.stringify({ user: await db.user.findUnique({ where: { id: item.userId }, select: { quotaPoints: true } }),
    task: await db.computeTask.findUnique({ where: { id: item.taskId } }),
    ledger: await db.quotaLedger.findMany({ where: { userId: item.userId }, orderBy: { id: "asc" } }),
    events: await db.computeTaskEvent.findMany({ where: { taskId: item.taskId }, orderBy: { id: "asc" } }) });
}
describe.skipIf(!safe)("delivery service against disposable PostgreSQL", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!); vi.stubEnv("DIRECT_URL", databaseUrl!);
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_ENABLED", "1");
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_POLICY", JSON.stringify({ version: "delivery-fixture-v1", concurrentMax: 20, models: {
      image: { unit: "image", ratePoints: 10, rateUnits: 1, maxUnits: 10 },
      second: { unit: "second", ratePoints: 2, rateUnits: 1, maxUnits: 60 },
      token: { unit: "token", ratePoints: 1, rateUnits: 1, maxUnits: 10 },
    } }));
    ({ db } = await import("@/lib/db")); service = await import("@/server/compute/delivery-service"); compute = await import("@/server/compute/service");
    const [row] = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (row.name !== "delivery_fixture") throw new Error("Disposable database guard failed");
  });
  afterAll(async () => { if (db) await db.$disconnect(); vi.unstubAllEnvs(); });
  it("keeps settlement and delivery separate, reads an honest null before receipts and writes no accounting side effects", async () => {
    const item = await fixture(); expect(await service.readComputeDelivery(item.userId, item.taskId)).toEqual({ computeTaskId: item.taskId, delivery: null });
    await settle(item); const before = await accounting(item);
    const pending = await service.executeComputeDeliveryCommand(command(item, "pending"));
    expect(pending.delivery).toMatchObject({ state: "PENDING", revision: 1, artifact: null, availableAt: null });
    const available = await service.executeComputeDeliveryCommand(command(item, "available", 1));
    expect(available.delivery).toMatchObject({ state: "AVAILABLE", revision: 2, artifact });
    expect(computeDeliveryMutationSchema.safeParse(available).success).toBe(true);
    const read = await service.readComputeDelivery(item.userId, item.taskId);
    expect(computeDeliveryReadSchema.safeParse(read).success).toBe(true);
    expect(read.delivery?.artifact).toEqual(artifact); expect(JSON.stringify(read)).not.toMatch(/https?:|directory|\/internal/);
    expect(await accounting(item)).toEqual(before);
  });
  it("recovers FAILED through PENDING and never reuses the accounting CAS", async () => {
    const item = await fixture(); await service.executeComputeDeliveryCommand(command(item, "pending"));
    const failed = await service.executeComputeDeliveryCommand(command(item, "failed", 1));
    expect(failed.delivery).toMatchObject({ state: "FAILED", revision: 2, failureCode: "WORKSPACE_WRITE_FAILED", artifact: null });
    await settle(item); const before = await accounting(item);
    await service.executeComputeDeliveryCommand(command(item, "pending", 2));
    const restored = await service.executeComputeDeliveryCommand(command(item, "available", 3));
    expect(restored.delivery).toMatchObject({ state: "AVAILABLE", revision: 4, failureCode: null }); expect(await accounting(item)).toEqual(before);
  });
  it("returns old event appliedRevision plus current state after a lost response without a second event", async () => {
    const item = await fixture(); await settle(item); const first = command(item, "pending");
    await service.executeComputeDeliveryCommand(first); await service.executeComputeDeliveryCommand(command(item, "available", 1));
    const repeated = await service.executeComputeDeliveryCommand(first);
    expect(repeated).toMatchObject({ duplicate: true, appliedRevision: 1, delivery: { state: "AVAILABLE", revision: 2 } });
    expect(await db.computeDeliveryEvent.count({ where: { deliveryId: first.deliveryId } })).toBe(2);
    await expect(service.executeComputeDeliveryCommand({ ...first, expectedDeliveryRevision: 2 })).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_EVENT_CONFLICT" });
  });
  it("serializes concurrent identical creation and rejects a conflicting concurrent action", async () => {
    const item = await fixture(); const first = command(item, "pending");
    const replies = await Promise.all([service.executeComputeDeliveryCommand(first), service.executeComputeDeliveryCommand(first)]);
    expect(replies.map(result => result.duplicate).sort()).toEqual([false, true]);
    await settle(item);
    const results = await Promise.allSettled([service.executeComputeDeliveryCommand(command(item, "available", 1)), service.executeComputeDeliveryCommand(command(item, "failed", 1))]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected");
    expect(rejected?.status === "rejected" ? rejected.reason.code : "").toBe("COMPUTE_DELIVERY_REVISION_CONFLICT");
    expect(await db.computeDeliveryEvent.count({ where: { deliveryId: first.deliveryId } })).toBe(2);
  });
  it.each(["RUNNING", "UNCERTAIN", "failed", "RELEASED"])("refuses AVAILABLE without successful settlement: %s", async state => {
    const item = await fixture(); await service.executeComputeDeliveryCommand(command(item, "pending"));
    if (state === "UNCERTAIN") await compute.executeComputeCommand({ action: "uncertain", userId: item.userId, taskId: item.taskId, eventId: "uncertain-" + randomUUID(), expectedRevision: item.revision });
    if (state === "failed") await settle(item, "failed");
    if (state === "RELEASED") await compute.executeComputeCommand({ action: "release", userId: item.userId, taskId: item.taskId, eventId: "release-" + randomUUID(), expectedRevision: item.revision, evidence: "confirmed_no_usage", evidenceRef: "fixture-no-usage-" + randomUUID() });
    const before = await accounting(item);
    await expect(service.executeComputeDeliveryCommand(command(item, "available", 1))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_SETTLEMENT_REQUIRED" });
    expect((await service.readComputeDelivery(item.userId, item.taskId)).delivery?.revision).toBe(1); expect(await accounting(item)).toEqual(before);
  });
  it("rejects authorization-only and token tasks without creating receipts", async () => {
    const authorized = await fixture("image", false);
    await expect(service.executeComputeDeliveryCommand(command(authorized, "pending"))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_TASK_NOT_STARTED" });
    const token = await fixture("token");
    await expect(service.executeComputeDeliveryCommand(command(token, "pending"))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_MEDIA_TASK_REQUIRED" });
    expect(await db.computeDelivery.count({ where: { computeTaskId: { in: [authorized.taskId, token.taskId] } } })).toBe(0);
  });
  it("binds owner, provider and task and exposes no existence to strangers or administrators", async () => {
    const item = await fixture(); const other = await fixture(); await service.executeComputeDeliveryCommand(command(item, "pending"));
    const forged = command(item, "pending");
    await expect(service.executeComputeDeliveryCommand({ ...forged, userId: other.userId })).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_BINDING_CONFLICT" });
    await expect(service.executeComputeDeliveryCommand({ ...forged, userId: other.userId, deliveryId: service.computeDeliveryId(other.userId, item.taskId) })).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_NOT_FOUND" });
    await db.user.update({ where: { id: other.userId }, data: { role: "ADMIN" } });
    for (const id of [item.taskId, "missing-task-id"]) await expect(service.readComputeDelivery(other.userId, id)).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_NOT_FOUND", status: 404 });
  });
  it("allows reconciliation on flagged/deleted owners but does not allow deleted owner reads", async () => {
    const item = await fixture(); await service.executeComputeDeliveryCommand(command(item, "pending")); await settle(item);
    await db.user.update({ where: { id: item.userId }, data: { flagged: true } });
    await service.executeComputeDeliveryCommand(command(item, "available", 1));
    expect((await service.readComputeDelivery(item.userId, item.taskId)).delivery?.state).toBe("AVAILABLE");
    await db.user.update({ where: { id: item.userId }, data: { deletedAt: new Date() } });
    const before = await accounting(item);
    await service.executeComputeDeliveryCommand(command(item, "unavailable", 2));
    await expect(service.readComputeDelivery(item.userId, item.taskId)).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_NOT_FOUND" }); expect(await accounting(item)).toEqual(before);
  });
  it("restores only the exact artifact and preserves the original availableAt", async () => {
    const item = await fixture(); await settle(item); await service.executeComputeDeliveryCommand(command(item, "pending"));
    const initial = await service.executeComputeDeliveryCommand(command(item, "available", 1));
    await service.executeComputeDeliveryCommand(command(item, "unavailable", 2));
    for (const change of [{ sha256: "b".repeat(64) }, { relativePath: "assets/other.png" }, { sizeBytes: 2048 }, { mimeType: "image/jpeg" }]) {
      const restore = command(item, "available", 3);
      if (restore.action !== "available") throw new Error("Expected available");
      await expect(service.executeComputeDeliveryCommand({ ...restore, artifact: { ...artifact, ...change } })).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_ARTIFACT_IMMUTABLE" });
    }
    const restored = await service.executeComputeDeliveryCommand(command(item, "available", 3));
    expect(restored.delivery.availableAt).toBe(initial.delivery.availableAt); expect(restored.delivery.revision).toBe(4);
    await expect(service.executeComputeDeliveryCommand(command(item, "failed", 4))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_STATE_CONFLICT" });
  });
  it("accepts video metadata only on seconds-based tasks, including partial outcome", async () => {
    const item = await fixture("second"); await settle(item, "partial"); await service.executeComputeDeliveryCommand(command(item, "pending"));
    await expect(service.executeComputeDeliveryCommand(command(item, "available", 1))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_MEDIA_TYPE_CONFLICT" });
    const request = command(item, "available", 1);
    if (request.action !== "available") throw new Error("Expected available");
    expect((await service.executeComputeDeliveryCommand({ ...request, artifact: { ...artifact, relativePath: "assets/output.mp4", mimeType: "video/mp4" } })).delivery.state).toBe("AVAILABLE");
  });
  it("rejects stale revision and first-event AVAILABLE instead of silently filling history", async () => {
    const item = await fixture(); await settle(item);
    await expect(service.executeComputeDeliveryCommand(command(item, "available"))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_INITIAL_STATE" });
    await service.executeComputeDeliveryCommand(command(item, "pending"));
    await expect(service.executeComputeDeliveryCommand(command(item, "available", 0))).rejects.toMatchObject({ code: "COMPUTE_DELIVERY_REVISION_CONFLICT" });
  });
  it("enforces the same path/schema checks in PostgreSQL, not just the service", async () => {
    for (const path of ["../file", "/file", "C:/file", "assets\\file", "assets//file", "assets/CON.png", "assets/file.", "assets/file\u007f", "https://bad.test/file"]) {
      const payload = JSON.stringify({ ...artifact, relativePath: path });
      const [result] = await db.$queryRaw<Array<{ valid: boolean }>>`SELECT ans_compute_delivery_artifact_valid(${payload}::jsonb) AS valid`;
      expect(result.valid, path).toBe(false); expect(computeDeliveryArtifactSchema.safeParse(JSON.parse(payload)).success).toBe(false);
    }
    const payload = JSON.stringify(artifact);
    expect((await db.$queryRaw<Array<{ valid: boolean }>>`SELECT ans_compute_delivery_artifact_valid(${payload}::jsonb) AS valid`)[0].valid).toBe(true);
  });
  it.each(["missing", "null"])("fails closed on %s price unit independently of the existing quote CHECK", async kind => {
    const item = await fixture(); const before = await accounting(item);
    const price = { ratePoints: 10, rateUnits: 1, maxUnits: 10, ...(kind === "null" ? { unit: null } : {}) };
    // Temporarily weaken only this disposable fixture database inside a rollback-only
    // transaction to prove delivery's own trigger is authoritative, not the old CHECK.
    await expect(db.$transaction(async (tx: DbTransaction) => {
      await tx.$executeRawUnsafe('ALTER TABLE compute_tasks DROP CONSTRAINT compute_task_quote_valid');
      await tx.$executeRawUnsafe('ALTER TABLE compute_tasks DISABLE TRIGGER compute_task_update_guard');
      await tx.computeTask.update({ where: { id: item.taskId }, data: { price } });
      await tx.computeDelivery.create({ data: { id: service.computeDeliveryId(item.userId, item.taskId), computeTaskId: item.taskId, userId: item.userId, provider: "toonflow" } });
    })).rejects.toThrow("COMPUTE_DELIVERY_TASK_REQUIRED");
    expect(await accounting(item)).toEqual(before);
    const [guards] = await db.$queryRaw<Array<{ present: boolean }>>
      `SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='compute_tasks'::regclass AND conname='compute_task_quote_valid') AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='compute_tasks'::regclass AND tgname='compute_task_update_guard' AND tgenabled='O') AS present`;
    expect(guards.present).toBe(true);
  });
  it("fails closed on a NULL settlement outcome independently of the existing state CHECK", async () => {
    const item = await fixture(); await settle(item); await service.executeComputeDeliveryCommand(command(item, "pending"));
    const before = await accounting(item);
    await expect(db.$transaction(async (tx: DbTransaction) => {
      await tx.$executeRawUnsafe('ALTER TABLE compute_tasks DROP CONSTRAINT compute_task_state_valid');
      await tx.$executeRawUnsafe('ALTER TABLE compute_tasks DISABLE TRIGGER compute_task_update_guard');
      await tx.computeTask.update({ where: { id: item.taskId }, data: { outcome: null } });
      await tx.computeDelivery.update({ where: { computeTaskId: item.taskId }, data: { state: "AVAILABLE", revision: 2, artifact, availableAt: new Date() } });
    })).rejects.toThrow("COMPUTE_DELIVERY_SETTLEMENT_REQUIRED");
    expect(await accounting(item)).toEqual(before);
    expect((await service.readComputeDelivery(item.userId, item.taskId)).delivery?.revision).toBe(1);
    const [guards] = await db.$queryRaw<Array<{ present: boolean }>>
      `SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='compute_tasks'::regclass AND conname='compute_task_state_valid') AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='compute_tasks'::regclass AND tgname='compute_task_update_guard' AND tgenabled='O') AS present`;
    expect(guards.present).toBe(true);
  });
  it("database guards reject direct binding/metadata changes, missing events and event deletion", async () => {
    const item = await fixture(); const other = await fixture(); await settle(item);
    const first = await service.executeComputeDeliveryCommand(command(item, "pending"));
    const before = await accounting(item);
    await expect(db.computeDelivery.update({ where: { id: first.delivery.deliveryId }, data: { state: "FAILED", revision: 2, failureCode: "WORKSPACE_WRITE_FAILED" } })).rejects.toBeDefined();
    expect((await service.readComputeDelivery(item.userId, item.taskId)).delivery?.revision).toBe(1);
    await service.executeComputeDeliveryCommand(command(item, "available", 1));
    const attempts = [
      { computeTaskId: other.taskId, userId: other.userId, revision: 3, state: "UNAVAILABLE" as const, failureCode: "ARTIFACT_MISSING" },
      { provider: "other", revision: 3, state: "UNAVAILABLE" as const, failureCode: "ARTIFACT_MISSING" },
      { revision: 3, state: "UNAVAILABLE" as const, failureCode: "ARTIFACT_MISSING", artifact: { ...artifact, sha256: "c".repeat(64) } },
    ];
    for (const data of attempts) await expect(db.computeDelivery.update({ where: { id: first.delivery.deliveryId }, data })).rejects.toBeDefined();
    await expect(db.computeDeliveryEvent.deleteMany({ where: { deliveryId: first.delivery.deliveryId } })).rejects.toBeDefined();
    await expect(db.computeDelivery.delete({ where: { id: first.delivery.deliveryId } })).rejects.toBeDefined();
    expect(await accounting(item)).toEqual(before);
    const receipt = await service.readComputeDelivery(item.userId, item.taskId); expect(receipt.delivery?.state).toBe("AVAILABLE"); expect(receipt.delivery?.artifact).toEqual(artifact);
  });
  it("rolls back receipt state when event persistence fails", async () => {
    const item = await fixture(); await service.executeComputeDeliveryCommand(command(item, "pending")); await settle(item);
    const deliveryId = service.computeDeliveryId(item.userId, item.taskId);
    await expect(db.$transaction(async (tx: DbTransaction) => {
      await tx.computeDelivery.update({ where: { id: deliveryId }, data: { revision: 2, state: "AVAILABLE", artifact, availableAt: new Date() } });
      await tx.computeDeliveryEvent.create({ data: { deliveryId, eventId: "bad-event-id", requestHash: "invalid", revision: 2, action: "available" } });
    })).rejects.toBeDefined();
    expect((await service.readComputeDelivery(item.userId, item.taskId)).delivery).toMatchObject({ state: "PENDING", revision: 1, artifact: null });
  });
});
