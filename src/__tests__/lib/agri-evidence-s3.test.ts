// @vitest-environment node
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
const mock = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => { const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>(); return { ...actual, S3Client: class {
        send = mock.send;
        destroy = mock.destroy;
    } }; });
import { evidenceCapacity, storeEvidence, evidenceObjectKey } from "@/server/competitions/agrihackathon/evidence-storage";
beforeEach(() => { vi.stubEnv("ANS_AGRI_EVIDENCE_STORAGE_MODE", "s3_private"); vi.stubEnv("ANS_AGRI_EVIDENCE_S3_BUCKET", "isolated-fixture-private"); vi.stubEnv("ANS_AGRI_EVIDENCE_S3_ACCESS_KEY_ID", "fixture-not-a-credential"); vi.stubEnv("ANS_AGRI_EVIDENCE_S3_SECRET_ACCESS_KEY", "fixture-not-a-credential"); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
describe("private S3 evidence", () => {
    it("requires demonstrably private ACL, policy and all four public-access blocks", async () => { mock.send.mockImplementation(async (command) => { switch (command.constructor.name) {
        case "GetBucketAclCommand": return { Grants: [] };
        case "GetBucketPolicyStatusCommand": return { PolicyStatus: { IsPublic: false } };
        case "GetBucketVersioningCommand": return {};
        default: return { PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true } };
    } }); await expect(evidenceCapacity(100)).resolves.toBeUndefined(); expect(mock.send).toHaveBeenCalledTimes(4); mock.send.mockImplementation(async (command) => command.constructor.name === "GetBucketAclCommand" ? { Grants: [{ Grantee: { URI: "http://acs.amazonaws.com/groups/global/AllUsers" } }] } : command.constructor.name === "GetBucketPolicyStatusCommand" ? { PolicyStatus: { IsPublic: false } } : {}); await expect(evidenceCapacity(100)).rejects.toThrow("STORAGE_NOT_PRIVATE"); });
    it("fails closed when private-bucket APIs are unsupported and when versioning would leave untracked object versions", async () => { mock.send.mockRejectedValueOnce(new Error("NotImplemented")); await expect(evidenceCapacity(100)).rejects.toThrow("PRIVACY_UNVERIFIED"); mock.send.mockImplementation(async (command) => command.constructor.name === "GetBucketVersioningCommand" ? { Status: "Enabled" } : {}); await expect(evidenceCapacity(100)).rejects.toThrow("VERSIONED_BUCKET_UNSUPPORTED"); });
    it("streams bounded multipart parts, uses conditional first publish, hashes actual bytes and verifies read-back", async () => { const bytes = Buffer.alloc(11 * 1024 ** 2 + 7, 0x61), parts: Buffer[] = []; mock.send.mockImplementation(async (command) => { switch (command.constructor.name) {
        case "CreateMultipartUploadCommand": return { UploadId: "fixture-upload" };
        case "UploadPartCommand":
            expect(command.input.Body.length).toBeLessThanOrEqual(5 * 1024 ** 2);
            parts.push(Buffer.from(command.input.Body));
            return { ETag: "fixture-part" };
        case "CompleteMultipartUploadCommand":
            expect(command.input.IfNoneMatch).toBe("*");
            return {};
        case "GetObjectCommand": return { Body: Readable.from(parts) };
        default: throw new Error("unexpected fixture operation");
    } }); const meta = await storeEvidence(evidenceObjectKey("fixture", randomUUID(), randomUUID()), Readable.from((function* () { for (let i = 0; i < bytes.length; i += 65536)
        yield bytes.subarray(i, i + 65536); })()), bytes.length, "SUPPORTING_FILE", AbortSignal.timeout(5000), async () => { }); expect(meta.sha256).toBe(createHash("sha256").update(bytes).digest("hex")); expect(meta.byteLength).toBe(bytes.length); expect(parts).toHaveLength(3); expect(mock.send.mock.calls.some(([command]) => command.constructor.name === "AbortMultipartUploadCommand")).toBe(false); });
    it("aborts an oversized multipart and never publishes a truncated successful object", async () => { mock.send.mockImplementation(async (command) => command.constructor.name === "CreateMultipartUploadCommand" ? { UploadId: "fixture-upload" } : {}); await expect(storeEvidence(evidenceObjectKey("fixture", randomUUID(), randomUUID()), Readable.from([Buffer.alloc(6), Buffer.alloc(6)]), 10, "SUPPORTING_FILE", AbortSignal.timeout(5000), async () => { })).rejects.toThrow("TOO_LARGE"); expect(mock.send.mock.calls.some(([command]) => command.constructor.name === "AbortMultipartUploadCommand")).toBe(true); expect(mock.send.mock.calls.some(([command]) => command.constructor.name === "CompleteMultipartUploadCommand")).toBe(false); });
});
