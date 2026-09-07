import { requireTemplateAdmin, templateErrorResponse } from "@/lib/template-access";
import { recheckTemplate } from "@/lib/template-service";

export const maxDuration = 30;
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireTemplateAdmin();
    const { id } = await context.params;
    return Response.json({ template: await recheckTemplate(id, admin.userId) });
  } catch (error) { return templateErrorResponse(error); }
}
