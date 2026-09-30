import { auth } from "@/lib/auth";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { createCompetition, listCompetitions } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await requireAdminPermission("USERS_VIEW");
  if (!context) return fail("FORBIDDEN", "没有管理权限。", { status: 403 });
  try { return ok({ competitions: await listCompetitions() }); }
  catch (error) { return respondWithError(error); }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try { return ok({ competition: await createCompetition(session.user.id, await readJson(request)) }, { status: 201 }); }
  catch (error) { return respondWithError(error); }
}
