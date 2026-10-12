import { runReviewedRecipe, listReviewedRecipeRuns } from "@/server/marketplace/workflows";
import { marketJson, marketResponse, marketUser } from "@/server/marketplace/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return marketResponse(async () => { const actor = await marketUser(request); const { slug } = await params; return runReviewedRecipe(slug, actor, await marketJson(request)); }, 202);
}
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return marketResponse(async () => { const actor = await marketUser(request); const { slug } = await params; return listReviewedRecipeRuns(slug, actor); });
}
