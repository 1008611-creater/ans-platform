import { requireTemplateAuthor, templateErrorResponse } from "@/lib/template-access";
import { listOwnTemplates } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export async function GET(_request: Request) {
  try {
    const user = await requireTemplateAuthor();
    return Response.json({ templates: await listOwnTemplates(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return templateErrorResponse(error); }
}
