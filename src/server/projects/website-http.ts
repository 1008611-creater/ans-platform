import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok, isCodedError } from "@/server/http/respond";
import { ResumeWebsiteError } from "./resume-website";

export async function websiteResponse(run: (userId: string) => Promise<unknown>, status = 200) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ResumeWebsiteError("UNAUTHORIZED", 401);
    const result = await run(session.user.id);
    return result instanceof Response ? result : ok(result, { status });
  } catch (error) {
    const code = error instanceof ZodError ? "INVALID_INPUT" : isCodedError(error) ? error.code ?? "INTERNAL_ERROR" : "INTERNAL_ERROR";
    return fail(code, code, { status: error instanceof ZodError ? 400 : isCodedError(error) ? error.status : 500 });
  }
}
