import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { reportArtifact } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok(await reportArtifact(session.user.id, id, await readJson(request)), { status: 201 }); }
  catch (error) { return respondWithError(error); }
}
