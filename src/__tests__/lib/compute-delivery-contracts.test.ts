// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeDeliveryArtifactSchema, computeDeliveryCommandSchema, computeDeliveryViewSchema, computeDeliveryMutationSchema } from "@/contracts/compute-delivery";
const artifact = { relativePath: "assets/generated/image.png", sha256: "a".repeat(64), mimeType: "image/png", sizeBytes: 128 };
const fields = { version: 1, userId: "owner-a", computeTaskId: "compute-task-a", deliveryId: "b".repeat(64), eventId: "delivery-event-a", expectedDeliveryRevision: 0 };
describe("strict signed delivery protocol", () => {
  it.each(["/etc/passwd", "C:/secret/file", "C:\\secret\\file", "../secret", "assets/../secret", "assets/./file", "assets//file", "assets/", "", "https://example.test/file", "//host/file", "assets/file?token=secret", "assets/a#fragment\u0000", "assets/line\nfile", "assets/file\u007f", "assets/file.", "assets/file ", "assets/CON.png", "NUL", "assets/lpt9.mp4"])("rejects unsafe relative output %j", relativePath => {
    expect(computeDeliveryArtifactSchema.safeParse({ ...artifact, relativePath }).success).toBe(false);
  });
  it("allows meaningful relative names without normalization or path rewriting", () => {
    const value = { ...artifact, relativePath: "作品/我的 视频.mp4", mimeType: "video/mp4" };
    expect(computeDeliveryArtifactSchema.parse(value)).toEqual(value);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 104857601])("rejects invalid artifact size %s", sizeBytes => {
    expect(computeDeliveryArtifactSchema.safeParse({ ...artifact, sizeBytes }).success).toBe(false);
  });
  it("accepts only one fixed supported output, never URLs or arbitrary code MIME", () => {
    for (const value of [{ ...artifact, url: "https://private.test" }, { ...artifact, directory: "/internal/path" }, { ...artifact, mimeType: "text/html" }, { ...artifact, sha256: "A".repeat(64) }, [artifact, artifact]]) {
      expect(computeDeliveryArtifactSchema.safeParse(value).success).toBe(false);
    }
    expect(computeDeliveryCommandSchema.safeParse({ ...fields, action: "available", artifacts: [artifact] }).success).toBe(false);
  });
  it("rejects provider/owner/price fields and inconsistent command actions", () => {
    for (const extra of [{ provider: "other" }, { ownerId: "victim" }, { settledPoints: 0 }, { artifact }, { failureCode: "RAW_SUPPLIER_ERROR" }]) {
      expect(computeDeliveryCommandSchema.safeParse({ ...fields, action: "pending", ...extra }).success).toBe(false);
    }
    expect(computeDeliveryCommandSchema.safeParse({ ...fields, action: "failed" }).success).toBe(false);
    expect(computeDeliveryCommandSchema.safeParse({ ...fields, action: "available", artifact }).success).toBe(true);
  });
  it.each([-1, 1.5, Infinity, 2147483646])("rejects invalid expected delivery revision %s", expectedDeliveryRevision => {
    expect(computeDeliveryCommandSchema.safeParse({ ...fields, action: "pending", expectedDeliveryRevision }).success).toBe(false);
  });
  it("checks read/mutation state consistency and never advertises delivered metadata before AVAILABLE", () => {
    const pending = { version: 1, deliveryId: fields.deliveryId, computeTaskId: fields.computeTaskId, state: "PENDING", revision: 1,
      artifact: null, failureCode: null, createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z", availableAt: null };
    expect(computeDeliveryViewSchema.safeParse(pending).success).toBe(true);
    for (const value of [{ ...pending, artifact }, { ...pending, state: "AVAILABLE" }, { ...pending, state: "FAILED" }, { ...pending, url: "https://private.test" }]) {
      expect(computeDeliveryViewSchema.safeParse(value).success).toBe(false);
    }
    const available = { ...pending, state: "AVAILABLE", revision: 2, artifact, availableAt: pending.createdAt };
    expect(computeDeliveryViewSchema.safeParse(available).success).toBe(true);
    expect(computeDeliveryMutationSchema.safeParse({ delivery: available, appliedRevision: 3, duplicate: false }).success).toBe(false);
  });
});
