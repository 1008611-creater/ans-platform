import { describe, expect, it } from "vitest";
import { agriTaskEditableSchema, agriTaskViewSchema, agriTaskCommandSchema, agriTaskMutationSchema } from "@/contracts/agri-tasks";
import { agriTaskTemplates } from "@/domain/competitions/agri-task-templates";
const task = agriTaskTemplates("zh")[0].task;
describe("personal timetable contracts", () => {
  it("exposes its persisted owner while rejecting owner metadata in editable requests", () => {
    const view = { ...task, id: "t", ownerId: "real-owner", competitionId: "c", revision: 1, templateKey: null, access: "OWNER", dueState: "UNDATED", completedAt: null, createdAt: "2026-10-07T00:00:00Z", updatedAt: "2026-10-07T00:00:00Z" };
    expect(agriTaskViewSchema.safeParse(view).success).toBe(true);
    expect(agriTaskViewSchema.safeParse({ ...view, ownerId: "" }).success).toBe(false);
    expect(agriTaskViewSchema.safeParse({ ...view, status: "DONE" }).success).toBe(false);
  });
  it("requires actual results for completion and input for blocking", () => {
    expect(agriTaskEditableSchema.safeParse({ ...task, status: "DONE", completionResult: "Accepted deliverable" }).success).toBe(true);
    expect(agriTaskEditableSchema.safeParse({ ...task, status: "BLOCKED" }).success).toBe(false);
    expect(agriTaskEditableSchema.safeParse({ ...task, completionResult: "unearned" }).success).toBe(false);
    const input = { from: "organizer", needed: "window", latestAt: { state: "UNKNOWN", at: null } };
    expect(agriTaskEditableSchema.safeParse({ ...task, status: "IN_PROGRESS", inputRequirements: { schemaVersion: 1, items: [input] } }).success).toBe(true);
    expect(agriTaskEditableSchema.safeParse({ ...task, status: "DONE", completionResult: "x", blockingInput: input }).success).toBe(false);
  });
  it("rejects invalid dates, unversioned inputs, oversized lists and forged completion metadata", () => {
    for (const patch of [{ due: { state: "CONFIRMED", at: null } }, { due: { state: "UNKNOWN", at: "2026-10-07T00:00:00Z" } }, { due: { state: "CONFIRMED", at: "2026-02-30T00:00:00Z" } }, { inputRequirements: { schemaVersion: 2, items: [] } }, { completedById: "another" }]) expect(agriTaskEditableSchema.safeParse({ ...task, ...patch }).success).toBe(false);
  });
  it("uses stable bilingual template keys, never pre-completes or invents dates", () => {
    const zh = agriTaskTemplates("zh"), en = agriTaskTemplates("en");
    expect(zh).toHaveLength(6); expect(new Set(zh.map(t => t.templateKey)).size).toBe(6);
    expect(zh.map(t => t.templateKey)).toEqual(en.map(t => t.templateKey));
    for (const template of [...zh, ...en]) { expect(agriTaskEditableSchema.safeParse(template.task).success).toBe(true); expect(template.task.status).toBe("NOT_STARTED"); expect(template.task.due).toEqual({ state: "UNKNOWN", at: null }); }
  });
  it("requires UUID receipt keys, expected revisions and strict action payloads", () => {
    const command = { action: "update", taskId: "t", expectedRevision: 1, idempotencyKey: "e03c848d-6ccb-4650-8aac-3b6e58694a87", task };
    expect(agriTaskCommandSchema.safeParse(command).success).toBe(true);
    for (const patch of [{ expectedRevision: 0 }, { ownerId: "x" }, { idempotencyKey: "not-a-uuid" }]) expect(agriTaskCommandSchema.safeParse({ ...command, ...patch }).success).toBe(false);
  });
  it("accepts only coherent owner mutation receipts and real initialization counts", () => {
    const view = { ...task, id: "t", ownerId: "real-owner", competitionId: "c", revision: 3, templateKey: null, access: "OWNER", dueState: "UNDATED", completedAt: null, createdAt: "2026-10-07T00:00:00Z", updatedAt: "2026-10-07T00:00:00Z" };
    const replay = { task: view, duplicate: true, appliedRevision: 2, createdTaskCount: null };
    expect(agriTaskMutationSchema.safeParse(replay).success).toBe(true);
    expect(agriTaskMutationSchema.safeParse({ task: null, duplicate: true, appliedRevision: null, createdTaskCount: 0 }).success).toBe(true);
    for (const invalid of [null, {}, { ...replay, task: {} }, { ...replay, appliedRevision: 4 }, { ...replay, duplicate: "true" }, { ...replay, task: { ...view, access: "SHARED_READONLY" } }, { ...replay, ownerId: "spoof" }, { task: null, duplicate: false, appliedRevision: null, createdTaskCount: -1 }, { task: null, duplicate: false, appliedRevision: 1, createdTaskCount: 0 }, { ...replay, createdTaskCount: 0 }]) {
      expect(agriTaskMutationSchema.safeParse(invalid).success).toBe(false);
    }
  });

});
