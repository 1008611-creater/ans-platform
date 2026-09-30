import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { listPendingCompetitionEntries, reviewCompetitionEntry } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { return ok({ entries: await listPendingCompetitionEntries(session.user.id) }); }
  catch (error) { return respondWithError(error); }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { return ok({ review: await reviewCompetitionEntry(session.user.id, await readJson(request)) }); }
  catch (error) { return respondWithError(error); }
}
