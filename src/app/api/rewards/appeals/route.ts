import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { createRewardAppeal } from "@/server/rewards/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { return ok({ appeal: await createRewardAppeal(session.user.id, await readJson(request)) }, { status: 201 }); }
  catch (error) { return respondWithError(error); }
}
