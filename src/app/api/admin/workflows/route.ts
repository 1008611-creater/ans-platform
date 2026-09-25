import { fail, ok, respondWithError } from "@/server/http/respond";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { listWorkflowQueue } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/workflows —— 待审核工作流队列。 */
export async function GET() {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) return fail("FORBIDDEN", "需要内容管理权限。", { status: 403 });
  try {
    return ok({ workflows: await listWorkflowQueue() });
  } catch (error) {
    return respondWithError(error);
  }
}
