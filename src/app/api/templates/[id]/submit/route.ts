import { requireTemplateAuthor, templateErrorResponse } from "@/lib/template-access";
import { submitTemplate } from "@/lib/template-service";

export const maxDuration = 30;
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTemplateAuthor();
    const { id } = await context.params;
    return Response.json({ template: await submitTemplate(id, user.id) });
  } catch (error) { return templateErrorResponse(error); }
}
