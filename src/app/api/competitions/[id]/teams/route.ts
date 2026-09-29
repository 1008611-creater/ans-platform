import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { listTeamsForCompetition } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { return ok({ teams: await listTeamsForCompetition(session.user.id) }); }
  catch (error) { return respondWithError(error); }
}
