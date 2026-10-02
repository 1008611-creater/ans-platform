import { ok, respondWithError } from "@/server/http/respond";
import { listCompetitions } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return ok({ competitions: await listCompetitions() }); }
  catch (error) { return respondWithError(error); }
}

