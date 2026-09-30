import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import {
  buildPublicAiConfig,
  getAdminAiConfig,
  normalizeModelList,
  REVIEW_REASONING_EFFORTS,
  saveAdminAiConfigWithAudit,
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
    const saved = await saveAdminAiConfigWithAudit({
      ...body,
      availableModels: normalizeModelList(body.availableModels),
    }, context.userId);
    return NextResponse.json({ data: buildPublicAiConfig(saved) });
  } catch (error) {
    const message = error instanceof z.ZodError ? "配置格式不正确" : error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: "validation_error", message }, { status: 400 });
  }
}
