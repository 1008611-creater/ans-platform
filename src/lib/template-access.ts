import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-permissions";

export class TemplateError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireTemplateAuthor() {
  const session = await auth();
  if (!session?.user?.id) throw new TemplateError(401, "请先登录");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, verified: true, deletedAt: true, flagged: true },
  });
  if (!user || !user.verified || user.deletedAt || user.flagged) {
    throw new TemplateError(403, "仅已验证且状态正常的用户可以管理模板");
  }
  return user;
}

export async function requireTemplateAdmin() {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) throw new TemplateError(403, "需要模板管理权限");
  return admin;
}

export function templateErrorResponse(error: unknown) {
  if (error instanceof TemplateError) return Response.json({ error: error.message }, { status: error.status });
  console.error("模板操作失败", error);
  return Response.json({ error: "模板操作失败，请稍后重试" }, { status: 500 });
}

export async function templateJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new TemplateError(400, "请求必须是有效 JSON"); }
}
