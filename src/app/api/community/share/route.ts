import { readSameOriginJson } from "@/server/http/json";
import { auth } from "@/lib/auth";
import { communityFailure, communityJson } from "../response";
import { recordGrowthShare, type GrowthShareTarget } from "@/server/growth/service";

const TARGETS = new Set<GrowthShareTarget>(["prompt", "artifact", "project"]);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    const body = await readSameOriginJson(request) as { targetType?: string; targetId?: string };
    if (!body.targetType || !TARGETS.has(body.targetType as GrowthShareTarget) || typeof body.targetId !== "string") {
      return communityJson({ error: "INVALID_INPUT" }, 400);
    }
    const result = await recordGrowthShare(session.user.id, body.targetType as GrowthShareTarget, body.targetId);
    return communityJson({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SHARE_TARGET") return communityJson({ error: "INVALID_INPUT" }, 400);
    if (error instanceof Error && error.message === "SHARE_TARGET_NOT_PUBLIC") return communityJson({ error: "SHARE_TARGET_NOT_PUBLIC" }, 404);
    return communityFailure(error);
  }
}
