import { readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { runBottleAction } from "@/server/community/bottles";
import { communityFailure, communityJson } from "../../response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const { id } = await params;
    const result = await runBottleAction(session.user.id, id, await readSameOriginJson(request, 4_000));
    return communityJson({ ok: true, ...result });
  } catch (error) {
    return communityFailure(error);
  }
}
