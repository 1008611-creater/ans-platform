import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { createWorkflowVersion, getWorkflowForEditor } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** POST /api/workflows/[slug]/versions —— 追加一个不可变版本。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { slug } = await params;
    const version = await createWorkflowVersion(slug, session.user.id, await readJson(request));
    return ok({ version }, { status: 201 });
  } catch (error) {
    return respondWithError(error);
  }
}

/** GET /api/workflows/[slug]/versions —— 作者查看全部版本。 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { slug } = await params;
    const workflow = await getWorkflowForEditor(slug, session.user.id);
    return ok({ versions: workflow.versions });
  } catch (error) {
    return respondWithError(error);
  }
}
