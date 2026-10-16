// @vitest-environment node
import { expect,it,vi } from "vitest";
import type { DbTransaction } from "@/lib/db";
import {readPaidApiReservations} from "@/server/quota/benefit-reservations";
it("scopes paid holds to owner, excludes gifts without excluding historical missing JSON paths",async()=>{
 const query=vi.fn().mockResolvedValue([{amount:"0.123456",count:BigInt(2)}]);
 expect(await readPaidApiReservations({$queryRaw:query} as unknown as DbTransaction,"owner")).toEqual({_sum:{authorizedPoints:.123456},_count:{_all:2}});
 const [sql,owner]=query.mock.calls[0];
 expect(sql.join("?")).toContain("NOT (price ? 'benefitFunding')");expect(owner).toBe("owner");expect(sql.join("?")).toContain('"userId"=');
});
