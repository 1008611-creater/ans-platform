import type { DbTransaction } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriArchiveOnsiteSchema, type AgriArchiveOnsite, type AgriRecordArchiveSelection } from "@/contracts/agri-record-archive";
import { agriOnsiteFieldsSchema } from "@/contracts/agri-onsite";
import type { AgriWorkspaceContext } from "./workspace";

type ItemRow = { id: string; demoCheckId: string | null; revision: number; published: boolean; createdById: string; createdAt: Date; updatedAt: Date; fields: unknown };
type EventRow = { id: string; itemId: string; revision: number; action: string; actorId: string; createdAt: Date; published: boolean; fields: unknown };
function fields(raw: unknown) {
  if (!raw || typeof raw !== "object" || !("schemaVersion" in raw) || raw.schemaVersion !== 1) throw new AgriWorkspaceError("AGRI_ONSITE_STORAGE_INVALID", 500);
  const { schemaVersion: _version, ...value } = raw; void _version;
  return agriOnsiteFieldsSchema.parse(value);
}
/** The archive caller holds WORKS_READ + ONSITE_READ and explicit private/internal selection.
 * These facts are a fixed internal copy; they grant no onsite publication or public authorization. */
export async function collectAgriArchiveOnsite(tx: DbTransaction, ctx: AgriWorkspaceContext, submissionId: string, selection: AgriRecordArchiveSelection): Promise<AgriArchiveOnsite> {
  const items = await tx.$queryRaw<ItemRow[]>`SELECT i.id,i."demoCheckId",i.revision,i.published,i."createdById",i."createdAt",i."updatedAt",i.fields
    FROM agri_onsite_items i LEFT JOIN agri_demo_checks d ON d.id=i."demoCheckId" AND d."submissionId"=i."submissionId" AND d."competitionId"=i."competitionId"
    WHERE i."competitionId"=${ctx.workspace.competitionId} AND i."submissionId"=${submissionId}
    AND (d.id IS NULL OR ((d.basis='METADATA' OR ${selection.includePrivate}) AND (d."internalNote" IS NULL OR ${selection.includeInternal})))
    ORDER BY i."createdAt",i.id LIMIT 101`;
  const events = await tx.$queryRaw<EventRow[]>`SELECT e.id,e."itemId",e.revision,e.action,e."actorId",e."createdAt",e.published,e.fields
    FROM agri_onsite_events e JOIN agri_onsite_items i ON i.id=e."itemId" AND i."competitionId"=e."competitionId"
    LEFT JOIN agri_demo_checks d ON d.id=i."demoCheckId" AND d."submissionId"=i."submissionId" AND d."competitionId"=i."competitionId"
    WHERE i."competitionId"=${ctx.workspace.competitionId} AND i."submissionId"=${submissionId}
    AND (d.id IS NULL OR ((d.basis='METADATA' OR ${selection.includePrivate}) AND (d."internalNote" IS NULL OR ${selection.includeInternal})))
    ORDER BY e."createdAt",e.id LIMIT 101`;
  if (items.length > 100 || events.length > 100) throw new AgriWorkspaceError("AGRI_SUMMARY_TOO_LARGE", 422);
  return agriArchiveOnsiteSchema.parse({
    items: items.map(row => ({ ...row, fields: fields(row.fields), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    events: events.map(row => ({ ...row, fields: fields(row.fields), createdAt: row.createdAt.toISOString() })),
  });
}
