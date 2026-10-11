import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { enqueueProjectWorkflow, listProjectWorkflowRuns } from "@/server/projects/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    return ok(await enqueueProjectWorkflow(id, session.user.id, await readJson(request)), { status: 202 });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "\u8bf7\u5148\u767b\u5f55\u3002", { status: 401 });
  try { const { id } = await params; return ok({ runs: await listProjectWorkflowRuns(id, session.user.id) }); }
  catch (error) { return respondWithError(error); }
}
