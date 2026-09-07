import { ensureRegistrationEnabled, readRegistrationBody, registerWithCode, registrationErrorResponse } from "@/lib/registration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureRegistrationEnabled();
    const user = await registerWithCode(await readRegistrationBody(request));
    return Response.json(user, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
