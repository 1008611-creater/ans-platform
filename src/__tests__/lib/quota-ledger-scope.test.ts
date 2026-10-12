// @vitest-environment node
import { expect, it, vi } from "vitest";
import { countPersonalQuotaMismatches, personalQuotaLedgerWhere } from "@/server/quota/ledger-scope";

it("shares a fresh scope without swallowing caller pagination or legacy null references", () => {
  const first = personalQuotaLedgerWhere();
  expect(first).toEqual({ AND: [
    { reason: { not: "TEAM_GRANT" } },
    { OR: [{ refType: null }, { refType: { notIn: ["team", "team_member"] } }] },
  ] });
  expect(personalQuotaLedgerWhere()).not.toBe(first);
  expect(first).not.toHaveProperty("OR");
});
it("diagnoses personal differences without mutating accounts or excluding null-reference charges", async () => {
  const query = vi.fn().mockResolvedValue([{ count: 2 }]);
  expect(await countPersonalQuotaMismatches({ $queryRaw: query } as never)).toBe(2);
  const [parts] = query.mock.calls[0];
  const sql = Array.from(parts).join("");
  expect(sql).toContain('l.reason <> \'TEAM_GRANT\'');
  expect(sql).toContain('(l."refType" IS NULL OR l."refType" NOT IN (\'team\', \'team_member\'))');
  expect(sql).toContain('HAVING u."quotaPoints"<>coalesce(sum(l.amount),0)');
  expect(sql).not.toMatch(/UPDATE|DELETE|INSERT/);
  expect(query).toHaveBeenCalledTimes(1);
});
