import { ok, respondWithError } from "@/server/http/respond";
import { listPublishedArtifacts } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return ok({ artifacts: await listPublishedArtifacts() }); }
  catch (error) { return respondWithError(error); }
}
