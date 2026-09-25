import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { submitWorkflowForReview } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** POST /api/workflows/[slug]/submit —— 提交审核。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { slug } = await params;
    const workflow = await submitWorkflowForReview(slug, session.user.id);
    return ok({ workflow });
  } catch (error) {
    return respondWithError(error);
  }
}
