BEGIN;
-- Additive, empty by default. No school or workflow associations are seeded.
CREATE UNIQUE INDEX "workflow_versions_id_workflowId_key" ON workflow_versions(id,"workflowId");
CREATE TABLE workflow_hub_associations (
 id text PRIMARY KEY,"workflowId" text NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,"hubSlug" text NOT NULL,
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),"requestEventId" text,"approvedEventId" text,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT workflow_hub_slug CHECK("hubSlug" IN('cauhub','vibehub','aigc','full-stack')),
 UNIQUE("workflowId","hubSlug"),UNIQUE(id,"workflowId","hubSlug")
);
CREATE TABLE workflow_hub_events (
 id text PRIMARY KEY,"associationId" text NOT NULL,"workflowId" text NOT NULL,"hubSlug" text NOT NULL,revision integer NOT NULL CHECK(revision>0),
 action text NOT NULL CHECK(action IN('REQUEST','APPROVE','REJECT','WITHDRAW')),"versionId" text NOT NULL,"actorId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "requestEventId" text,reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 10 AND 2000),"createdAt" timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY("associationId","workflowId","hubSlug") REFERENCES workflow_hub_associations(id,"workflowId","hubSlug") ON DELETE RESTRICT,
 FOREIGN KEY("versionId","workflowId") REFERENCES workflow_versions(id,"workflowId") ON DELETE RESTRICT,
 FOREIGN KEY("requestEventId") REFERENCES workflow_hub_events(id) ON DELETE RESTRICT,
 CHECK((action='REQUEST' AND "requestEventId" IS NULL) OR (action<>'REQUEST' AND "requestEventId" IS NOT NULL)),
 CHECK(action<>'REQUEST' OR "hubSlug"<>'cauhub' OR length(btrim(reason))>=20),
 UNIQUE("associationId",revision),UNIQUE(id,"associationId","workflowId","hubSlug")
);
ALTER TABLE workflow_hub_associations ADD FOREIGN KEY("requestEventId") REFERENCES workflow_hub_events(id) ON DELETE RESTRICT;
ALTER TABLE workflow_hub_associations ADD FOREIGN KEY("approvedEventId") REFERENCES workflow_hub_events(id) ON DELETE RESTRICT;
CREATE TABLE workflow_hub_receipts (
 id text PRIMARY KEY,"associationId" text NOT NULL,"workflowId" text NOT NULL,"hubSlug" text NOT NULL,"actorId" text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "idempotencyKey" uuid NOT NULL,"requestHash" text NOT NULL CHECK("requestHash" ~ '^[a-f0-9]{64}$'),"eventId" text NOT NULL,"appliedRevision" integer NOT NULL CHECK("appliedRevision">0),"createdAt" timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY("eventId","associationId","workflowId","hubSlug") REFERENCES workflow_hub_events(id,"associationId","workflowId","hubSlug") ON DELETE RESTRICT,
 UNIQUE("actorId","idempotencyKey"),UNIQUE("eventId")
);
CREATE INDEX workflow_hub_discovery ON workflow_hub_associations("hubSlug",id);
CREATE INDEX workflow_hub_event_history ON workflow_hub_events("associationId",revision DESC);
CREATE FUNCTION workflow_hub_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'WORKFLOW_HUB_IMMUTABLE'; END $$;
CREATE TRIGGER workflow_hub_events_immutable BEFORE UPDATE OR DELETE ON workflow_hub_events FOR EACH ROW EXECUTE FUNCTION workflow_hub_immutable();
CREATE TRIGGER workflow_hub_receipts_immutable BEFORE UPDATE OR DELETE ON workflow_hub_receipts FOR EACH ROW EXECUTE FUNCTION workflow_hub_immutable();
CREATE FUNCTION workflow_hub_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h workflow_hub_associations; e workflow_hub_events; q workflow_hub_events; a workflow_hub_events; n integer; item workflow_hub_events; pending_id text; approved_id text; approved_request_id text;
BEGIN
 IF TG_TABLE_NAME='workflow_hub_receipts' THEN
  SELECT * INTO e FROM workflow_hub_events WHERE id=NEW."eventId";
  IF e.revision IS DISTINCT FROM NEW."appliedRevision" OR e."actorId" IS DISTINCT FROM NEW."actorId" THEN RAISE EXCEPTION 'WORKFLOW_HUB_RECEIPT_MISMATCH'; END IF;
  RETURN NULL;
 END IF;
 IF TG_TABLE_NAME='workflow_hub_events' THEN SELECT * INTO h FROM workflow_hub_associations WHERE id=NEW."associationId";
 ELSE SELECT * INTO h FROM workflow_hub_associations WHERE id=NEW.id; END IF;
 SELECT count(*),coalesce(max(revision),0) INTO n,h.revision FROM workflow_hub_events WHERE "associationId"=h.id;
 IF n IS DISTINCT FROM h.revision OR h.revision IS DISTINCT FROM (SELECT revision FROM workflow_hub_associations WHERE id=h.id) THEN RAISE EXCEPTION 'WORKFLOW_HUB_HEAD_MISMATCH'; END IF;
 FOR item IN SELECT * FROM workflow_hub_events WHERE "associationId"=h.id ORDER BY revision LOOP
  IF item.action='REQUEST' THEN pending_id:=item.id;
  ELSIF item.action='APPROVE' THEN pending_id:=NULL;approved_id:=item.id;approved_request_id:=item."requestEventId";
  ELSIF item.action='REJECT' THEN pending_id:=NULL;
  ELSE
   IF pending_id=item."requestEventId" THEN pending_id:=NULL; END IF;
   IF approved_request_id=item."requestEventId" THEN approved_id:=NULL;approved_request_id:=NULL; END IF;
  END IF;
 END LOOP;
 IF h."requestEventId" IS DISTINCT FROM pending_id OR h."approvedEventId" IS DISTINCT FROM approved_id THEN RAISE EXCEPTION 'WORKFLOW_HUB_CANONICAL_HEAD_MISMATCH'; END IF;
 IF h."requestEventId" IS NOT NULL THEN
  SELECT * INTO q FROM workflow_hub_events WHERE id=h."requestEventId";
  IF q.action IS DISTINCT FROM 'REQUEST' OR q."associationId" IS DISTINCT FROM h.id THEN RAISE EXCEPTION 'WORKFLOW_HUB_REQUEST_MISMATCH'; END IF;
 END IF;
 IF h."approvedEventId" IS NOT NULL THEN
  SELECT * INTO a FROM workflow_hub_events WHERE id=h."approvedEventId";
  IF a.action IS DISTINCT FROM 'APPROVE' OR a."associationId" IS DISTINCT FROM h.id THEN RAISE EXCEPTION 'WORKFLOW_HUB_APPROVAL_MISMATCH'; END IF;
 END IF;
 IF TG_TABLE_NAME='workflow_hub_events' AND NOT EXISTS(SELECT 1 FROM workflow_hub_receipts WHERE "eventId"=NEW.id) THEN RAISE EXCEPTION 'WORKFLOW_HUB_RECEIPT_REQUIRED'; END IF;
 IF TG_TABLE_NAME='workflow_hub_events' THEN
 IF NEW.action<>'REQUEST' THEN
  SELECT * INTO q FROM workflow_hub_events WHERE id=NEW."requestEventId";
  IF q.action IS DISTINCT FROM 'REQUEST' OR q."associationId" IS DISTINCT FROM NEW."associationId" OR q."versionId" IS DISTINCT FROM NEW."versionId" OR q.revision>=NEW.revision THEN RAISE EXCEPTION 'WORKFLOW_HUB_SOURCE_MISMATCH'; END IF;
  IF NEW.action IN('APPROVE','REJECT') AND NEW."actorId"=q."actorId" THEN RAISE EXCEPTION 'WORKFLOW_HUB_SELF_REVIEW'; END IF;
 END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER workflow_hub_head_guard AFTER INSERT OR UPDATE ON workflow_hub_associations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workflow_hub_guard();
CREATE CONSTRAINT TRIGGER workflow_hub_event_guard AFTER INSERT ON workflow_hub_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workflow_hub_guard();
CREATE CONSTRAINT TRIGGER workflow_hub_receipt_guard AFTER INSERT ON workflow_hub_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workflow_hub_guard();

CREATE FUNCTION workflow_hub_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e workflow_hub_events; q text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'WORKFLOW_HUB_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>0 OR NEW."requestEventId" IS NOT NULL OR NEW."approvedEventId" IS NOT NULL THEN RAISE EXCEPTION 'WORKFLOW_HUB_INITIAL_HEAD'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.id<>OLD.id OR NEW."workflowId"<>OLD."workflowId" OR NEW."hubSlug"<>OLD."hubSlug" OR NEW."createdAt"<>OLD."createdAt" OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'WORKFLOW_HUB_TRANSITION'; END IF;
 SELECT * INTO e FROM workflow_hub_events WHERE "associationId"=OLD.id AND revision=NEW.revision;
 IF e.id IS NULL THEN RAISE EXCEPTION 'WORKFLOW_HUB_EVENT_REQUIRED'; END IF;
 IF e.action='REQUEST' THEN
  IF NEW."requestEventId" IS DISTINCT FROM e.id OR NEW."approvedEventId" IS DISTINCT FROM OLD."approvedEventId" THEN RAISE EXCEPTION 'WORKFLOW_HUB_REQUEST_TRANSITION'; END IF;
 ELSIF e.action IN('APPROVE','REJECT') THEN
  IF e."requestEventId" IS DISTINCT FROM OLD."requestEventId" OR OLD."requestEventId" IS NULL OR NEW."requestEventId" IS NOT NULL OR NEW."approvedEventId" IS DISTINCT FROM (CASE WHEN e.action='APPROVE' THEN e.id ELSE OLD."approvedEventId" END) THEN RAISE EXCEPTION 'WORKFLOW_HUB_REVIEW_TRANSITION'; END IF;
 ELSE
  SELECT r."requestEventId" INTO q FROM workflow_hub_events r WHERE r.id=OLD."approvedEventId";
  IF e."requestEventId" IS DISTINCT FROM OLD."requestEventId" AND e."requestEventId" IS DISTINCT FROM q THEN RAISE EXCEPTION 'WORKFLOW_HUB_WITHDRAW_SOURCE'; END IF;
  IF NEW."requestEventId" IS DISTINCT FROM (CASE WHEN OLD."requestEventId"=e."requestEventId" THEN NULL ELSE OLD."requestEventId" END)
   OR NEW."approvedEventId" IS DISTINCT FROM (CASE WHEN q=e."requestEventId" THEN NULL ELSE OLD."approvedEventId" END) THEN RAISE EXCEPTION 'WORKFLOW_HUB_WITHDRAW_TRANSITION'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workflow_hub_transition_guard BEFORE INSERT OR UPDATE OR DELETE ON workflow_hub_associations FOR EACH ROW EXECUTE FUNCTION workflow_hub_transition();


-- Fail closed on malformed graphs; bounded to the runtime's 50 nodes/200 edges.
CREATE FUNCTION workflow_hub_definition_valid(d jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE node jsonb; edge jsonb; ids text[]:='{}'; edge_ids text[]:='{}'; pairs text[]:='{}'; remaining text[]; ready text[]; max_nodes integer; number_value numeric;
BEGIN
 IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR d->'version' IS DISTINCT FROM '1'::jsonb OR jsonb_typeof(d->'nodes') IS DISTINCT FROM 'array' OR jsonb_typeof(d->'edges') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF d ? 'recipe' THEN RETURN d='{"version":1,"recipe":"resume-website-v1","maxNodes":2,"nodes":[{"id":"copy","type":"model","label":"Personal copy","config":{},"timeoutMs":90000,"maxRetries":0},{"id":"artifact","type":"output","label":"HTML artifact","config":{},"timeoutMs":5000,"maxRetries":0}],"edges":[{"id":"copy-artifact","from":"copy","to":"artifact","mapping":{}}]}'::jsonb; END IF;
 IF d ? 'maxNodes' THEN number_value:=(d->>'maxNodes')::numeric;IF jsonb_typeof(d->'maxNodes') IS DISTINCT FROM 'number' OR number_value<>trunc(number_value) THEN RETURN false; END IF; END IF;
 max_nodes:=coalesce((d->>'maxNodes')::integer,20);
 IF max_nodes<1 OR max_nodes>50 OR jsonb_array_length(d->'nodes') NOT BETWEEN 1 AND LEAST(50,max_nodes) OR jsonb_array_length(d->'edges')>200 THEN RETURN false; END IF;
 FOR node IN SELECT value FROM jsonb_array_elements(d->'nodes') LOOP
  IF jsonb_typeof(node)<>'object' OR jsonb_typeof(node->'id') IS DISTINCT FROM 'string' OR (node->>'id') !~ '^[a-zA-Z][a-zA-Z0-9_-]{0,63}$' OR node->>'id'=ANY(ids)
   OR jsonb_typeof(node->'type') IS DISTINCT FROM 'string' OR node->>'type' NOT IN('prompt','template','model','condition','output')
   OR jsonb_typeof(node->'label') IS DISTINCT FROM 'string' OR length(btrim(node->>'label')) NOT BETWEEN 1 AND 120
   OR (node ? 'config' AND jsonb_typeof(node->'config') IS DISTINCT FROM 'object') THEN RETURN false; END IF;
  IF node ? 'timeoutMs' THEN number_value:=(node->>'timeoutMs')::numeric;IF jsonb_typeof(node->'timeoutMs')<>'number' OR number_value<>trunc(number_value) OR number_value NOT BETWEEN 100 AND 120000 THEN RETURN false; END IF; END IF;
  IF node ? 'maxRetries' THEN number_value:=(node->>'maxRetries')::numeric;IF jsonb_typeof(node->'maxRetries')<>'number' OR number_value<>trunc(number_value) OR number_value NOT BETWEEN 0 AND 3 THEN RETURN false; END IF; END IF;
  ids:=array_append(ids,node->>'id');
 END LOOP;
 FOR edge IN SELECT value FROM jsonb_array_elements(d->'edges') LOOP
  IF jsonb_typeof(edge)<>'object' OR jsonb_typeof(edge->'id') IS DISTINCT FROM 'string' OR (edge->>'id') !~ '^[a-zA-Z][a-zA-Z0-9_-]{0,63}$' OR edge->>'id'=ANY(edge_ids)
   OR jsonb_typeof(edge->'from') IS DISTINCT FROM 'string' OR jsonb_typeof(edge->'to') IS DISTINCT FROM 'string'
   OR NOT(edge->>'from'=ANY(ids)) OR NOT(edge->>'to'=ANY(ids)) OR edge->>'from'=edge->>'to'
   OR (edge ? 'mapping' AND jsonb_typeof(edge->'mapping') IS DISTINCT FROM 'object') THEN RETURN false; END IF;
  IF edge ? 'mapping' AND EXISTS(SELECT 1 FROM jsonb_each(edge->'mapping') WHERE jsonb_typeof(value)<>'string') THEN RETURN false; END IF;
  IF concat(edge->>'from',':',edge->>'to')=ANY(pairs) THEN RETURN false; END IF;
  edge_ids:=array_append(edge_ids,edge->>'id');pairs:=array_append(pairs,concat(edge->>'from',':',edge->>'to'));
 END LOOP;
 remaining:=ids;
 WHILE cardinality(remaining)>0 LOOP
  SELECT array_agg(id) INTO ready FROM unnest(remaining) id WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d->'edges') e WHERE e->>'to'=id AND e->>'from'=ANY(remaining));
  IF ready IS NULL THEN RETURN false; END IF;
  SELECT coalesce(array_agg(id),'{}') INTO remaining FROM unnest(remaining) id WHERE NOT(id=ANY(ready));
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION workflow_hub_event_authority() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w workflows; u users; o users; r workflow_hub_events; is_moderator boolean;
BEGIN
 SELECT * INTO w FROM workflows WHERE id=NEW."workflowId" FOR UPDATE;
 PERFORM id FROM users WHERE id IN(NEW."actorId",w."authorId") ORDER BY id FOR SHARE;
 SELECT * INTO u FROM users WHERE id=NEW."actorId";
 SELECT * INTO o FROM users WHERE id=w."authorId";
 IF u.id IS NULL OR u.flagged OR u."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'WORKFLOW_HUB_ACCOUNT_UNAVAILABLE'; END IF;
 IF w."isOfficial" THEN RAISE EXCEPTION 'WORKFLOW_HUB_OFFICIAL_LOCKED'; END IF;
 is_moderator:=u.role='ADMIN' AND (jsonb_typeof(u."adminPermissions") IS DISTINCT FROM 'array' OR u."adminPermissions" @> '["CATALOG_MANAGE"]'::jsonb);
 IF NEW.action='REQUEST' AND u.id<>w."authorId" THEN RAISE EXCEPTION 'WORKFLOW_HUB_OWNER_REQUIRED'; END IF;
 IF NEW.action IN('APPROVE','REJECT') AND NOT is_moderator THEN RAISE EXCEPTION 'WORKFLOW_HUB_MODERATOR_REQUIRED'; END IF;
 IF NEW.action<>'REQUEST' THEN
  SELECT * INTO r FROM workflow_hub_events WHERE id=NEW."requestEventId";
  IF NEW.action='WITHDRAW' AND NOT is_moderator AND u.id IS DISTINCT FROM r."actorId" THEN RAISE EXCEPTION 'WORKFLOW_HUB_CONSENT_REQUIRED'; END IF;
 END IF;
 IF NEW.action IN('REQUEST','APPROVE') THEN
  IF w.status<>'PUBLISHED' OR o.flagged OR o."deletedAt" IS NOT NULL OR (NEW.action='APPROVE' AND r."actorId" IS DISTINCT FROM w."authorId") OR NOT EXISTS(SELECT 1 FROM workflow_versions v WHERE v.id=NEW."versionId" AND v."workflowId"=w.id AND v.version=w."publishedVersion" AND workflow_hub_definition_valid(v.definition)) THEN RAISE EXCEPTION 'WORKFLOW_HUB_PUBLISHED_VERSION_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workflow_hub_event_authority_guard BEFORE INSERT ON workflow_hub_events FOR EACH ROW EXECUTE FUNCTION workflow_hub_event_authority();
CREATE FUNCTION workflow_hub_bound_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM workflow_hub_events WHERE "versionId"=OLD.id) THEN RAISE EXCEPTION 'WORKFLOW_HUB_BOUND_VERSION_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER workflow_hub_bound_version_immutable BEFORE UPDATE OR DELETE ON workflow_versions FOR EACH ROW EXECUTE FUNCTION workflow_hub_bound_version_guard();
COMMIT;
