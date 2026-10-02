import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { listProjectPublications, requestArtifactPublication, withdrawArtifactPublication } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };


export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok({ publications: await listProjectPublications(id, session.user.id) }); }
  catch (error) { return respondWithError(error); }
}

export async function POST(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok({ review: await requestArtifactPublication(id, session.user.id, await readJson(request)) }, { status: 202 }); }
  catch (error) { return respondWithError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  const input = await request.json().catch(() => ({})) as { artifactVersionId?: string };
  try { return ok({ publication: await withdrawArtifactPublication(id, session.user.id, input.artifactVersionId ?? "") }); }
  catch (error) { return respondWithError(error); }
}
