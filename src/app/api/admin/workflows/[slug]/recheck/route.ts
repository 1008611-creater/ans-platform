import { fail, ok, respondWithError } from "@/server/http/respond";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { recheckWorkflowReview } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** POST /api/admin/workflows/[slug]/recheck —— 管理员重新发起 AI 初审。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) return fail("FORBIDDEN", "需要内容管理权限。", { status: 403 });
  try {
    const { slug } = await params;
    const result = await recheckWorkflowReview(slug, admin.userId);
    return ok({ workflowId: result.workflowId, review: result.review });
  } catch (error) {
    return respondWithError(error);
  }
}
