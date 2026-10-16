// @vitest-environment node
import { expect, it, vi } from "vitest";
import { visualReservationQuery, readVisualReservations } from "@/server/quota/visual-reservations";

it("scopes both independent visual stores to the authenticated owner with bound parameters", () => {
  const owner = "member' OR true --";
  const query = visualReservationQuery(owner);
  expect(query.values).toEqual([owner, owner]);
  expect(query.text).not.toContain(owner);
  expect(query.text).toContain('"ownerId" = $1');
  expect(query.text).toContain('"ownerId" = $2');
  expect(query.text).not.toMatch(/UPDATE|INSERT|DELETE|FOR UPDATE/);
});

it("counts only positive unrefunded charges in pending visual states", () => {
  const query = visualReservationQuery("member").text;
  expect(query.match(/status IN \('QUEUED', 'RUNNING', 'NEEDS_REVIEW'\)/g)).toHaveLength(2);
  expect(query.match(/refunded = false AND "costPoints" > 0/g)).toHaveLength(2);
  expect(query).toContain('AND charged = true');
  expect(query).not.toContain("UPLOADING");
  expect(query).not.toContain("visual_input_uploads");
  expect(query).not.toMatch(/api_compute_requests|workflow_runs|compute_tasks|FROM runs/);
  expect(query).toContain('sum("costPoints")');
});

it("returns aggregate totals with exact stored decimals and no private job references", async () => {
  const raw = vi.fn().mockResolvedValue([{ pendingCount: 4, reservedPoints: "17.123456" }]);
  expect(await readVisualReservations({ $queryRaw: raw } as never, "member"))
    .toEqual({ pendingCount: 4, reservedPoints: 17.123456 });
  expect(raw).toHaveBeenCalledTimes(1);
});

it.each([{ rows: [] }, { rows: [{ pendingCount: 0, reservedPoints: null }] }])("returns zero for no paid pending jobs", async ({ rows }) => {
  const raw = vi.fn().mockResolvedValue(rows);
  expect(await readVisualReservations({ $queryRaw: raw } as never, "member"))
    .toEqual({ pendingCount: 0, reservedPoints: 0 });
});
