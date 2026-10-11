import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok } from "@/server/http/respond";
import { HttpRequestError } from "@/server/http/json";
import { CatalogError } from "./service";
export async function catalogUser() {
  const session = await auth();
  if (!session?.user?.id) throw new CatalogError("UNAUTHORIZED", 401);
  return session.user.id;
}
export async function catalogResponse(run: () => Promise<unknown>) {
  try { return ok(await run()); }
  catch (error) {
    const known = error instanceof CatalogError || error instanceof HttpRequestError;
    const code = known ? error.code : error instanceof ZodError ? "INVALID_INPUT" : "INTERNAL_ERROR";
    return fail(code, code, { status: known ? error.status : error instanceof ZodError ? 400 : 500 });
  }
}