import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok } from "@/server/http/respond";
import { HttpRequestError } from "@/server/http/json";
import { AgriTaskError } from "./error";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";

export async function agriTaskResponse(request: Request, run: (actorId: string) => Promise<unknown>) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AgriTaskError("UNAUTHORIZED", 401);
    if (request.headers.get("x-ans-task-actor") !== session.user.id) throw new AgriTaskError("ACCOUNT_CHANGED", 409);
    return ok(await run(session.user.id));
  } catch (error) {
    if (error instanceof ZodError) return fail("INVALID_INPUT", "INVALID_INPUT", { status: 400 });
    if (error instanceof AgriTaskError || error instanceof AgriWorkspaceError || error instanceof HttpRequestError) return fail(error.code, error.code, { status: error.status });
    // Never serialize database errors or private task data.
    return fail("INTERNAL_ERROR", "INTERNAL_ERROR", { status: 500 });
  }
}
