import type { VoiceOffer } from "@/contracts/voice";

export const VOICE_PROVIDER = "mimo-tts";
export const VOICE_MODEL = "mimo-v2.5-tts";
export const VOICE_POLICY = {
  version: "mimo-tts-free-reviewed-20261012-v1",
  source: "https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go",
  checkedAt: "2026-10-12T14:52:28.000Z",
  reviewBy: "2026-10-19T14:52:28.000Z",
  points: 0,
  providerListedPrice: 0,
  mode: "free",
} as const;
// reviewBy is ANS's review deadline, not an invented supplier promotion end date.
// There is deliberately no configurable charge or model fallback for this free policy.
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
  return { available, mode: "free", points: 0, modelId: VOICE_MODEL,
    policyVersion: VOICE_POLICY.version, checkedAt: VOICE_POLICY.checkedAt,
    reviewBy: VOICE_POLICY.reviewBy, cacheHours: 24, maxCharacters: 1200 };
}
