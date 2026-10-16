import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { readBenefitFunding } from "@/server/integrations/benefit-billing";
import type { PersonalApiHistory, PersonalApiRequestView } from "@/contracts/compute-benefits";
export type { PersonalApiHistory, PersonalApiRequestView };

const requestSelect = {
  id: true, modelId: true, state: true, authorizedPoints: true, settledPoints: true,
  createdAt: true, startedAt: true, finishedAt: true, price: true,
} satisfies Prisma.ApiComputeRequestSelect;

/** userId must come from the authenticated server session. This read never
 * reconciles, restarts or charges a request. Provider metadata stays private. */
export async function readPersonalApiHistory(userId: string): Promise<PersonalApiHistory> {
  if (typeof userId !== "string" || !userId || userId.length > 128) throw new Error("ACCOUNT_UNAVAILABLE");
  const rows = await db.apiComputeRequest.findMany({
    where: { userId, provider: "apic-codex", user: { deletedAt: null } },
    select: requestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20,
  });
  return rows.map(row => ({
    id: row.id, modelId: row.modelId, state: row.state,
    ...(readBenefitFunding(row.price) ? { funding: "gift" as const } : {}),
    authorizedPoints: readBenefitFunding(row.price) ? 0 : Number(row.authorizedPoints),
    settledPoints: (row.state === "SETTLED" || row.state === "RELEASED") && row.settledPoints !== null
      ? Number(row.settledPoints) : null,
    createdAt: row.createdAt.toISOString(), startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
  }));
}
