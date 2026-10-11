import { HttpRequestError, readSameOriginJson } from "@/server/http/json";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok } from "@/server/http/respond";
import { QuotaError } from "@/server/quota/service";
import { MarketRuleError } from "@/domain/marketplace/order";

export async function marketUser() {
  const session = await auth();
  if (!session?.user?.id) throw new MarketRuleError("UNAUTHORIZED", 401);
  return session.user.id;
}

export async function marketJson(request: Request): Promise<unknown> {
  try { return await readSameOriginJson(request); }
  catch (error) {
    if (error instanceof HttpRequestError) throw new MarketRuleError(error.code, error.status);
    throw error;
  }
}

export async function marketResponse(run: () => Promise<unknown>, status = 200) {
  try { return ok(await run(), { status }); }
  catch (error) {
    // Return stable codes only. Never expose query text, credentials or provider errors.
    const code = error instanceof QuotaError ? error.code : error instanceof MarketRuleError ? error.code : error instanceof ZodError ? "INVALID_INPUT" : "INTERNAL_ERROR";
    return fail(code, code, { status: error instanceof QuotaError || error instanceof MarketRuleError ? error.status : error instanceof ZodError ? 400 : 500 });
  }
}
