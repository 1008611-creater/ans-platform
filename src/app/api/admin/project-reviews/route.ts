import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { decideArtifactPublication } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    return ok({ review: await decideArtifactPublication(session.user.id, await readJson(request)) });
  } catch (error) {
    return respondWithError(error);
  }
}
