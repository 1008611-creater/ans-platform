import { auth } from "@/lib/auth";
import { communityFailure, communityJson } from "../../response";
import { equipGrowthReward } from "@/server/growth/service";
import { readSameOriginJson } from "@/server/http/json";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const body = await readSameOriginJson(request) as { kind?: "avatar-frame" | "chat-bubble"; key?: string };
    if ((body.kind !== "avatar-frame" && body.kind !== "chat-bubble") || !body.key) return communityJson({ error: "INVALID_INPUT" }, 400);
    return communityJson(await equipGrowthReward(session.user.id, body.kind, body.key));
  } catch (error) {
    if (error instanceof Error && error.message === "REWARD_LOCKED") return communityJson({ error: "REWARD_LOCKED" }, 403);
    if (error instanceof Error && error.message === "REWARD_NOT_FOUND") return communityJson({ error: "REWARD_NOT_FOUND" }, 404);
    return communityFailure(error);
  }
}
