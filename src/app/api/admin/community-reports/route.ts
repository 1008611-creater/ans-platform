import { readSameOriginJson } from "@/server/http/json";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { reviewCommunityReport } from "@/server/community/moderation";
import { communityFailure, communityJson } from "@/app/api/community/response";

export async function POST(request: Request) {
  try {
    const context = await requireAdminPermission("REPORTS_MANAGE");
    if (!context) return communityJson({ error: "FORBIDDEN" }, 403);
    const result = await reviewCommunityReport(context.userId, await readSameOriginJson(request, 2_000));
    return communityJson({ ok: true, ...result });
  } catch (error) {
    return communityFailure(error);
  }
}
