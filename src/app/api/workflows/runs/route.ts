import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { listWorkflowRuns } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** GET /api/workflows/runs —— 我的运行记录。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const take = Number(new URL(request.url).searchParams.get("take") ?? 50) || 50;
    return ok({ runs: await listWorkflowRuns(session.user.id, take) });
  } catch (error) {
    return respondWithError(error);
  }
}
