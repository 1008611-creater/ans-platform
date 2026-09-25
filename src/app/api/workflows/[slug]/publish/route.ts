import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { publishWorkflow } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

/** POST /api/workflows/[slug]/publish —— 作者直接发布指定版本。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { slug } = await params;
    const body = await readJson(request).catch(() => ({}));
    const version =
      body && typeof body === "object" && "version" in body && typeof body.version === "number"
        ? body.version
        : undefined;
    const workflow = await publishWorkflow(slug, session.user.id, version);
    return ok({ workflow });
  } catch (error) {
    return respondWithError(error);
  }
}
