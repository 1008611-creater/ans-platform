INSERT INTO users(id,email,username,"updatedAt",role,"quotaPoints") VALUES ('billing-fixture-user','billing@fixture.invalid','billing-fixture',NOW(),'USER',1000);
INSERT INTO users(id,email,username,"updatedAt",role,"quotaPoints") VALUES ('billing-fixture-admin','admin@fixture.invalid','billing-fixture-admin',NOW(),'ADMIN',0);
-- This settled historical row/evidence must survive migration byte-for-byte.
BEGIN;
INSERT INTO api_compute_requests(id,"userId",provider,"idempotencyKey","requestHash","modelId","policyVersion",price,"maxUnits","authorizedPoints",state,"startedAt","updatedAt")
VALUES ('old-settled','billing-fixture-user','apic-codex','old-settled',repeat('a',64),'gpt-6.1-sol','apic-final-quota-v1','{"source":"APIC","quotaPerPoint":500000}',100,1,'RUNNING',NOW(),NOW());
INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","policyVersion")
VALUES ('old-evidence','old-settled','billing-fixture-user','VERIFIED','oldreceipt1234',8137,0.016274,0.016274,0,'apic-final-quota-v1');
UPDATE api_compute_requests SET state='SETTLED',"settledPoints"=0.016274,outcome='oldreceipt1234',"finishedAt"=NOW() WHERE id='old-settled';
COMMIT;
