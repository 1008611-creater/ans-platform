import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import {
  createWorkflow,
  listPublishedWorkflows,
  listOwnWorkflows,
} from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** GET /api/workflows?scope=mine|published&q=&take= */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "published";
    if (scope === "mine") {
      const session = await auth();
      if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
      return ok({ workflows: await listOwnWorkflows(session.user.id) });
    }
    const workflows = await listPublishedWorkflows({
      query: url.searchParams.get("q") ?? undefined,
      take: Number(url.searchParams.get("take") ?? 24) || 24,
    });
    return ok({ workflows });
  } catch (error) {
    return respondWithError(error);
  }
}

/** POST /api/workflows —— 创建草稿与 v1 定义。 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const workflow = await createWorkflow(session.user.id, await readJson(request));
    return ok({ workflow }, { status: 201 });
  } catch (error) {
    return respondWithError(error);
  }
}
