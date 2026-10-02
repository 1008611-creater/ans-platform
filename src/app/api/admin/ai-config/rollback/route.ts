import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { buildPublicAiConfig, getAdminAiConfig, rollbackAdminAiConfig } from "@/server/admin/ai-config";

export async function POST() {
  const context = await requireAdminPermission("PROMPTS_MANAGE");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const before = await getAdminAiConfig();
    const saved = await rollbackAdminAiConfig(context.userId);
    await writeAuditLog({
      actorId: context.userId,
      action: "ADMIN_AI_CONFIG_ROLLBACK",
      resourceType: "ADMIN_AI_CONFIG",
      resourceId: saved.id,
      before: before ? { baseUrl: before.baseUrl, selectedModel: before.selectedModel, reasoningEffort: before.reasoningEffort, timeoutMs: before.timeoutMs, enabled: before.enabled } : null,
      after: { baseUrl: saved.baseUrl, selectedModel: saved.selectedModel, reasoningEffort: saved.reasoningEffort, timeoutMs: saved.timeoutMs, enabled: saved.enabled },
    });
    return NextResponse.json({ data: buildPublicAiConfig(saved) });
  } catch (error) {
    return NextResponse.json({ error: "rollback_failed", message: error instanceof Error ? error.message : "恢复失败" }, { status: 409 });
  }
}
