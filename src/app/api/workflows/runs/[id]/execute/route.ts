import { auth } from "@/lib/auth";
import { fail, ok, respondWithError } from "@/server/http/respond";
import { executePersistedWorkflow } from "@/server/workflows/runner";
import { z } from "zod";
import { RUN_REASONING_EFFORTS } from "@/lib/run-models";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 本次运行的模型覆盖项。两者都可省略：省略时用节点定义里的值，
 * 再缺省则回退平台模型池默认模型。
 */
const executeOptionsSchema = z
  .object({
    modelKey: z.string().trim().min(1).max(80).optional(),
    credentialId: z.string().trim().min(1).max(80).optional(),
    reasoningEffort: z.enum(RUN_REASONING_EFFORTS).optional(),
  })
  .strict();

async function readOptions(request: Request) {
  const raw = await request.text();
  if (!raw.trim()) return {};
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw);
  } catch {
    throw Object.assign(new SyntaxError("请求体不是有效 JSON。"), {
      status: 400,
      code: "INVALID_JSON",
    });
  }
  const parsed = executeOptionsSchema.safeParse(parsedBody ?? {});
  if (!parsed.success) {
    throw Object.assign(new Error("运行参数不正确。"), { status: 400, code: "INVALID_INPUT" });
  }
  return parsed.data;
}

/** POST /api/workflows/runs/[id]/execute —— 同步执行一次已创建的运行。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    const options = await readOptions(request);
    const result = await executePersistedWorkflow(id, session.user.id, options);
    if (!result) {
      return fail("NOT_FOUND", "运行记录不存在或已开始执行。", { status: 404 });
    }
    return ok({ result });
  } catch (error) {
    return respondWithError(error, "工作流执行失败。");
  }
}
