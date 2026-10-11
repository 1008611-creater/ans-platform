// @vitest-environment node
import { expect, it, vi } from "vitest";
import { examReservationQuery, readExamReservations } from "@/server/quota/exam-reservations";
it("parameterizes account scope including an injection-shaped identity", () => {
 const input = "member' OR true --";
 const query = examReservationQuery(input);
 expect(query.values).toEqual([input]);
 expect(query.text).not.toContain(input);
 expect(query.text).toContain('l."userId" = $1');
});
it("allows only the server admin caller to request an unscoped projection", () => {
 expect(examReservationQuery().values).toEqual([]);
 expect(examReservationQuery("").values).toEqual([""]);
});
it("maps decimal holds without exposing the external task reference", async () => {
 const raw = vi.fn().mockResolvedValue([{ id: "ledger-a", userId: "member", refId: "private-task-ref", points: "0.123456", createdAt: new Date("2026-10-12T00:00:00Z"), pendingCount: 70, reservedPoints: "12.123456" }]);
 const result = await readExamReservations({ $queryRaw: raw } as never, "member");
 expect(result).toEqual({ pendingCount: 70, reservedPoints: 12.123456, items: [{ id: "ledger-a", userId: "member", points: 0.123456, createdAt: "2026-10-12T00:00:00.000Z" }] });
 expect(JSON.stringify(result)).not.toContain("private-task-ref");
});
it("returns explicit zero totals for an account without outstanding holds", async () => {
 const raw = vi.fn().mockResolvedValue([]);
 expect(await readExamReservations({ $queryRaw: raw } as never, "member")).toEqual({ pendingCount: 0, reservedPoints: 0, items: [] });
});
