import { assertRequestActor } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { getCommunityMe } from "@/lib/community";
import { communityFailure, communityJson } from "../response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    assertRequestActor(request, session.user.id);
    return communityJson(await getCommunityMe(session.user.id));
  } catch (error) {
    return communityFailure(error);
  }
}
