import { requireTemplateAuthor, templateErrorResponse, templateJson } from "@/lib/template-access";
import { editTemplate, getPublishedTemplate } from "@/lib/template-service";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const template = await getPublishedTemplate(id);
    return template ? Response.json({ template }) : Response.json({ error: "模板不存在" }, { status: 404 });
  } catch (error) { return templateErrorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireTemplateAuthor();
    const { id } = await context.params;
    return Response.json({ template: await editTemplate(id, user.id, await templateJson(request)) });
  } catch (error) { return templateErrorResponse(error); }
}
