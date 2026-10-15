import { RateLimiter } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { uploadEvidence } from "@/server/competitions/agrihackathon/evidence-worker";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 900;
const writes = new RateLimiter({ max: 6, windowSeconds: 60 });
export async function PUT(request: Request, { params }: {
    params: Promise<{
        intentId: string;
    }>;
}) { return agriSubmissionResponse(request, async (actor) => { assertSameOrigin(request); if (!writes.check(actor).allowed)
    throw new AgriWorkspaceError("RATE_LIMITED", 429); return uploadEvidence(actor, (await params).intentId, request); }); }
