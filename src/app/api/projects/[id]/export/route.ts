import { auth } from "@/lib/auth";
import { fail, respondWithError } from "@/server/http/respond";
import { exportProject } from "@/server/projects/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  try {
    const { id } = await params;
    const file = await exportProject(id, session.user.id);
    return new Response(file.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return respondWithError(error);
  }
}
