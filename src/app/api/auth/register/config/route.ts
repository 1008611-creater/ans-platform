import { ensureRegistrationEnabled, registrationErrorResponse } from "@/lib/registration";
import { issueFallbackRegistrationChallenge } from "@/lib/registration-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  try {
    const { siteKey } = await ensureRegistrationEnabled();
    const isFallback = request?.url ? new URL(request.url, "http://localhost").searchParams.get("fallback") === "1" : false;
    if (isFallback) {
      return Response.json(
        { siteKey, fallbackToken: issueFallbackRegistrationChallenge() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({ siteKey }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
