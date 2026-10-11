import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { registerCompetitionTeam } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  if (request.headers.has("x-ans-actor") && request.headers.get("x-ans-actor") !== session.user.id) return fail("ACCOUNT_CHANGED", "ACCOUNT_CHANGED", { status: 409 });
  const { id } = await params;
  try { return ok(await registerCompetitionTeam(session.user.id, id, await readJson(request)), { status: 201 }); }
  catch (error) { return respondWithError(error); }
}
