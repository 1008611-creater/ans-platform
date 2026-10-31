import { auth } from "@/lib/auth";
import { searchRemixProjects } from "@/server/community/remix";
import { communityFailure, communityJson } from "../response";

export const dynamic = "force-dynamic";

/** 发帖弹窗「附项目」的搜索：只返回已上架项目的 slug 和标题。 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const query = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 40);
    return communityJson({ projects: await searchRemixProjects(query) });
  } catch (error) {
    return communityFailure(error);
  }
}
