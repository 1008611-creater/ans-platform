import { auth } from "@/lib/auth";
import { getContributions } from "@/lib/community";
import { communityFailure, communityJson } from "../response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    return communityJson(await getContributions(session.user.id));
  } catch (error) {
    return communityFailure(error);
  }
}
