-- Additive, compatible with existing jobs. Does not rewrite balances or artifacts.
ALTER TABLE visual_model_jobs ADD COLUMN "inputDeletedAt" TIMESTAMP(3);
ALTER TABLE visual_model_jobs ADD CONSTRAINT visual_input_deleted_terminal CHECK ("inputDeletedAt" IS NULL OR status IN ('SUCCEEDED','FAILED','CANCELLED'));
CREATE TABLE visual_input_uploads (
 id UUID PRIMARY KEY,
 "ownerId" TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 "inputKey" VARCHAR(240) NOT NULL UNIQUE,
 "requestHash" VARCHAR(64) NOT NULL,
 "idempotencyKey" VARCHAR(80) NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "storageMode" VARCHAR(8) NOT NULL CHECK ("storageMode" IN ('local','s3')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT visual_input_upload_valid CHECK (
  "inputKey" IN ('visual/' || id::text || '/input.png','visual/' || id::text || '/input.jpg','visual/' || id::text || '/input.webp') AND
  "requestHash" ~ '^[a-f0-9]{64}$' AND "idempotencyKey" ~ '^[A-Za-z0-9_-]{16,80}$' AND "expiresAt" > "createdAt"
 )
);
CREATE FUNCTION ans_visual_input_upload_preserve() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'VISUAL_INPUT_UPLOAD_IMMUTABLE';
END;
$$;
CREATE TRIGGER visual_input_upload_preserve BEFORE UPDATE ON visual_input_uploads FOR EACH ROW EXECUTE FUNCTION ans_visual_input_upload_preserve();
CREATE FUNCTION ans_visual_input_preserve() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.id,NEW."ownerId",NEW."inputKey",NEW."inputMime") IS DISTINCT FROM ROW(OLD.id,OLD."ownerId",OLD."inputKey",OLD."inputMime") THEN RAISE EXCEPTION 'VISUAL_INPUT_IDENTITY_IMMUTABLE'; END IF;
 IF OLD."inputDeletedAt" IS NOT NULL AND NEW."inputDeletedAt" IS DISTINCT FROM OLD."inputDeletedAt" THEN RAISE EXCEPTION 'VISUAL_INPUT_CLEANUP_IMMUTABLE'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER visual_input_preserve BEFORE UPDATE ON visual_model_jobs FOR EACH ROW EXECUTE FUNCTION ans_visual_input_preserve();
