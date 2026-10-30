import { readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { createCommunityPost } from "@/server/community/posts";
import { communityFailure, communityJson } from "../response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const post = await createCommunityPost(session.user.id, await readSameOriginJson(request, 20_000));
    return communityJson({ ok: true, id: post.id }, 201);
  } catch (error) {
    return communityFailure(error);
  }
}
