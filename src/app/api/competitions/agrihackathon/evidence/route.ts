import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { createEvidence, executeEvidenceCommand, listEvidence } from "@/server/competitions/agrihackathon/evidence";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const writes = new RateLimiter({ max: 20, windowSeconds: 60 });
export async function GET(request: Request) { return agriSubmissionResponse(request, actor => listEvidence(actor, Object.fromEntries(new URL(request.url).searchParams))); }
export async function POST(request: Request) { return agriSubmissionResponse(request, async (actor) => { if (!writes.check(actor).allowed)
    throw new AgriWorkspaceError("RATE_LIMITED", 429); if (Number(request.headers.get("content-length")) > 32768)
    throw new AgriWorkspaceError("REQUEST_TOO_LARGE", 413); const input = await readSameOriginJson(request, 32768); return input && typeof input === "object" && "action" in input && input.action === "create" ? createEvidence(actor, input) : executeEvidenceCommand(actor, input); }); }
