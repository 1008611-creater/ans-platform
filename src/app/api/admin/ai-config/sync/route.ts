import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { getAdminAiConfig, normalizeModelList, saveAdminAiConfig, syncAdminAiModels, syncAdminAiModelsWithKey, validateAiBaseUrl } from "@/server/admin/ai-config";

export async function POST(request: Request) {
  const context = await requireAdminPermission("PROMPTS_MANAGE");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const current = await getAdminAiConfig();
    const body = await request.json().catch(() => ({})) as { baseUrl?: unknown; apiKey?: unknown };
    const requestBaseUrl = typeof body.baseUrl === "string" && body.baseUrl.trim() ? validateAiBaseUrl(body.baseUrl) : null;
    const requestApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!current && (!requestBaseUrl || !requestApiKey)) return NextResponse.json({ error: "not_configured", message: "请先填写 API 地址和 API Key" }, { status: 400 });
    if (current && requestBaseUrl && requestBaseUrl !== current.baseUrl && !requestApiKey) {
      return NextResponse.json({ error: "key_required", message: "更换 API 地址时请重新填写对应的 API Key" }, { status: 400 });
    }
    const models = normalizeModelList(requestBaseUrl && requestApiKey
      ? await syncAdminAiModelsWithKey({ baseUrl: requestBaseUrl, apiKey: requestApiKey })
      : await syncAdminAiModels(current!));
    if (!current) return NextResponse.json({ data: { availableModels: models, selectedModel: models[0] }, count: models.length });
    const selectedModel = models.includes(current.selectedModel) ? current.selectedModel : models[0];
    const saved = await saveAdminAiConfig({
      baseUrl: current.baseUrl,
      selectedModel,
      availableModels: models,
      reasoningEffort: current.reasoningEffort as "none" | "low" | "medium" | "high",
      timeoutMs: current.timeoutMs,
      enabled: current.enabled,
    }, context.userId);
    await writeAuditLog({ actorId: context.userId, action: "ADMIN_AI_MODELS_SYNC", resourceType: "ADMIN_AI_CONFIG", resourceId: saved.id, after: { count: models.length, selectedModel } });
    const { buildPublicAiConfig } = await import("@/server/admin/ai-config");
    return NextResponse.json({ data: buildPublicAiConfig(saved), count: models.length });
  } catch (error) {
    return NextResponse.json({ error: "sync_failed", message: error instanceof Error ? error.message : "模型同步失败" }, { status: 502 });
  }
}
