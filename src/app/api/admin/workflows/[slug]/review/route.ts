import { z } from "zod";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { reviewWorkflow } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

const reviewSchema = z
  .object({
    action: z.enum(["publish", "reject"]),
    note: z.string().trim().min(1).max(2000),
  })
  .strict();

/** POST /api/admin/workflows/[slug]/review —— 人工审核工作流。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) return fail("FORBIDDEN", "需要内容管理权限。", { status: 403 });
  try {
    const parsed = reviewSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail("INVALID_INPUT", "请选择发布或驳回，并填写复核理由。", { status: 400 });
    const { slug } = await params;
    const workflow = await reviewWorkflow(slug, admin.userId, parsed.data);
    return ok({ workflow });
  } catch (error) {
    return respondWithError(error);
  }
}
