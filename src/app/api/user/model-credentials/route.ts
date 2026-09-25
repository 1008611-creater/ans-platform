import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { createCredential, listCredentials } from "@/server/credentials/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user/model-credentials —— 只返回掩码后的凭证列表。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    return ok({ credentials: await listCredentials(session.user.id) });
  } catch (error) {
    return respondWithError(error);
  }
}

/** POST /api/user/model-credentials —— 绑定一个自带 Key。 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const credential = await createCredential(session.user.id, await readJson(request));
    return ok({ credential }, { status: 201 });
  } catch (error) {
    return respondWithError(error);
  }
}
