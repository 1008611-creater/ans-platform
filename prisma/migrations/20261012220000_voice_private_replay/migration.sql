-- Keep the existing APIC quote branch byte-for-byte in meaning; add only approved zero-price TTS.
SET lock_timeout = '10s';
ALTER TABLE "api_compute_requests" DROP CONSTRAINT "api_compute_request_quote_valid";
ALTER TABLE "api_compute_requests" ADD CONSTRAINT "api_compute_request_quote_valid" CHECK (COALESCE(
  "requestHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("price") = 'object' AND (
    ("provider" = 'apic-codex' AND "modelId" IN ('deepseek-v4.1-flash','gpt-6-astra','gpt-6.1-sol')
     AND "maxUnits" BETWEEN 1 AND 16384 AND "authorizedPoints" > 0 AND "authorizedPoints" <= 10)
    OR
    ("provider" = 'mimo-tts' AND "modelId" = 'mimo-v2.5-tts' AND "maxUnits" BETWEEN 1 AND 1200
     AND "authorizedPoints" = 0 AND "policyVersion" ~ '^mimo-tts-free-reviewed-[0-9]{8}-v[0-9]+$'
     AND "idempotencyKey" ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
     AND "price"->>'mode' = 'free' AND "price"->'points' = '0'::jsonb
     AND "price"->'providerListedPrice' = '0'::jsonb AND "price"->>'version' = "policyVersion"
     AND "price"->>'source' = 'https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go'
     AND "price"->>'voice' = 'Chloe' AND "price"->>'unit' = 'unicode-character'
     AND jsonb_typeof("price"->'checkedAt') = 'string' AND jsonb_typeof("price"->'reviewBy') = 'string')
  ), false));
ALTER TABLE "api_compute_requests" ADD CONSTRAINT "api_compute_voice_zero_settlement" CHECK (
  "provider" <> 'mimo-tts' OR "settledPoints" IS NULL OR "settledPoints" = 0
);
CREATE TABLE "voice_results" (
    "requestId" TEXT NOT NULL,
    "audio" BYTEA NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'audio/wav',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voice_results_pkey" PRIMARY KEY ("requestId"),
    CONSTRAINT "voice_results_size_check" CHECK ("byteLength" = octet_length("audio") AND "byteLength" BETWEEN 44 AND 16777216),
    CONSTRAINT "voice_results_type_check" CHECK ("contentType" = 'audio/wav'),
    CONSTRAINT "voice_results_hash_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "voice_results_expiry_check" CHECK ("expiresAt" > "createdAt"),
    CONSTRAINT "voice_results_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "api_compute_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "voice_results_expiresAt_idx" ON "voice_results"("expiresAt");

CREATE FUNCTION ans_protect_voice_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW."requestId",NEW."audio",NEW."byteLength",NEW."sha256",NEW."contentType",NEW."createdAt")
       IS DISTINCT FROM ROW(OLD."requestId",OLD."audio",OLD."byteLength",OLD."sha256",OLD."contentType",OLD."createdAt")
       OR NEW."expiresAt" > OLD."expiresAt" THEN
      RAISE EXCEPTION 'VOICE_RESULT_IMMUTABLE';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM "api_compute_requests" WHERE id = NEW."requestId"
       AND provider = 'mimo-tts' AND state = 'SETTLED' AND "settledPoints" = 0) THEN
      RAISE EXCEPTION 'VOICE_REQUEST_NOT_SETTLED';
    END IF;
    IF NEW."expiresAt" > NEW."createdAt" + INTERVAL '24 hours 1 minute' THEN
      RAISE EXCEPTION 'VOICE_RETENTION_TOO_LONG';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER voice_result_guard BEFORE INSERT OR UPDATE ON "voice_results"
  FOR EACH ROW EXECUTE FUNCTION ans_protect_voice_result();
