import { readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { runFollowAction } from "@/server/community/follows";
import { communityFailure, communityJson } from "../response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const result = await runFollowAction(session.user.id, await readSameOriginJson(request, 2_000));
    return communityJson({ ok: true, ...result });
  } catch (error) {
    return communityFailure(error);
  }
}
