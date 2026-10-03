import { auth } from "@/lib/auth";
import { authorizeHandler } from "@/server/oidc/provider";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  return authorizeHandler(request, session?.user?.id ?? null);
}
