import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { toggleArtifactFavorite } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const { id } = await params;
  try { return ok(await toggleArtifactFavorite(session.user.id, id)); }
  catch (error) { return respondWithError(error); }
}
