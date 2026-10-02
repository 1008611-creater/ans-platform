import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { buildPublicAiConfig, rollbackAdminAiConfigWithAudit } from "@/server/admin/ai-config";

export async function POST() {
  const context = await requireAdminPermission("PROMPTS_MANAGE");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const saved = await rollbackAdminAiConfigWithAudit(context.userId);
    return NextResponse.json({ data: buildPublicAiConfig(saved) });
  } catch (error) {
    return NextResponse.json({ error: "rollback_failed", message: error instanceof Error ? error.message : "恢复失败" }, { status: 409 });
  }
}
