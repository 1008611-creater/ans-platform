import { requireTemplateAdmin, templateErrorResponse } from "@/lib/template-access";
import { listTemplateQueue } from "@/lib/template-service";

export const dynamic = "force-dynamic";
export async function GET(_request: Request) {
  try {
    await requireTemplateAdmin();
    return Response.json({ templates: await listTemplateQueue() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return templateErrorResponse(error); }
}
