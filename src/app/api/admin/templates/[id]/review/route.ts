import { requireTemplateAdmin, templateErrorResponse, templateJson } from "@/lib/template-access";
import { reviewTemplateManually } from "@/lib/template-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireTemplateAdmin();
    const { id } = await context.params;
    return Response.json({ template: await reviewTemplateManually(id, admin.userId, await templateJson(request)) });
  } catch (error) { return templateErrorResponse(error); }
}
