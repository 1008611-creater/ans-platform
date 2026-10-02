import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { reviewRewardAppeal } from "@/server/rewards/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await context.params;
  const raw = await readJson(request);
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw, appealId: id } : { appealId: id };
  try { return ok({ appeal: await reviewRewardAppeal(session.user.id, input) }); }
  catch (error) { return respondWithError(error); }
}
