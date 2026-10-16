CREATE FUNCTION fixture_assert(valid boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(valid,false) THEN RAISE EXCEPTION 'fixture assertion: %',label; END IF; END $$;
CREATE FUNCTION fixture_snapshot(model_id text,retail numeric,receipt numeric) RETURNS jsonb LANGUAGE SQL AS $$ SELECT jsonb_build_object(
 'version','usd-cny-points-v2','configVersion','isolated-fixture-v2','modelId',model_id,'pointsPerCny',10,'requestMaxPoints',100,
 'fx',jsonb_build_object('usdCny',7,'source','https://fixture.invalid/fx','observedAt','2026-10-15T00:00:00Z'),
 'consumptionMultiplier',retail,'receiptConsumptionMultiplier',receipt,'procurementMultiplier',CASE WHEN model_id='claude-opus-5-5' THEN .8 ELSE 1 END,
 'reserveRatesUsdPerMillion',jsonb_build_object('input',1,'output',1),
 'priceEvidence',jsonb_build_object('source','https://fixture.invalid/pricing','observedAt','2026-10-15T00:00:00Z'),
 'receiptEvidence',jsonb_build_object('source','https://fixture.invalid/group','observedAt','2026-10-15T00:00:00Z')) $$;
CREATE FUNCTION fixture_request(task_id text,model_id text,quote jsonb,cap numeric DEFAULT 100) RETURNS void LANGUAGE SQL AS $$
 INSERT INTO api_compute_requests(id,"userId",provider,"idempotencyKey","requestHash","modelId","policyVersion",price,"maxUnits","authorizedPoints",state,"startedAt","updatedAt")
 VALUES(task_id,'billing-fixture-user','apic-codex',task_id,repeat('a',64),model_id,'fixture-v2',quote,100,cap,'RUNNING',NOW(),NOW()) $$;
CREATE FUNCTION fixture_evidence(task_id text,quota bigint,upstream numeric,billed numeric) RETURNS void LANGUAGE SQL AS $$
 INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","policyVersion")
 VALUES(task_id||'-evidence',task_id,'billing-fixture-user','VERIFIED',task_id||'receipt123456',quota,upstream,billed,upstream-billed,'fixture-v2') $$;
CREATE FUNCTION fixture_settle(task_id text,quota bigint,upstream numeric,billed numeric) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 PERFORM fixture_evidence(task_id,quota,upstream,billed);
 UPDATE api_compute_requests SET state='SETTLED',"settledPoints"=billed,outcome=task_id||'receipt123456',"finishedAt"=NOW() WHERE id=task_id;
END $$;

SELECT fixture_assert((SELECT "settledPoints"=.016274 FROM api_compute_requests WHERE id='old-settled'),'old settled preserved');
SELECT fixture_assert((SELECT "upstreamPoints"=.016274 AND "billedPoints"=.016274 AND "upstreamQuota"=8137 FROM api_compute_billing_evidence WHERE id='old-evidence'),'old evidence preserved');
SELECT 'assert:historical rows and evidence unchanged';

SELECT fixture_request('new-gpt','gpt-6.1-sol',jsonb_build_object('billing',fixture_snapshot('gpt-6.1-sol',.16,.16)));
SELECT fixture_settle('new-gpt',80000,11.2,10);
SELECT fixture_assert((SELECT "upstreamPoints"=11.2 AND "billedPoints"=10 AND "platformCoveredPoints"=1.2 FROM api_compute_billing_evidence WHERE "requestId"='new-gpt'),'same units');
SELECT 'assert:GPT .16 applied once; FX7; 10points/CNY; capped excess in same unit';
SELECT fixture_request('new-opus','claude-opus-5-5',jsonb_build_object('billing',fixture_snapshot('claude-opus-5-5',1,.8)));
SELECT fixture_settle('new-opus',400000,70,70);
SELECT 'assert:Opus accepted by real quote constraint; retail1 independent of procurement.8';
SELECT fixture_request('old-recover','gpt-6.1-sol','{"source":"APIC","quotaPerPoint":500000}',1);
SELECT fixture_settle('old-recover',8137,.016274,.016274);
SELECT 'assert:legacy request still reconciles after migration without FX';

DO $$ BEGIN
 BEGIN
  PERFORM fixture_request('bad-legacy-opus','claude-opus-5-5','{}',1);
  RAISE EXCEPTION 'fixture expected model rejection';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM fixture_request('bad-cap','gpt-6.1-sol',jsonb_build_object('billing',fixture_snapshot('gpt-6.1-sol',.16,.16)),101);
  RAISE EXCEPTION 'fixture expected cap rejection';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM fixture_request('bad-corrupt','gpt-6.1-sol','{"billing":null}',1);
  RAISE EXCEPTION 'fixture expected snapshot rejection';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT 'assert:old Opus, over-budget and corrupt new snapshots fail closed';

SELECT fixture_request('bad-units','gpt-6.1-sol',jsonb_build_object('billing',fixture_snapshot('gpt-6.1-sol',.16,.16)));
DO $$ BEGIN
 BEGIN
  PERFORM fixture_evidence('bad-units',80000,.16,.16);
  RAISE EXCEPTION 'fixture expected mixed-unit rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'API_BILLING_RECEIPT_UNITS_INVALID' THEN RAISE; END IF; END;
 BEGIN
  PERFORM fixture_evidence('bad-units',80000,11.2,100.000001);
  RAISE EXCEPTION 'fixture expected cap rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'API_BILLING_EVIDENCE_REFERENCE_INVALID' THEN RAISE; END IF; END;
 BEGIN
  UPDATE api_compute_requests SET price='{}' WHERE id='bad-units';
  RAISE EXCEPTION 'fixture expected immutable quote';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'API_COMPUTE_QUOTE_IMMUTABLE' THEN RAISE; END IF; END;
 BEGIN
  DELETE FROM api_compute_billing_evidence WHERE id='old-evidence';
  RAISE EXCEPTION 'fixture expected immutable evidence';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'API_BILLING_EVIDENCE_IMMUTABLE' THEN RAISE; END IF; END;
END $$;
SELECT 'assert:mixed-unit receipts, overspend, quote mutation, historical evidence deletion rejected';

BEGIN;
SELECT fixture_request('rejected-native','claude-opus-5-5',jsonb_build_object('billing',fixture_snapshot('claude-opus-5-5',1,1)));
INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"billedPoints","rejectedUpstreamStatus","policyVersion") VALUES('rejected-native-evidence','rejected-native','billing-fixture-user','REJECTED',0,400,'fixture-v2');
UPDATE api_compute_requests SET state='RELEASED',"settledPoints"=0,"finishedAt"=NOW() WHERE id='rejected-native';
COMMIT;
SELECT 'assert:explicit nonexecution zero-refund evidence remains valid';

-- Existing free voice quote remains accepted unchanged.
INSERT INTO api_compute_requests(id,"userId",provider,"idempotencyKey","requestHash","modelId","policyVersion",price,"maxUnits","authorizedPoints",state,"startedAt","updatedAt")
VALUES('voice-fixture','billing-fixture-user','mimo-tts','00000000-0000-4000-8000-000000000001',repeat('b',64),'mimo-v2.5-tts','mimo-tts-free-reviewed-20261016-v1',
'{"mode":"free","points":0,"providerListedPrice":0,"version":"mimo-tts-free-reviewed-20261016-v1","source":"https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go","voice":"Chloe","unit":"unicode-character","checkedAt":"2026-10-16","reviewBy":"2026-10-17"}',10,0,'RUNNING',NOW(),NOW());
SELECT 'assert:free TTS branch preserved';
