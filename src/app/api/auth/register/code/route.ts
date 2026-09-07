import { ensureRegistrationEnabled, readRegistrationBody, sendRegistrationCode, registrationErrorResponse } from "@/lib/registration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureRegistrationEnabled();
    const result = await sendRegistrationCode(await readRegistrationBody(request));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
