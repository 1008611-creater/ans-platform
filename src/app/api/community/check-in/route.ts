import { auth } from "@/lib/auth";
import { checkIn } from "@/lib/community";
import { communityFailure, communityJson } from "../response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
      return communityJson({ error: "INVALID_ORIGIN" }, 403);
    }
    return communityJson(await checkIn(session.user.id));
  } catch (error) {
    return communityFailure(error);
  }
}
