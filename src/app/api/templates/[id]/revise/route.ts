import { requireTemplateAuthor, templateErrorResponse } from "@/lib/template-access";
import { revisePublishedTemplate } from "@/lib/template-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTemplateAuthor();
    const { id } = await context.params;
    return Response.json({ template: await revisePublishedTemplate(id, user.id) }, { status: 201 });
  } catch (error) { return templateErrorResponse(error); }
}
