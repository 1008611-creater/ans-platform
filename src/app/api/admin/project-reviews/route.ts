import { requireAdminPermission } from "@/lib/admin-permissions";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { decideArtifactPublication } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) return fail("FORBIDDEN", "需要内容管理权限。", { status: 403 });
  try {
    return ok({ review: await decideArtifactPublication(admin.userId, await readJson(request)) });
  } catch (error) {
    return respondWithError(error);
  }
}
