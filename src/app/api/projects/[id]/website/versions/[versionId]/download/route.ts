import { websiteResponse } from "@/server/projects/website-http";
import { downloadResumeWebsite } from "@/server/projects/resume-website";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  return websiteResponse(async (userId) => {
    const { id, versionId } = await params;
    const file = await downloadResumeWebsite(id, userId, versionId);
    return new Response(file.html, { headers: {
      "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    } });
  });
}
