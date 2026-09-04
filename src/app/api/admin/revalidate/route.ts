import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";

/**
 * 手动刷新 Next 数据缓存。
 *
 * 背景：`unstable_cache` 的条目只靠 `revalidateTag` 或过期时间失效，而技能导入脚本
 * （scripts/import-ai-video-skills.ts）是在 Next 进程之外直接写库的，无法调用
 * revalidateTag。因此提供一个受保护的接口，导入完成后由脚本 curl 本接口主动失效缓存。
 *
 * 鉴权（二选一）：
 *   1. 已登录的 ADMIN 会话；
 *   2. 请求头 `x-revalidate-token` 等于环境变量 `REVALIDATE_TOKEN`（适合容器内脚本调用）。
 *
 * 请求体：{ "tags": ["prompts", "categories"], "paths": ["/skills"] }
 * 两个字段都可省略；省略 tags 时刷新默认标签集合，省略 paths 时不刷新路径。
 */

const DEFAULT_TAGS = ["prompts", "categories", "tags", "prompt-flow"];

export async function POST(request: NextRequest) {
  try {
    const token = process.env.REVALIDATE_TOKEN;
    const provided = request.headers.get("x-revalidate-token");
    const tokenOk = !!token && !!provided && provided === token;

    if (!tokenOk) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let tags: string[] = DEFAULT_TAGS;
    let paths: string[] = [];

    try {
      const body = await request.json();
      if (Array.isArray(body?.tags) && body.tags.length) {
        tags = body.tags.filter((t: unknown): t is string => typeof t === "string");
      }
      if (Array.isArray(body?.paths)) {
        paths = body.paths.filter((p: unknown): p is string => typeof p === "string");
      }
    } catch {
      // 允许空 body：使用默认标签集合
    }

    for (const tag of tags) revalidateTag(tag, "max");
    for (const p of paths) revalidatePath(p);

    return NextResponse.json({ revalidated: true, tags, paths });
  } catch (error) {
    console.error("revalidate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: "POST { tags?: string[]; paths?: string[] } with x-revalidate-token or an ADMIN session",
    defaultTags: DEFAULT_TAGS,
  });
}
