import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { requestArtifactPublication } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    return ok({ review: await requestArtifactPublication(id, session.user.id, await readJson(request)) }, { status: 202 });
  } catch (error) {
    return respondWithError(error);
  }
}
