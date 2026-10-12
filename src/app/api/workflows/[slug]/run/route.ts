import { assertRequestActor, readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { createWorkflowRun } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** POST /api/workflows/[slug]/run —— 创建一次运行（同步返回运行记录）。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    assertRequestActor(request, session.user.id);
    const { slug } = await params;
    const body = await readSameOriginJson(request);
    const run = await createWorkflowRun(slug, session.user.id, body, { expectedInput: true });
    return ok({ run }, { status: 202 });
  } catch (error) {
    return respondWithError(error);
  }
}
