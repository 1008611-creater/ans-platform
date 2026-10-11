-- Preserve a corroborated late task after an erroneous human refund.
-- creditReturned is historical: recovering a task never debits the member twice.
ALTER TABLE "media_generations" DROP CONSTRAINT "media_generations_returned_state";
ALTER TABLE "media_generations" ADD CONSTRAINT "media_generations_returned_state"
  CHECK (NOT "creditReturned" OR "status" IN ('FAILED', 'ACCEPTED'));
