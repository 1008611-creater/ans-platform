import { ensureRegistrationEnabled, registrationErrorResponse } from "@/lib/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { siteKey } = await ensureRegistrationEnabled();
    return Response.json({ siteKey }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
