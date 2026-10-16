-- Synthetic fixtures only. Run solely in the owner-checked disposable verifier DB.
CREATE FUNCTION benefit_fixture_assert(valid boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(valid,false) THEN RAISE EXCEPTION 'fixture assertion: %',label; END IF; END $$;
CREATE FUNCTION benefit_fixture_expect(statement text,expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE statement;
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'FIXTURE_EXPECTED_REJECTION_BUT_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLSTATE<>expected AND SQLERRM<>expected THEN RAISE; END IF;
 END;
END $$;
INSERT INTO users(id,email,username,"updatedAt",role,"quotaPoints","adminPermissions") VALUES
 ('gift-fixture-user','gift@fixture.invalid','gift-fixture-user',NOW(),'USER',100,'[]'),
 ('gift-fixture-other','other@fixture.invalid','gift-fixture-other',NOW(),'USER',100,'[]'),
 ('gift-fixture-expired','expired@fixture.invalid','gift-fixture-expired',NOW(),'USER',100,'[]'),
 ('gift-fixture-admin','giftadmin@fixture.invalid','gift-fixture-admin',NOW(),'ADMIN',0,'["USERS_MANAGE"]');
INSERT INTO competitions(id,title) VALUES ('gift-fixture-competition','Synthetic private registration fixture');
INSERT INTO compute_benefit_questionnaires("userId",version,answers) SELECT id,'onboarding-v1',
 '{"version":"onboarding-v1","role":"DEVELOPER","experience":"BUILDING","agent":"CODEX","useCase":"Build a farming planning assistant","acceptedRules":true}'::jsonb
 FROM users WHERE id IN ('gift-fixture-user','gift-fixture-expired');
INSERT INTO compute_benefit_grants(id,"userId","campaignId",kind,"modelIds","policyVersion","totalUsdMicros","grantedAt","expiresAt")
 SELECT '00000000-0000-4000-8000-000000000001','gift-fixture-user','ans-onboarding-2026-v1','DEEPSEEK_ONBOARDING',ARRAY['deepseek-v4.1-flash'],'official-usd-gift-v1',1000000000,t,t+interval '720 hours' FROM (SELECT clock_timestamp() t)c;
INSERT INTO compute_benefit_grants(id,"userId","campaignId",kind,"modelIds","policyVersion","totalUsdMicros","grantedAt","expiresAt")
 SELECT '00000000-0000-4000-8000-000000000002','gift-fixture-expired','ans-onboarding-2026-v1','DEEPSEEK_ONBOARDING',ARRAY['deepseek-v4.1-flash'],'official-usd-gift-v1',1000000000,t,t+interval '720 hours' FROM (SELECT clock_timestamp()-interval '721 hours' t)c;
CREATE FUNCTION benefit_fixture_snapshot(model_id text) RETURNS jsonb LANGUAGE SQL AS $$ SELECT jsonb_build_object(
 'version','usd-cny-points-v2','configVersion','isolated-gift-fixture-v1','modelId',model_id,'pointsPerCny',10,'requestMaxPoints',100,
 'fx',jsonb_build_object('usdCny',1,'source','https://fixture.invalid/fixed','observedAt','2026-10-16T00:00:00Z'),
 'consumptionMultiplier',CASE WHEN model_id IN ('gpt-6-astra','gpt-6.1-sol') THEN .16 ELSE 1 END,
 'receiptConsumptionMultiplier',CASE WHEN model_id IN ('gpt-6-astra','gpt-6.1-sol') THEN .16 ELSE 1 END,
 'procurementMultiplier',CASE WHEN model_id='claude-opus-5-5' THEN .8 ELSE 1 END,
 'reserveRatesUsdPerMillion',jsonb_build_object('input',1,'output',1),
 'priceEvidence',jsonb_build_object('source','https://fixture.invalid/pricing','observedAt','2026-10-16T00:00:00Z'),
 'receiptEvidence',jsonb_build_object('source','https://fixture.invalid/group','observedAt','2026-10-16T00:00:00Z')) $$;
CREATE FUNCTION benefit_fixture_hold(task_id text,grant_id uuid,model_id text DEFAULT 'deepseek-v4.1-flash',owner_id text DEFAULT 'gift-fixture-user',amount bigint DEFAULT 1000000) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 UPDATE compute_benefit_grants SET "reservedUsdMicros"="reservedUsdMicros"+amount WHERE id=grant_id;
 INSERT INTO compute_benefit_reservations("requestId","grantId","userId","modelId","policyVersion","reservedUsdMicros") VALUES(task_id,grant_id,owner_id,model_id,'official-usd-gift-v1',amount);
 INSERT INTO api_compute_requests(id,"userId",provider,"idempotencyKey","requestHash","modelId","policyVersion",price,"maxUnits","authorizedPoints",state,"startedAt","updatedAt")
 VALUES(task_id,owner_id,'apic-codex',task_id,repeat('a',64),model_id,'gift-fixture-v1',jsonb_build_object('billing',benefit_fixture_snapshot(model_id),'benefitFunding',jsonb_build_object('version','official-usd-gift-v1','grantId',grant_id::text,'reservedUsdMicros',amount::text)),100,100,'RUNNING',NOW(),NOW());
END $$;
CREATE FUNCTION benefit_fixture_settle(task_id text,actual bigint,quota bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r compute_benefit_reservations; upstream_points numeric; receipt numeric; retail numeric;
BEGIN
 SELECT * INTO r FROM compute_benefit_reservations WHERE "requestId"=task_id;
 SELECT (price->'billing'->>'receiptConsumptionMultiplier')::numeric,(price->'billing'->>'consumptionMultiplier')::numeric INTO receipt,retail FROM api_compute_requests WHERE id=task_id;
 upstream_points:=ceil(quota::numeric/500000/receipt*10*retail*1000000)/1000000;
 INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","policyVersion")
 VALUES(task_id||'-evidence',task_id,r."userId",'VERIFIED',task_id||'receipt123456',quota,upstream_points,0,upstream_points,'gift-fixture-v1');
 UPDATE api_compute_requests SET state='SETTLED',"settledPoints"=0,outcome=task_id||'receipt123456',"finishedAt"=NOW() WHERE id=task_id;
 UPDATE compute_benefit_grants SET "reservedUsdMicros"="reservedUsdMicros"-r."reservedUsdMicros","usedUsdMicros"="usedUsdMicros"+LEAST(actual,r."reservedUsdMicros") WHERE id=r."grantId";
 UPDATE compute_benefit_reservations SET state='SETTLED',"actualUsdMicros"=actual,"chargedUsdMicros"=LEAST(actual,r."reservedUsdMicros"),"platformUsdMicros"=actual-LEAST(actual,r."reservedUsdMicros"),"completedAt"=clock_timestamp() WHERE "requestId"=task_id;
END $$;
SELECT benefit_fixture_hold('gift-settle','00000000-0000-4000-8000-000000000001');
SELECT benefit_fixture_settle('gift-settle',600000,300000);
SELECT benefit_fixture_assert((SELECT "usedUsdMicros"=600000 AND "reservedUsdMicros"=0 FROM compute_benefit_grants WHERE id='00000000-0000-4000-8000-000000000001'),'settled conservation');
SELECT 'assert:official USD gift settles through real verified receipt without paid wallet debit';
SELECT benefit_fixture_hold('gift-overrun','00000000-0000-4000-8000-000000000001');
SELECT benefit_fixture_settle('gift-overrun',1200000,600000);
SELECT benefit_fixture_assert((SELECT "chargedUsdMicros"=1000000 AND "platformUsdMicros"=200000 FROM compute_benefit_reservations WHERE "requestId"='gift-overrun'),'overrun capped');
SELECT 'assert:official charge capped at reservation; platform excess retained';
SELECT benefit_fixture_hold('gift-rejected','00000000-0000-4000-8000-000000000001');
BEGIN;
INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"billedPoints","rejectedUpstreamStatus","policyVersion") VALUES('gift-rejected-evidence','gift-rejected','gift-fixture-user','REJECTED',0,400,'gift-fixture-v1');
UPDATE api_compute_requests SET state='RELEASED',"settledPoints"=0,"finishedAt"=NOW() WHERE id='gift-rejected';
UPDATE compute_benefit_grants SET "reservedUsdMicros"="reservedUsdMicros"-1000000 WHERE id='00000000-0000-4000-8000-000000000001';
UPDATE compute_benefit_reservations SET state='RELEASED',"actualUsdMicros"=0,"chargedUsdMicros"=0,"platformUsdMicros"=0,"completedAt"=NOW() WHERE "requestId"='gift-rejected';
COMMIT;
SELECT 'assert:explicit nonexecution restores original model gift hold';
SELECT benefit_fixture_expect($q$SELECT benefit_fixture_hold('gift-wrong-owner','00000000-0000-4000-8000-000000000001','deepseek-v4.1-flash','gift-fixture-other')$q$,'COMPUTE_BENEFIT_GRANT_UNAVAILABLE');
SELECT benefit_fixture_expect($q$SELECT benefit_fixture_hold('gift-wrong-model','00000000-0000-4000-8000-000000000001','gpt-6-astra')$q$,'COMPUTE_BENEFIT_GRANT_UNAVAILABLE');
SELECT benefit_fixture_expect($q$SELECT benefit_fixture_hold('gift-expired','00000000-0000-4000-8000-000000000002','deepseek-v4.1-flash','gift-fixture-expired')$q$,'COMPUTE_BENEFIT_GRANT_UNAVAILABLE');
SELECT benefit_fixture_expect($q$UPDATE compute_benefit_grants SET "usedUsdMicros"="usedUsdMicros"+1 WHERE id='00000000-0000-4000-8000-000000000001'$q$,'COMPUTE_BENEFIT_CONSERVATION_VIOLATION');
SELECT benefit_fixture_expect($q$UPDATE compute_benefit_grants SET "expiresAt"="expiresAt"+interval '1 hour' WHERE id='00000000-0000-4000-8000-000000000001'$q$,'COMPUTE_BENEFIT_GRANT_IMMUTABLE');
SELECT benefit_fixture_expect($q$INSERT INTO compute_benefit_grants(id,"userId","campaignId",kind,"modelIds","policyVersion","totalUsdMicros","grantedAt","expiresAt") SELECT '00000000-0000-4000-8000-000000000099','gift-fixture-other','ans-onboarding-2026-v1','DEEPSEEK_ONBOARDING',ARRAY['deepseek-v4.1-flash'],'official-usd-gift-v1',1000000000,t,t+interval '720 hours' FROM (SELECT clock_timestamp() t)c$q$,'COMPUTE_BENEFIT_QUESTIONNAIRE_REQUIRED');
SELECT 'assert:wrong owner cross-model expired holds, missing questionnaire, ledger drift and renewal rejected';
SELECT benefit_fixture_hold('gift-null-terminal','00000000-0000-4000-8000-000000000001');
SELECT benefit_fixture_expect($q$UPDATE compute_benefit_reservations SET state='SETTLED',"actualUsdMicros"=NULL,"chargedUsdMicros"=NULL,"platformUsdMicros"=NULL,"completedAt"=NOW() WHERE "requestId"='gift-null-terminal'$q$,'23514');
SELECT benefit_fixture_expect($q$UPDATE compute_benefit_reservations SET state='RELEASED',"actualUsdMicros"=NULL,"chargedUsdMicros"=NULL,"platformUsdMicros"=NULL,"completedAt"=NOW() WHERE "requestId"='gift-null-terminal'$q$,'23514');
SELECT benefit_fixture_expect($q$INSERT INTO compute_benefit_applications(id,"userId","campaignId","competitionId",version,answers,status,"reviewedAt","reviewerId","reviewNote") VALUES('00000000-0000-4000-8000-000000000010','gift-fixture-other','ans-agrihackathon-2026-v1','gift-fixture-competition','agri-v1','{}','APPROVED',NOW(),'gift-fixture-admin',NULL)$q$,'23514');
SELECT 'assert:nullable settled released amounts and nullable approval reviewNote rejected';
SELECT benefit_fixture_hold('gift-wrong-receipt','00000000-0000-4000-8000-000000000001');
SELECT benefit_fixture_expect($q$SELECT benefit_fixture_settle('gift-wrong-receipt',900000,300000)$q$,'COMPUTE_BENEFIT_RECEIPT_AMOUNT_INVALID');
CREATE FUNCTION benefit_fixture_orphan() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 UPDATE compute_benefit_grants SET "reservedUsdMicros"="reservedUsdMicros"+1 WHERE id='00000000-0000-4000-8000-000000000001';
 INSERT INTO compute_benefit_reservations("requestId","grantId","userId","modelId","policyVersion","reservedUsdMicros") VALUES('gift-no-request','00000000-0000-4000-8000-000000000001','gift-fixture-user','deepseek-v4.1-flash','official-usd-gift-v1',1);
END $$;
SELECT benefit_fixture_expect('SELECT benefit_fixture_orphan()','COMPUTE_BENEFIT_REQUEST_MISMATCH');
SELECT 'assert:forged settlement amount and unbound reservation denied';
-- An approved application alone cannot grant: a matching authorized immutable review event is required.
INSERT INTO compute_benefit_applications(id,"userId","campaignId","competitionId",version,answers,status,revision,"reviewedAt","reviewerId","reviewNote") VALUES('00000000-0000-4000-8000-000000000011','gift-fixture-user','ans-agrihackathon-2026-v1','gift-fixture-competition','agri-v1','{}','APPROVED',2,NOW(),'gift-fixture-admin','Approved synthetic fixture');
SELECT benefit_fixture_expect($q$INSERT INTO compute_benefit_grants(id,"userId","campaignId",kind,"applicationId","modelIds","policyVersion","totalUsdMicros","grantedAt","expiresAt") SELECT '00000000-0000-4000-8000-000000000003','gift-fixture-user','ans-agrihackathon-2026-v1','GPT_AGRI','00000000-0000-4000-8000-000000000011',ARRAY['gpt-6-astra','gpt-6.1-sol'],'official-usd-gift-v1',200000000,t,t+interval '720 hours' FROM (SELECT clock_timestamp() t)c$q$,'COMPUTE_BENEFIT_APPROVAL_REQUIRED');
INSERT INTO compute_benefit_review_events(id,"applicationId","actorId",revision,decision,note) VALUES('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011','gift-fixture-admin',1,'APPROVED','Approved synthetic fixture');
INSERT INTO compute_benefit_grants(id,"userId","campaignId",kind,"applicationId","modelIds","policyVersion","totalUsdMicros","grantedAt","expiresAt") SELECT '00000000-0000-4000-8000-000000000003','gift-fixture-user','ans-agrihackathon-2026-v1','GPT_AGRI','00000000-0000-4000-8000-000000000011',ARRAY['gpt-6-astra','gpt-6.1-sol'],'official-usd-gift-v1',200000000,t,t+interval '720 hours' FROM (SELECT clock_timestamp() t)c;
SELECT benefit_fixture_hold('gift-gpt-astra','00000000-0000-4000-8000-000000000003','gpt-6-astra');
SELECT benefit_fixture_settle('gift-gpt-astra',1000000,80000);
SELECT benefit_fixture_hold('gift-gpt-sol','00000000-0000-4000-8000-000000000003','gpt-6.1-sol');
SELECT benefit_fixture_settle('gift-gpt-sol',1000000,80000);
SELECT benefit_fixture_assert((SELECT "usedUsdMicros"=2000000 FROM compute_benefit_grants WHERE id='00000000-0000-4000-8000-000000000003'),'GPT shared pool full official USD');
SELECT benefit_fixture_assert((SELECT "quotaPoints"=100 FROM users WHERE id='gift-fixture-user'),'paid wallet unchanged');
SELECT 'assert:authorized signup approval source, Astra Sol share pool, receipt .16 undone once; paid wallet unchanged';
SELECT benefit_fixture_assert((SELECT "expiresAt"-"grantedAt"=interval '720 hours' FROM compute_benefit_grants WHERE id='00000000-0000-4000-8000-000000000001'),'30 day expiry');
SELECT 'assert:grant lifetime exactly 720 hours from immutable database timestamps';
