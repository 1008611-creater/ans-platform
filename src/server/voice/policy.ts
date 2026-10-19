import type { VoiceOffer } from "@/contracts/voice";

export const VOICE_PROVIDER = "mimo-tts";
export const VOICE_MODEL = "mimo-v2.5-tts";
export const VOICE_POLICY = {
  version: "mimo-tts-paid-reviewed-20261019-v2",
  source: "https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go",
  checkedAt: "2026-10-19T00:00:00.000Z",
  reviewBy: "2027-12-31T23:59:59.000Z",
  points: 1,
  providerListedPrice: 0.03,
  mode: "paid",
} as const;
// reviewBy is ANS's review deadline, not an invented supplier promotion end date.
export const VOICE_CACHE_MS = 24 * 60 * 60 * 1000;
export const VOICE_MAX_BYTES = 16 * 1024 * 1024;
export const VOICE_STORAGE_CAP = 512 * 1024 * 1024;
export const VOICE_TIMEOUT_MS = 45_000;
export function voiceOffer(now = new Date()): VoiceOffer {
  const available = process.env.ANS_TTS_POINTS_AUDIT_ENABLED === "1"
    && !!process.env.MIMO_API_KEY?.trim()
    && (!process.env.MIMO_TTS_MODEL || process.env.MIMO_TTS_MODEL === VOICE_MODEL)
    && now.getTime() >= Date.parse(VOICE_POLICY.checkedAt)
    && now.getTime() < Date.parse(VOICE_POLICY.reviewBy);
  return { available, mode: VOICE_POLICY.mode, points: VOICE_POLICY.points, modelId: VOICE_MODEL,
    policyVersion: VOICE_POLICY.version, checkedAt: VOICE_POLICY.checkedAt,
    reviewBy: VOICE_POLICY.reviewBy, cacheHours: 24, maxCharacters: 1200 };
}
