import { readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { pickBottle, throwBottle } from "@/server/community/bottles";
import { communityFailure, communityJson } from "../response";

/** `{ action: "throw", body }` 扔一个瓶子，`{ action: "pick" }` 随机捞一个。 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const body = await readSameOriginJson(request, 4_000) as { action?: unknown } | null;
    if (body?.action === "throw") {
      const bottle = await throwBottle(session.user.id, body);
      return communityJson({ ok: true, id: bottle.id }, 201);
    }
    if (body?.action === "pick") return communityJson({ ok: true, ...(await pickBottle(session.user.id)) });
    return communityJson({ error: "INVALID_INPUT" }, 400);
  } catch (error) {
    return communityFailure(error);
  }
}
