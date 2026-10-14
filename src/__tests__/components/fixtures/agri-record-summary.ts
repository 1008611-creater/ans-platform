import type { AgriRecordSummary } from "@/contracts/agri-record-summary";

/** Synthetic local fixture only. Never sent to a real event or external service. */
export function withSyntheticRecordDetails(base: AgriRecordSummary): AgriRecordSummary {
  return {
    ...base,
    selection: { includePrivate: true, includeInternal: true },
    content: {
      projectId: "synthetic-project", artifactVersionId: "synthetic-artifact-version",
      summary: "SAVED_SUMMARY_MARKER",
      repository: { url: "https://github.com/example/synthetic-record", ref: { kind: "COMMIT_SHA", value: "a".repeat(40) } },
      demoUrl: "https://demo.example.invalid/saved-demo",
      materials: { schemaVersion: 1, items: [
        { key: "instructions", kind: "TEXT", text: "SAVED_TEXT_MARKER <script>alert(1)</script>" },
        { key: "video", kind: "LINK", url: "https://video.example.invalid/saved-video" },
        { key: "slides", kind: "ARTIFACT", artifactVersionId: "synthetic-slides-version" },
      ] },
    },
    technicalChecks: [{
      id: "technical-synthetic", basis: "PRIVATE_MATERIALS", result: "NEEDS_ACTION",
      checkedAt: "2026-10-08T06:25:00Z", checkedById: "synthetic-reviewer",
      checklist: { schemaVersion: 1, items: [
        { key: "repository", result: "PASS", note: "SAVED_REPOSITORY_CHECK" },
        { key: "demo", result: "NEEDS_ACTION", note: "SAVED_DEMO_CHECK" },
        { key: "video", result: "UNREACHABLE", note: "SAVED_VIDEO_CHECK" },
        { key: "hardware", result: "NOT_APPLICABLE", note: "" },
      ] },
      feedback: { sequence: 1, publishedAt: "2026-10-08T06:25:00Z", body: "SAVED_FEEDBACK_MARKER" },
      internalNote: "SAVED_INTERNAL_MARKER",
    }],
    demoChecks: [{
      id: "demo-synthetic", sequence: 2, recheckOfId: "demo-synthetic-previous", basis: "PRIVATE_MATERIALS",
      result: "NEEDS_ACTION", checkedAt: "2026-10-08T06:25:00Z", feedback: null,
      demo: {
        schemaVersion: 1, mode: "HYBRID", description: "SAVED_DEMO_DESCRIPTION",
        device: { status: "PASS", note: "SAVED_DEVICE_CHECK" },
        compatibility: { status: "NEEDS_ACTION", note: "SAVED_COMPATIBILITY_CHECK" },
        network: { status: "UNREACHABLE", note: "SAVED_NETWORK_CHECK" },
        audio: { status: "NOT_APPLICABLE", note: "SAVED_AUDIO_CHECK" },
        backup: { status: "NOT_TESTED", note: "SAVED_BACKUP_CHECK", url: "https://backup.example.invalid/saved-demo", artifactVersionId: "synthetic-backup-version" },
        conclusion: "NEEDS_ACTION", recheckDue: { state: "TENTATIVE", at: "2026-10-09T00:30:00Z" },
      },
    }],
  };
}


/** Synthetic metadata-only issue; bodies remain absent from this saved projection. */
export function withSyntheticIssueMetadata(base: AgriRecordSummary): AgriRecordSummary {
  return { ...base, issues: [{
    id: "synthetic-issue", revision: 3, status: "RESOLVED", severity: "HIGH", type: "ENVIRONMENT",
    basis: "METADATA", visibility: "TEAM", dueState: "CONFIRMED", dueAt: "2026-10-09T01:30:00Z",
    createdAt: "2026-10-08T01:00:00Z", updatedAt: "2026-10-08T03:00:00Z",
    completedAt: "2026-10-08T02:00:00Z", completedById: "synthetic-processor", assigneeId: "synthetic-assignee",
  }] };
}
