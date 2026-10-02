import { respondWithError, ok } from "@/server/http/respond";
import { getPublishedArtifact } from "@/server/projects/publication";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { return ok({ artifact: await getPublishedArtifact(id) }); }
  catch (error) { return respondWithError(error); }
}
