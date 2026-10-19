import jwt from "jsonwebtoken";

/**
 * New API bridge assertion verifier.
 * The bridge is opt-in: without UNIFIED_AUTH_SECRET the endpoint is disabled.
 * Assertions identify an existing canvas account by email; account creation and
 * merge decisions remain explicit operations, never an implicit side effect.
 */
export function verifyUnifiedAssertion(assertion) {
    const secret = process.env.UNIFIED_AUTH_SECRET;
    if (!secret || secret.length < 16 || !assertion) return null;
    try {
        const payload = jwt.verify(String(assertion), secret, { algorithms: ["HS256"] });
        const email = String(payload?.email || "").trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        return {
            email,
            subject: String(payload.sub || ""),
            audience: String(payload.aud || ""),
            purpose: String(payload.purpose || ""),
            jti: String(payload.jti || ""),
        };
    } catch {
        return null;
    }
}
