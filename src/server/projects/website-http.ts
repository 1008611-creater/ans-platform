import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { fail, ok, isCodedError, requestId } from "@/server/http/respond";
import { ResumeWebsiteError } from "./resume-website";

export async function websiteResponse(run: (userId: string) => Promise<unknown>, status = 200) {
  const id = requestId();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ResumeWebsiteError("UNAUTHORIZED", 401);
    const result = await run(session.user.id);
    return result instanceof Response ? result : ok(result, { status, requestId: id });
  } catch (error) {
    const code = error instanceof ZodError ? "INVALID_INPUT" : isCodedError(error) ? error.code ?? "INTERNAL_ERROR" : "INTERNAL_ERROR";
    const errorStatus = error instanceof ZodError ? 400 : isCodedError(error) ? error.status : 500;
    if (errorStatus === 500) {
      const candidate = error instanceof Error && "code" in error ? error.code : undefined;
      const databaseCode = typeof candidate === "string" && /^P\d{4}$/.test(candidate) ? candidate : "UNKNOWN";
      console.error("ANS website request failed.", { requestId: id, databaseCode });
    }
    return fail(code, code, { status: errorStatus, requestId: id });
  }
}
