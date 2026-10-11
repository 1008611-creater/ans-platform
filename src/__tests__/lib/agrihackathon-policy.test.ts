import { describe, expect, it } from "vitest";
import { agriSubmissionWindowSchema, agriTaskDataSchema } from "@/contracts/agrihackathon";
import { deriveAgriTaskDueState, getAgriWindowState, hasAgriWorkspaceScope } from "@/domain/competitions/agrihackathon";

const now = new Date("2026-10-07T12:00:00+08:00");
const grant = { competitionId: "edition1", userId: "user1", scopes: ["WORKS_READ"], revokedAt: null, expiresAt: null };
const actor = { id: "user1", active: true };
const window = {
  stage: "PRELIMINARY", state: "CONFIRMED", opensAt: "2026-10-07T11:00:00+08:00",
  closesAt: "2026-10-07T12:00:00+08:00", includesDeadline: false,
  confirmedById: "lead1", confirmedAt: "2026-10-06T12:00:00+08:00",
};
const task = {
  competitionId: "edition1", ownerId: "user1", title: "检查提交材料", status: "NOT_STARTED",
  stage: "PRELIMINARY", priority: "NORMAL", due: { state: "UNKNOWN", at: null },
  acceptanceCriteria: "检查结果关联指定提交版本", collaborators: [], blockingInput: null, completion: null,
};

describe("candidate agrihackathon scoped access", () => {
  it("grants only explicitly assigned scope for the exact account and edition", () => {
    expect(hasAgriWorkspaceScope([grant], "edition1", actor, "WORKS_READ", now)).toBe(true);
    expect(hasAgriWorkspaceScope([grant], "edition2", actor, "WORKS_READ", now)).toBe(false);
    expect(hasAgriWorkspaceScope([grant], "edition1", { ...actor, id: "user2" }, "WORKS_READ", now)).toBe(false);
    expect(hasAgriWorkspaceScope([grant], "edition1", actor, "INTERNAL_NOTES_READ", now)).toBe(false);
    expect(hasAgriWorkspaceScope([], "edition1", actor, "WORKS_READ", now)).toBe(false);
  });
  it.each([
    { revokedAt: "2026-10-06T00:00:00Z" },
    { expiresAt: "2026-10-07T04:00:00Z" },
    { expiresAt: "2026-10-07T03:59:59Z" },
    { expiresAt: "bad-date" },
    { scopes: ["ADMIN"] },
  ])("rejects revoked, expired or malformed grants: %s", patch => {
    expect(hasAgriWorkspaceScope([{ ...grant, ...patch }], "edition1", actor, "WORKS_READ", now)).toBe(false);
  });
  it("refuses inactive accounts and invalid clocks", () => {
    expect(hasAgriWorkspaceScope([grant], "edition1", { ...actor, active: false }, "WORKS_READ", now)).toBe(false);
    expect(hasAgriWorkspaceScope([grant], "edition1", actor, "WORKS_READ", new Date(NaN))).toBe(false);
  });
});

describe("candidate agrihackathon submission windows", () => {
  it("keeps tentative or missing rules closed regardless of historical dates", () => {
    expect(getAgriWindowState({ state: "PENDING", stage: "PRELIMINARY", opensAt: null, closesAt: null }, now)).toBe("RULES_PENDING");
    expect(getAgriWindowState({ state: "PENDING", stage: "FINAL", opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-02T00:00:00Z" }, now)).toBe("RULES_PENDING");
  });
  it("requires a confirmed explicit deadline policy and valid timezone-bearing dates", () => {
    const { includesDeadline: _policy, ...missingPolicy } = window;
    expect(agriSubmissionWindowSchema.safeParse(missingPolicy).success).toBe(false);
    expect(getAgriWindowState({ ...window, closesAt: "2026-10-07T12:00:00" }, now)).toBe("INVALID");
    expect(getAgriWindowState({ ...window, closesAt: "2026-10-07T10:00:00+08:00" }, now)).toBe("INVALID");
    expect(getAgriWindowState(window, new Date(NaN))).toBe("INVALID");
  });
  it("covers before opening, opening, before deadline, exact deadline and after", () => {
    expect(getAgriWindowState(window, new Date("2026-10-07T10:59:59+08:00"))).toBe("NOT_OPEN");
    expect(getAgriWindowState(window, new Date(window.opensAt))).toBe("OPEN");
    expect(getAgriWindowState(window, new Date("2026-10-07T11:59:59.999+08:00"))).toBe("OPEN");
    expect(getAgriWindowState(window, now)).toBe("CLOSED");
    expect(getAgriWindowState({ ...window, includesDeadline: true }, now)).toBe("OPEN");
    expect(getAgriWindowState({ ...window, includesDeadline: true }, new Date(now.getTime() + 1))).toBe("CLOSED");
  });
  it("treats UTC and Beijing timestamps as the same instant", () => {
    expect(getAgriWindowState({ ...window, includesDeadline: true }, new Date("2026-10-07T04:00:00Z"))).toBe("OPEN");
  });
});

describe("candidate personal timetable data", () => {
  it("requires an actual acceptance result before marking a task done", () => {
    expect(agriTaskDataSchema.safeParse(task).success).toBe(true);
    expect(agriTaskDataSchema.safeParse({ ...task, status: "DONE" }).success).toBe(false);
    expect(agriTaskDataSchema.safeParse({ ...task, status: "DONE", completion: { result: "已核对并记录对应版本的检查结果", recordedById: "user1", recordedAt: now.toISOString() } }).success).toBe(true);
  });
  it("records missing input for blocked work; completion cannot be attached to unfinished status", () => {
    expect(agriTaskDataSchema.safeParse({ ...task, status: "BLOCKED" }).success).toBe(false);
    expect(agriTaskDataSchema.safeParse({ ...task, status: "BLOCKED", blockingInput: { from: "赛事负责人", needed: "确认必交材料", latestAt: { state: "UNKNOWN", at: null } } }).success).toBe(true);
    expect(agriTaskDataSchema.safeParse({ ...task, completion: { result: "done", recordedById: "user1", recordedAt: now.toISOString() } }).success).toBe(false);
  });
  it("does not mark unknown or tentative dates overdue, or infer completion from passing time", () => {
    expect(deriveAgriTaskDueState({ state: "UNKNOWN", at: null }, "NOT_STARTED", now)).toBe("UNDATED");
    expect(deriveAgriTaskDueState({ state: "TENTATIVE", at: "2026-10-01T00:00:00Z" }, "BLOCKED", now)).toBe("TENTATIVE");
    expect(deriveAgriTaskDueState({ state: "CONFIRMED", at: "2026-10-01T00:00:00Z" }, "IN_PROGRESS", now)).toBe("OVERDUE");
    expect(deriveAgriTaskDueState({ state: "CONFIRMED", at: "2026-10-08T00:00:00Z" }, "IN_PROGRESS", now)).toBe("SCHEDULED");
    expect(deriveAgriTaskDueState({ state: "UNKNOWN", at: null }, "DONE", now)).toBe("DONE");
  });
});
