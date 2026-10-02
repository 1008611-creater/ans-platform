import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import {
  buildPublicAiConfig,
  getAdminAiConfig,
  normalizeModelList,
  REVIEW_REASONING_EFFORTS,
  saveAdminAiConfig,
} from "@/server/admin/ai-config";

const inputSchema = z.object({
  baseUrl: z.string().trim().min(1).max(500),
  apiKey: z.string().trim().max(2000).optional(),
  selectedModel: z.string().trim().min(1).max(200),
  availableModels: z.array(z.string().trim().min(1).max(200)).max(500),
  reasoningEffort: z.enum(REVIEW_REASONING_EFFORTS),
  timeoutMs: z.number().int().min(5_000).max(120_000),
  enabled: z.boolean(),
});

export async function GET() {
  const context = await requireAdminPermission("PROMPTS_MANAGE");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const config = await getAdminAiConfig();
  return NextResponse.json({ data: buildPublicAiConfig(config) });
}

export async function PATCH(request: Request) {
  const context = await requireAdminPermission("PROMPTS_MANAGE");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = inputSchema.parse(await request.json());
    const before = await getAdminAiConfig();
    const saved = await saveAdminAiConfig({
      ...body,
      availableModels: normalizeModelList(body.availableModels),
    }, context.userId);
    await writeAuditLog({
      actorId: context.userId,
      action: "ADMIN_AI_CONFIG_UPDATE",
      resourceType: "ADMIN_AI_CONFIG",
      resourceId: saved.id,
      before: before ? { baseUrl: before.baseUrl, selectedModel: before.selectedModel, reasoningEffort: before.reasoningEffort, timeoutMs: before.timeoutMs, enabled: before.enabled } : null,
      after: { baseUrl: saved.baseUrl, selectedModel: saved.selectedModel, reasoningEffort: saved.reasoningEffort, timeoutMs: saved.timeoutMs, enabled: saved.enabled },
    });
    return NextResponse.json({ data: buildPublicAiConfig(saved) });
  } catch (error) {
    const message = error instanceof z.ZodError ? "配置格式不正确" : error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: "validation_error", message }, { status: 400 });
  }
}
