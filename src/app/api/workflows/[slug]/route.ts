import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { getPublishedWorkflow, getWorkflowForEditor } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** GET /api/workflows/[slug]?scope=mine */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const scope = new URL(request.url).searchParams.get("scope") ?? "public";
    if (scope === "mine") {
      const session = await auth();
      if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
      return ok({ workflow: await getWorkflowForEditor(slug, session.user.id) });
    }
    const workflow = await getPublishedWorkflow(slug);
    if (!workflow) return fail("NOT_FOUND", "工作流不存在。", { status: 404 });
    return ok({ workflow });
  } catch (error) {
    return respondWithError(error);
  }
}
