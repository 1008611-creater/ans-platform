import { agriOfficialMemberIdsSchema } from "@/contracts/agri-submissions";
import { describe, expect, it } from "vitest";
import {
  agriCheckFeedbackCommandSchema,
  agriCorrectionPermitSnapshotSchema,
  agriMaterialUrlSchema,
  agriRepositoryRefSchema,
  agriStageSubmissionCommandSchema,
  agriSubmissionRequirementsSchema,
  agriTechnicalCheckCommandSchema,
} from "@/contracts/agri-submissions";
import {
  getAgriCorrectionDecision,
  getAgriSubmissionLifecycleDecision,
  getAgriSubmissionMaterialIssues,
  projectAgriTeamCheckFeedback,
} from "@/domain/competitions/agri-submissions";

const key = "3fc3f069-eaaa-49ba-ac0d-a898f4062a59";
const now = new Date("2026-10-07T04:00:00Z");
const content = {
  projectId: "project-a", artifactVersionId: "artifact-v1",
  repository: { url: "https://github.com/example/repo", ref: { kind: "COMMIT_SHA", value: "a".repeat(40) } },
  demoUrl: "https://demo.example.invalid/", summary: "Project introduction",
  materials: { schemaVersion: 1, items: [{ key: "brief", kind: "TEXT", text: "Brief" }] },
};
const submit = { action: "submit", idempotencyKey: key, entryStageId: "entry-preliminary",
  expectedRevision: 2, expectedRuleVersionId: "rules-1", content };
const window = { stage: "PRELIMINARY", state: "CONFIRMED", opensAt: "2026-10-07T03:00:00Z",
  closesAt: "2026-10-07T04:00:00Z", includesDeadline: true, confirmedById: "lead", confirmedAt: "2026-10-06T04:00:00Z" };
const snapshot = { competitionId: "edition-a", workspaceEnabled: true,
  entry: { id: "entry-preliminary", competitionId: "edition-a", stage: "PRELIMINARY", revision: 2, frozenSubmissionId: null },
  publishedRuleVersionId: "rules-1", rule: { id: "rules-1", competitionId: "edition-a", window },
  finalEligibility: { state: "UNKNOWN" } };
const permit = { id: "permit-1", competitionId: "edition-a", entryStageId: "entry-preliminary", previousSubmissionId: "submission-1",
  allowedFields: ["summary"], reason: "Correct description", authorizedById: "lead",
  authorizedAt: "2026-10-07T03:59:00Z", expiresAt: "2026-10-07T05:00:00Z", revokedAt: null, usedBySubmissionId: null };
const target = { competitionId: "edition-a", entryStageId: "entry-preliminary", previousSubmissionId: "submission-1", permitId: "permit-1" };
const revised = { ...content, summary: "Corrected description" };
const check = { action: "recordCheck", idempotencyKey: key, submissionId: "submission-1", result: "PASS",
  checklist: { schemaVersion: 1, items: [{ key: "repository", result: "PASS", note: "Manually inspected" }] }, internalNote: null };
const event = { id: "feedback-1", competitionId: "edition-a", checkId: "check-1", sequence: 1,
  actorId: "reviewer", createdAt: now.toISOString(), action: "PUBLISH", body: "Please add a backup Demo" };

describe("candidate stage write commands", () => {
  it("allows an incomplete draft, but requires a selected artifact and summary for formal submission", () => {
    const draft = { ...content, artifactVersionId: null, summary: "" };
    expect(agriStageSubmissionCommandSchema.safeParse({ action: "saveDraft", idempotencyKey: key,
      entryStageId: submit.entryStageId, expectedRevision: 2, draft }).success).toBe(true);
    expect(agriStageSubmissionCommandSchema.safeParse(submit).success).toBe(true);
    expect(agriStageSubmissionCommandSchema.safeParse({ ...submit, content: draft }).success).toBe(false);
  });
  it.each(["submittedById", "submittedAt", "competitionId", "confirmedById", "role", "publicConsent", "entryStatus", "xp"])(
    "rejects client-supplied authority or review side effect %s", field => {
      expect(agriStageSubmissionCommandSchema.safeParse({ ...submit, [field]: "forged" }).success).toBe(false);
      expect(agriStageSubmissionCommandSchema.safeParse({ ...submit, content: { ...content, [field]: "forged" } }).success).toBe(false);
    });
  it("requires explicit rule version, CAS revision, idempotency key and an exact correction target", () => {
    for (const field of ["expectedRevision", "expectedRuleVersionId", "idempotencyKey"]) {
      const candidate: Record<string, unknown> = { ...submit };
      delete candidate[field];
      expect(agriStageSubmissionCommandSchema.safeParse(candidate).success).toBe(false);
    }
    for (const expectedRevision of [0, -1, 1.5, 2147483647]) {
      expect(agriStageSubmissionCommandSchema.safeParse({ ...submit, expectedRevision }).success).toBe(false);
    }
    expect(agriStageSubmissionCommandSchema.safeParse({ ...submit, idempotencyKey: "not-a-uuid" }).success).toBe(false);
    const correction = { ...submit, action: "correctSubmission", previousSubmissionId: "submission-1", correctionPermitId: "permit-1" };
    expect(agriStageSubmissionCommandSchema.safeParse(correction).success).toBe(true);
    expect(agriStageSubmissionCommandSchema.safeParse({ ...correction, correctionPermitId: undefined }).success).toBe(false);
    expect(agriStageSubmissionCommandSchema.safeParse({ ...correction, previousSubmissionId: undefined }).success).toBe(false);
  });
  it("bounds and versions material lists, disallows duplicate keys and payload fields", () => {
    const parse = (materials: unknown) => agriStageSubmissionCommandSchema.safeParse({ ...submit, content: { ...content, materials } }).success;
    expect(parse({ ...content.materials, schemaVersion: 2 })).toBe(false);
    expect(parse({ ...content.materials, items: [...content.materials.items, ...content.materials.items] })).toBe(false);
    expect(parse({ schemaVersion: 1, items: Array.from({ length: 21 }, (_, index) => ({ key: `item-${index}`, kind: "TEXT", text: "text" })) })).toBe(false);
    expect(parse({ schemaVersion: 1, items: [{ key: "brief", kind: "TEXT", text: "text", internalNote: "private" }] })).toBe(false);
    expect(parse({ schemaVersion: 1, items: [{ key: "backup", kind: "ARTIFACT", artifactVersionId: "backup-v1" }] })).toBe(true);
  });
  it.each([
    "http://example.invalid", "javascript:alert(1)", "https://user:password@example.invalid",
    "https://user%3Asecret@example.invalid", "https://example.invalid/?token=secret", "https://example.invalid/#access_token=secret",
    "https://example.invalid/?", "https://example.invalid/#", "https://example.invalid/a\nb",
  ])("refuses noncanonical or credential-bearing link %s", url => {
    expect(agriMaterialUrlSchema.safeParse(url).success).toBe(false);
  });
  it("accepts stable links and explicit repository ref forms without claiming they exist", () => {
    expect(agriMaterialUrlSchema.safeParse("https://demo.example.invalid/app").success).toBe(true);
    expect(agriRepositoryRefSchema.safeParse({ kind: "COMMIT_SHA", value: "A".repeat(64) }).success).toBe(true);
    expect(agriRepositoryRefSchema.safeParse({ kind: "COMMIT_SHA", value: "abc123" }).success).toBe(false);
    expect(agriRepositoryRefSchema.safeParse({ kind: "TAG", value: "v1.0" }).success).toBe(true);
    expect(agriRepositoryRefSchema.safeParse({ kind: "TAG", value: "release\nsecret" }).success).toBe(false);
  });
});

describe("candidate formal submission lifecycle", () => {
  it("honors the confirmed deadline instant using the supplied post-lock clock", () => {
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date("2026-10-07T02:59:59.999Z"))).toBe("NOT_OPEN");
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date(window.opensAt))).toBe("ALLOW");
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date(now.getTime() - 1))).toBe("ALLOW");
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, now)).toBe("ALLOW");
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date("2026-10-07T12:00:00+08:00"))).toBe("ALLOW");
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date(now.getTime() + 1))).toBe("CLOSED");
    expect(getAgriSubmissionLifecycleDecision({ ...snapshot, rule: { ...snapshot.rule, window: { ...window, includesDeadline: false } } }, submit, now)).toBe("CLOSED");
  });
  it("does not accept a client click before deadline when server acceptance is after it", () => {
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date(now.getTime() + 5000))).toBe("CLOSED");
    expect(getAgriSubmissionLifecycleDecision(snapshot, { ...submit, submittedAt: window.opensAt }, now)).toBe("INVALID");
  });
  it.each([
    [{ ...snapshot, workspaceEnabled: false }, "WORKSPACE_DISABLED"],
    [{ ...snapshot, entry: { ...snapshot.entry, competitionId: "edition-b" } }, "EDITION_MISMATCH"],
    [{ ...snapshot, rule: { ...snapshot.rule, competitionId: "edition-b" } }, "EDITION_MISMATCH"],
    [{ ...snapshot, entry: { ...snapshot.entry, id: "other-stage" } }, "ENTRY_MISMATCH"],
    [{ ...snapshot, entry: { ...snapshot.entry, revision: 3 } }, "REVISION_CONFLICT"],
    [{ ...snapshot, publishedRuleVersionId: null }, "RULES_UNPUBLISHED"],
    [{ ...snapshot, publishedRuleVersionId: "rules-2" }, "RULE_VERSION_CONFLICT"],
    [{ ...snapshot, rule: { ...snapshot.rule, id: "rules-2" }, publishedRuleVersionId: "rules-2" }, "RULE_VERSION_CONFLICT"],
    [{ ...snapshot, rule: { ...snapshot.rule, window: { ...window, stage: "FINAL" } } }, "STAGE_MISMATCH"],
    [{ ...snapshot, entry: { ...snapshot.entry, frozenSubmissionId: "frozen-1" } }, "FROZEN"],
    [{ ...snapshot, rule: { ...snapshot.rule, window: { state: "PENDING", stage: "PRELIMINARY", opensAt: null, closesAt: null } } }, "RULES_PENDING"],
  ])("fails closed for lifecycle mismatch: %s", (state, decision) => {
    expect(getAgriSubmissionLifecycleDecision(state, submit, now)).toBe(decision);
  });
  it("requires a recorded finals qualification source, not a successful technical check", () => {
    const finalState = { ...snapshot, entry: { ...snapshot.entry, stage: "FINAL" }, rule: { ...snapshot.rule, window: { ...window, stage: "FINAL" } } };
    expect(getAgriSubmissionLifecycleDecision(finalState, submit, now)).toBe("FINAL_ELIGIBILITY_REQUIRED");
    expect(getAgriSubmissionLifecycleDecision({ ...finalState, finalEligibility: { state: "INELIGIBLE", sourceId: "ops-1" } }, submit, now)).toBe("FINAL_ELIGIBILITY_REQUIRED");
    expect(getAgriSubmissionLifecycleDecision({ ...finalState, finalEligibility: { state: "ELIGIBLE" } }, submit, now)).toBe("INVALID");
    expect(getAgriSubmissionLifecycleDecision({ ...finalState, finalEligibility: { state: "ELIGIBLE", sourceId: "ops-1" } }, submit, now)).toBe("ALLOW");
    expect(getAgriSubmissionLifecycleDecision({ ...finalState, technicalCheckResult: "PASS" }, submit, now)).toBe("INVALID");
  });
  it("rejects bad clocks, malformed snapshots and attempts to treat correction as an ordinary submission", () => {
    expect(getAgriSubmissionLifecycleDecision(snapshot, submit, new Date(NaN))).toBe("INVALID");
    expect(getAgriSubmissionLifecycleDecision(null, submit, now)).toBe("INVALID");
    expect(getAgriSubmissionLifecycleDecision(snapshot, { ...submit, action: "correctSubmission", previousSubmissionId: "submission-1", correctionPermitId: "permit-1" }, now)).toBe("INVALID");
  });
  it("does not unfreeze history when the window is extended", () => {
    const frozen = { ...snapshot, entry: { ...snapshot.entry, frozenSubmissionId: "submission-1" },
      rule: { ...snapshot.rule, window: { ...window, closesAt: "2026-10-08T00:00:00Z" } } };
    expect(getAgriSubmissionLifecycleDecision(frozen, submit, new Date(now.getTime() + 5000))).toBe("FROZEN");
  });
});

describe("candidate single-use correction guard", () => {
  it("allows only the exact authorized field and keeps its inputs unchanged", () => {
    const before = JSON.stringify({ permit, content, revised });
    expect(getAgriCorrectionDecision(permit, target, content, revised, now)).toEqual({ allowed: true, changedFields: ["summary"] });
    expect(JSON.stringify({ permit, content, revised })).toBe(before);
  });
  it.each(["competitionId", "entryStageId", "previousSubmissionId", "permitId"])("binds the permit to exact %s", field => {
    expect(getAgriCorrectionDecision(permit, { ...target, [field]: "other" }, content, revised, now)).toEqual({ allowed: false, reason: "PERMIT_MISMATCH" });
  });
  it.each([
    { revokedAt: "2026-10-07T03:59:30Z" }, { usedBySubmissionId: "already-used" },
    { expiresAt: now.toISOString() }, { expiresAt: "2026-10-07T03:59:59.999Z" },
    { authorizedAt: "2026-10-07T04:00:00.001Z" },
  ])("rejects expired, revoked, consumed or future permits: %s", patch => {
    expect(getAgriCorrectionDecision({ ...permit, ...patch }, target, content, revised, now)).toEqual({ allowed: false, reason: "PERMIT_INACTIVE" });
  });
  it("does not turn a description correction into replacement of the artifact or project", () => {
    expect(getAgriCorrectionDecision(permit, target, content, { ...revised, artifactVersionId: "artifact-v2" }, now)).toEqual({ allowed: false, reason: "FIELD_NOT_ALLOWED" });
    expect(getAgriCorrectionDecision(permit, target, content, { ...revised, projectId: "project-b" }, now)).toEqual({ allowed: false, reason: "PROJECT_CHANGE_FORBIDDEN" });
    expect(getAgriCorrectionDecision({ ...permit, allowedFields: ["summary", "artifactVersionId"] }, target, content,
      { ...revised, artifactVersionId: "artifact-v2" }, now)).toEqual({ allowed: true, changedFields: ["artifactVersionId", "summary"] });
  });
  it("compares canonical parsed fields rather than input property insertion order", () => {
    const reordered = { materials: content.materials, summary: content.summary, demoUrl: content.demoUrl,
      repository: { ref: { value: "a".repeat(40), kind: "COMMIT_SHA" }, url: content.repository.url },
      artifactVersionId: content.artifactVersionId, projectId: content.projectId };
    expect(getAgriCorrectionDecision(permit, target, content, reordered, now)).toEqual({ allowed: false, reason: "NO_CHANGE" });
    expect(getAgriCorrectionDecision(permit, target, content, { ...content, summary: ` ${content.summary} ` }, now)).toEqual({ allowed: false, reason: "NO_CHANGE" });
  });
  it("requires a reason, bounded unique allowed fields and a valid authorization lifetime", () => {
    for (const patch of [{ reason: " " }, { allowedFields: [] }, { allowedFields: ["summary", "summary"] },
      { allowedFields: ["projectId"] }, { expiresAt: permit.authorizedAt }]) {
      expect(agriCorrectionPermitSnapshotSchema.safeParse({ ...permit, ...patch }).success).toBe(false);
    }
    expect(getAgriCorrectionDecision(permit, target, content, revised, new Date(NaN))).toEqual({ allowed: false, reason: "INVALID" });
  });
});

describe("candidate technical checks and separate feedback", () => {
  it("does not accept publication, promotion or XP instructions in a technical check", () => {
    expect(agriTechnicalCheckCommandSchema.safeParse(check).success).toBe(true);
    for (const field of ["publicConsent", "entryStatus", "xp", "teamFeedback", "checkedById", "checkedAt"]) {
      expect(agriTechnicalCheckCommandSchema.safeParse({ ...check, [field]: "forged" }).success).toBe(false);
    }
  });
  it("cannot pass an unreachable, incomplete, skipped-only or empty checklist", () => {
    for (const result of ["UNREACHABLE", "NEEDS_ACTION", "NOT_APPLICABLE"]) {
      expect(agriTechnicalCheckCommandSchema.safeParse({ ...check, checklist: { schemaVersion: 1,
        items: [{ key: "repository", result, note: "" }] } }).success).toBe(false);
    }
    expect(agriTechnicalCheckCommandSchema.safeParse({ ...check, checklist: { schemaVersion: 1, items: [] } }).success).toBe(false);
    expect(agriTechnicalCheckCommandSchema.safeParse({ ...check, result: "NEEDS_ACTION" }).success).toBe(false);
    expect(agriTechnicalCheckCommandSchema.safeParse({ ...check, result: "UNREACHABLE", checklist: { schemaVersion: 1,
      items: [{ key: "demo", result: "UNREACHABLE", note: "Timeout during manual test" }] } }).success).toBe(true);
  });
  it("requires an explicit publish body; withdrawal cannot carry a body or stale authority fields", () => {
    const publish = { action: "publishFeedback", idempotencyKey: key, checkId: "check-1", expectedSequence: 0, body: "Team message" };
    const withdraw = { action: "withdrawFeedback", idempotencyKey: key, checkId: "check-1", expectedSequence: 1 };
    expect(agriCheckFeedbackCommandSchema.safeParse(publish).success).toBe(true);
    expect(agriCheckFeedbackCommandSchema.safeParse({ ...publish, body: " " }).success).toBe(false);
    expect(agriCheckFeedbackCommandSchema.safeParse(withdraw).success).toBe(true);
    expect(agriCheckFeedbackCommandSchema.safeParse({ ...withdraw, body: "Do not leak this" }).success).toBe(false);
    expect(agriCheckFeedbackCommandSchema.safeParse({ ...publish, expectedSequence: -1 }).success).toBe(false);
    expect(agriCheckFeedbackCommandSchema.safeParse({ ...publish, internalNote: "private" }).success).toBe(false);
  });
  it("projects only explicit team feedback and immediately hides a latest withdrawal", () => {
    const visible = projectAgriTeamCheckFeedback(event, "edition-a", "check-1");
    expect(visible).toEqual({ checkId: "check-1", sequence: 1, body: event.body, publishedAt: event.createdAt });
    expect(visible).not.toHaveProperty("actorId");
    expect(visible).not.toHaveProperty("id");
    expect(projectAgriTeamCheckFeedback({ ...event, sequence: 2, action: "WITHDRAW", body: null }, "edition-a", "check-1")).toBeNull();
    expect(projectAgriTeamCheckFeedback({ ...event, sequence: 3, body: "Rechecked message" }, "edition-a", "check-1")?.body).toBe("Rechecked message");
  });
  it("fails closed for wrong edition/check, private fields and malformed withdrawal events", () => {
    expect(projectAgriTeamCheckFeedback(event, "edition-b", "check-1")).toBeNull();
    expect(projectAgriTeamCheckFeedback(event, "edition-a", "check-2")).toBeNull();
    expect(projectAgriTeamCheckFeedback({ ...event, internalNote: "private" }, "edition-a", "check-1")).toBeNull();
    expect(projectAgriTeamCheckFeedback({ ...event, action: "WITHDRAW" }, "edition-a", "check-1")).toBeNull();
    expect(projectAgriTeamCheckFeedback(null, "edition-a", "check-1")).toBeNull();
  });
});


describe("candidate versioned material requirements", () => {
  const requirements = { schemaVersion: 1, repositoryRequired: true, repositoryRefRequired: true,
    demoRequired: true, materials: [{ key: "brief", kind: "TEXT", required: true }] };
  const empty = { ...content, repository: null, demoUrl: null, materials: { schemaVersion: 1, items: [] } };

  it("accepts the declared materials without mutating the fixed rules or submission", () => {
    const before = JSON.stringify({ requirements, content });
    expect(getAgriSubmissionMaterialIssues(requirements, content)).toEqual([]);
    expect(JSON.stringify({ requirements, content })).toBe(before);
  });
  it("reports all missing required inputs rather than accepting a syntactically valid submission", () => {
    expect(getAgriSubmissionMaterialIssues(requirements, empty)).toEqual([
      { code: "REPOSITORY_REQUIRED" }, { code: "REPOSITORY_REF_REQUIRED" },
      { code: "DEMO_REQUIRED" }, { code: "MATERIAL_REQUIRED", key: "brief" },
    ]);
    expect(getAgriSubmissionMaterialIssues(requirements, {
      ...content, repository: { ...content.repository, ref: null },
    })).toEqual([{ code: "REPOSITORY_REF_REQUIRED" }]);
  });
  it("uses the supplied rule version rather than inferring requirements from older rules", () => {
    const optional = { ...requirements, repositoryRequired: false, repositoryRefRequired: false,
      demoRequired: false, materials: [{ key: "brief", kind: "TEXT", required: false }] };
    expect(getAgriSubmissionMaterialIssues(optional, empty)).toEqual([]);
    expect(getAgriSubmissionMaterialIssues(requirements, empty)).toHaveLength(4);
    expect(getAgriSubmissionMaterialIssues({ ...optional, materials: [] }, empty)).toEqual([]);
  });
  it("rejects the wrong material kind even when the declared material is optional", () => {
    const optional = { ...requirements, materials: [{ key: "brief", kind: "LINK", required: false }] };
    expect(getAgriSubmissionMaterialIssues(optional, content)).toEqual([
      { code: "MATERIAL_KIND_MISMATCH", key: "brief" },
    ]);
  });
  it("accepts declared link and artifact references without fetching or authorizing them", () => {
    const mixed = { ...requirements, materials: [
      { key: "demo_notes", kind: "LINK", required: true },
      { key: "backup", kind: "ARTIFACT", required: true },
    ] };
    const references = { ...content, materials: { schemaVersion: 1, items: [
      { key: "demo_notes", kind: "LINK", url: "https://example.invalid/demo-notes" },
      { key: "backup", kind: "ARTIFACT", artifactVersionId: "backup-version" },
    ] } };
    expect(getAgriSubmissionMaterialIssues(mixed, references)).toEqual([]);
  });
  it("rejects undeclared materials and never returns their bodies or addresses in issues", () => {
    const privateContent = { ...content, materials: { schemaVersion: 1, items: [
      { key: "secret_text", kind: "TEXT", text: "private submission detail" },
      { key: "secret_link", kind: "LINK", url: "https://private.example.invalid/private-path" },
    ] } };
    const issues = getAgriSubmissionMaterialIssues(requirements, privateContent);
    expect(issues).toEqual([{ code: "MATERIAL_REQUIRED", key: "brief" },
      { code: "UNRECOGNIZED_MATERIAL", key: "secret_text" },
      { code: "UNRECOGNIZED_MATERIAL", key: "secret_link" }]);
    expect(JSON.stringify(issues)).not.toContain("private submission detail");
    expect(JSON.stringify(issues)).not.toContain("private.example.invalid");
  });
  it("has no default requirements for omitted policy choices or material lists", () => {
    for (const field of ["schemaVersion", "repositoryRequired", "repositoryRefRequired", "demoRequired", "materials"]) {
      const candidate: Record<string, unknown> = { ...requirements };
      delete candidate[field];
      expect(getAgriSubmissionMaterialIssues(candidate, content)).toEqual([{ code: "INVALID" }]);
    }
  });
  it("fails closed for duplicate, unbounded, inconsistent or unversioned requirements", () => {
    for (const patch of [
      { schemaVersion: 2 }, { repositoryRequired: false },
      { materials: [...requirements.materials, ...requirements.materials] },
      { materials: [{ key: "brief", kind: "TEXT" }] },
      { materials: [{ key: "brief", kind: "TEXT", required: true, autoPublish: true }] },
      { materials: Array.from({ length: 21 }, (_, index) => ({ key: "item-" + index, kind: "TEXT", required: false })) },
    ]) {
      const malformed = { ...requirements, ...patch };
      expect(agriSubmissionRequirementsSchema.safeParse(malformed).success).toBe(false);
      expect(getAgriSubmissionMaterialIssues(malformed, content)).toEqual([{ code: "INVALID" }]);
    }
    expect(getAgriSubmissionMaterialIssues({ ...requirements, publicConsent: true }, content)).toEqual([{ code: "INVALID" }]);
  });
  it("does not include raw validation errors for malformed or credential-bearing materials", () => {
    for (const malformed of [null, { ...content, materials: { schemaVersion: 2, items: [] } },
      { ...content, demoUrl: "https://user:private-password@example.invalid/" },
      { ...content, materials: { ...content.materials, items: [...content.materials.items, ...content.materials.items] } }]) {
      expect(getAgriSubmissionMaterialIssues(requirements, malformed)).toEqual([{ code: "INVALID" }]);
    }
  });
});


describe("official member identity contract", () => {
  it("accepts one through five distinct real-account IDs without inserting defaults", () => {
    expect(agriOfficialMemberIdsSchema.parse(["user-a"])).toEqual(["user-a"]);
    expect(agriOfficialMemberIdsSchema.safeParse(["a", "b", "c", "d", "e"]).success).toBe(true);
  });
  it("rejects empty, oversized, blank and duplicate selections", () => {
    for (const ids of [[], [""], ["a", "a"], ["a", "b", "c", "d", "e", "f"]]) expect(agriOfficialMemberIdsSchema.safeParse(ids).success).toBe(false);
  });
});
