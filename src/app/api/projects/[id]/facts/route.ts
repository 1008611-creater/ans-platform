import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { saveProjectFacts } from "@/server/projects/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    return ok({ project: await saveProjectFacts(id, session.user.id, await readJson(request)) });
  } catch (error) {
    return respondWithError(error);
  }
}
