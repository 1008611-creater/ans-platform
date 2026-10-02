import { auth } from "@/lib/auth";
import { ok, respondWithError } from "@/server/http/respond";
import { getCompetition } from "@/server/competitions/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  try { return ok({ competition: await getCompetition(id, session?.user?.id) }); }
  catch (error) { return respondWithError(error); }
}
