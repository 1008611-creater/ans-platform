import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { updateCompetition } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok({ competition: await updateCompetition(session.user.id, id, await readJson(request)) }); }
  catch (error) { return respondWithError(error); }
}
