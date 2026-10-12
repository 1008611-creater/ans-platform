import { assertRequestActor, readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { createRewardAppeal } from "@/server/rewards/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { assertRequestActor(request, session.user.id); return ok({ appeal: await createRewardAppeal(session.user.id, await readSameOriginJson(request)) }, { status: 201 }); }
  catch (error) { return respondWithError(error); }
}
