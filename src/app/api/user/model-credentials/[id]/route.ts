import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { deleteCredential, updateCredential } from "@/server/credentials/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/user/model-credentials/[id] —— 重命名或停用。 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    const credential = await updateCredential(session.user.id, id, await readJson(request));
    return ok({ credential });
  } catch (error) {
    return respondWithError(error);
  }
}

/** DELETE /api/user/model-credentials/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    return ok(await deleteCredential(session.user.id, id));
  } catch (error) {
    return respondWithError(error);
  }
}
