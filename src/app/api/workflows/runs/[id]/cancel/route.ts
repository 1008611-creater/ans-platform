import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { cancelWorkflowRun } from "@/server/workflows/runner";

export const dynamic = "force-dynamic";

/** POST /api/workflows/runs/[id]/cancel —— 取消排队中的运行并退费。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    const cancelled = await cancelWorkflowRun(id, session.user.id);
    if (!cancelled) return fail("NOT_FOUND", "运行记录不存在或已结束。", { status: 404 });
    return ok(cancelled);
  } catch (error) {
    return respondWithError(error);
  }
}
