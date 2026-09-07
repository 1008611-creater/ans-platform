import { requireTemplateAuthor, templateErrorResponse, templateJson } from "@/lib/template-access";
import { createTemplate, listPublishedTemplates } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const templates = await listPublishedTemplates({ domain: params.get("domain") || undefined, scene: params.get("scene") || undefined, page: Number(params.get("page")) || 1 });
    return Response.json({ templates });
  } catch (error) { return templateErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireTemplateAuthor();
    const template = await createTemplate(user.id, await templateJson(request));
    return Response.json({ template }, { status: 201 });
  } catch (error) { return templateErrorResponse(error); }
}
