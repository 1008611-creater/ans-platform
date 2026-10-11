import { assertSameOrigin } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { checkIn } from "@/lib/community";
import { communityFailure, communityJson } from "../response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    assertSameOrigin(request);
    return communityJson(await checkIn(session.user.id));
  } catch (error) {
    return communityFailure(error);
  }
}
