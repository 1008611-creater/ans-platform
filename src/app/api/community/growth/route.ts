import { assertRequestActor } from "@/server/http/json";
﻿import { auth } from "@/lib/auth";
import { communityFailure, communityJson } from "../response";
import { getGrowthProfile } from "@/server/growth/service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return communityJson({ error: "UNAUTHORIZED" }, 401);
    assertRequestActor(request, session.user.id);
    const profile = await getGrowthProfile(session.user.id);
    if (!profile) return communityJson({ error: "NOT_FOUND" }, 404);
    return communityJson(profile);
  } catch (error) { return communityFailure(error); }
}
