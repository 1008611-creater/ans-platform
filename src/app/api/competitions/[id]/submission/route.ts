import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { submitCompetitionEntry } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok(await submitCompetitionEntry(session.user.id, id, await readJson(request)), { status: 202 }); }
  catch (error) { return respondWithError(error); }
}
