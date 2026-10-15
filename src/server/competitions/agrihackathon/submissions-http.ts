import { agriWallErrorCode } from "./wall-http";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok } from "@/server/http/respond";
import { HttpRequestError } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
export async function agriSubmissionResponse<T>(request: Request, run: (actorId: string) => Promise<T>, present?: (data: T) => Response) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AgriWorkspaceError("UNAUTHORIZED", 401);
    if (request.headers.get("x-ans-submission-actor") !== session.user.id) throw new AgriWorkspaceError("ACCOUNT_CHANGED", 409);
    const data = await run(session.user.id);
    return present ? present(data) : ok(data);
  } catch (error) {
    if (error instanceof ZodError) return fail("INVALID_INPUT", "INVALID_INPUT", { status: 400 });
    if (error instanceof AgriWorkspaceError || error instanceof HttpRequestError) return fail(error.code, error.code, { status: error.status });
    const guard = agriWallErrorCode(error);
    if (guard) return fail(guard, guard, { status: 409 });
    return fail("INTERNAL_ERROR", "INTERNAL_ERROR", { status: 500 });
  }
}
