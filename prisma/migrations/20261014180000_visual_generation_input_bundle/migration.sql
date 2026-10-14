-- Extend the existing immutable upload intent to private text/multiview envelopes.
-- Existing image paths, request hashes and expiry guards remain valid.
ALTER TABLE visual_input_uploads DROP CONSTRAINT visual_input_upload_valid;
ALTER TABLE visual_input_uploads ADD CONSTRAINT visual_input_upload_valid CHECK (
 "inputKey" IN ('visual/' || id::text || '/input.png','visual/' || id::text || '/input.jpg','visual/' || id::text || '/input.webp','visual/' || id::text || '/input.json') AND
 "requestHash" ~ '^[a-f0-9]{64}$' AND "idempotencyKey" ~ '^[A-Za-z0-9_-]{16,80}$' AND "expiresAt" > "createdAt"
);
