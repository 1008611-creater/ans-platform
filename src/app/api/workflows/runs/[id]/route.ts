import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { getWorkflowRun } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** GET /api/workflows/runs/[id] —— 仅本人可见的运行详情。 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    const run = await getWorkflowRun(id, session.user.id);
    if (!run) return fail("NOT_FOUND", "运行记录不存在。", { status: 404 });
    return ok({ run });
  } catch (error) {
    return respondWithError(error);
  }
}
