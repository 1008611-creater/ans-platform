import type { DbTransaction } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import type { AgriIssueFields } from "@/contracts/agri-issues";
import type { AgriWorkspaceScope } from "@/contracts/agrihackathon";
import { requireAgriScope, assertAgriAuthorityCurrent, type AgriWorkspaceContext } from "./workspace";

type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
function cannotRead(): never {
  throw new AgriWorkspaceError("AGRI_ASSIGNEE_CANNOT_READ", 422);
}
/** Assignment never grants access. Use the same team/staff visibility rules as issue reads. */
export async function requireAgriIssueAssignee(
  tx: DbTransaction,
  ctx: AgriWorkspaceContext,
  assigneeId: string,
  teamId: string,
  visibility: AgriIssueFields["visibility"],
  basis: "METADATA" | "PRIVATE_MATERIALS",
): Promise<Authority[]> {
  const [account] = await tx.$queryRaw<Array<{ flagged: boolean; deletedAt: Date | null }>>`
    SELECT flagged,"deletedAt" FROM users WHERE id=${assigneeId} FOR SHARE`;
  if (!account || account.flagged || account.deletedAt) {
    throw new AgriWorkspaceError("AGRI_ASSIGNEE_UNAVAILABLE", 422);
  }
  // TEAM feedback is already explicitly reviewed for the exact submission's team.
  // Staff grants do not broaden that team route, and membership cannot expose INTERNAL issues.
  if (visibility === "TEAM") {
    const [member] = await tx.$queryRaw<Array<{ status: string }>>`
      SELECT status FROM team_members WHERE "teamId"=${teamId} AND "userId"=${assigneeId} FOR SHARE`;
    if (member?.status === "ACTIVE") return [];
  }
  const recipient = { ...ctx, actorId: assigneeId };
  const scopes: AgriWorkspaceScope[] = ["WORKS_READ"];
  if (visibility === "INTERNAL") scopes.push("INTERNAL_NOTES_READ");
  if (basis === "PRIVATE_MATERIALS") scopes.push("PRIVATE_MATERIALS_READ");
  try {
    const authorities: Authority[] = [];
    for (const scope of scopes) authorities.push(await requireAgriScope(tx, recipient, scope));
    return authorities;
  } catch (error) {
    if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") cannotRead();
    throw error;
  }
}
/** The recipient's grants may expire during a write; any failure rolls back its transaction. */
export async function assertAgriIssueAssigneeCurrent(tx: DbTransaction, authorities: Authority[]) {
  try {
    await assertAgriAuthorityCurrent(tx, ...authorities);
  } catch (error) {
    if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") cannotRead();
    throw error;
  }
}
