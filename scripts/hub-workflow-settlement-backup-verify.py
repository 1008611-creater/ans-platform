"""Back up the ANS public schema and verify a real isolated PostgreSQL 17 restore.

Run on the production host with a release source directory. Credentials stay in
process memory/container environment; output contains only hashes and counts.
This helper never restores over production, changes its schema, or removes data.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import select
import subprocess
import sys
import time
from urllib.parse import parse_qs, unquote, urlparse

APP = "ans-platform-app"
IMAGE = "postgres:17-bookworm"
ROOT = Path("/srv/ans-releases")
CONSTRAINT_SQL = """SELECT jsonb_build_object('table', r.relname, 'name', c.conname,
 'type', c.contype, 'validated', c.convalidated, 'deferrable', c.condeferrable, 'initiallyDeferred', c.condeferred, 'definition', pg_get_constraintdef(c.oid, true)) AS item
 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 WHERE n.nspname='public' ORDER BY r.relname,c.conname"""
INDEX_SQL = "SELECT jsonb_build_object('table', tablename, 'name', indexname, 'definition', indexdef) AS item FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"
MIGRATION_SQL = 'SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY migration_name'
GUARD_MIGRATION = "20261012213000_agri_legacy_workspace_boundary"
GUARD_SQL_SHA256 = "8f131b98090069b85c4f7a3c1477f8588accde3c55f1e2a32b61dc94419ecb8f"
# Exact reviewed LF bytes, not an arbitrary operator-supplied SQL file/hash.
GUARD_SQL = """-- A managed edition stays managed while disabled or before its first stage exists.
-- No rows or historical migration checksums are modified. Keep pure registration,
-- unrelated quota fields, historical stage protection and NOWAIT lock ordering.
-- ENV-only binding is also checked by the application; SQL recognizes persisted
-- workspaces and stage history without guessing an edition from its title.
CREATE OR REPLACE FUNCTION "agri_legacy_entry_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE has_history BOOLEAN; target_id TEXT; protected_change BOOLEAN; row_workspace RECORD;
BEGIN
  IF TG_OP='INSERT' THEN
    target_id=NEW."competitionId";
    protected_change=NEW."entryStatus"<>'REGISTERED' OR NEW."submissionVersionId" IS NOT NULL OR
      NEW."submittedById" IS NOT NULL OR NEW."submittedAt" IS NOT NULL OR NEW."submissionNote" IS NOT NULL OR
      NEW."publicConsent" OR NEW."reviewedAt" IS NOT NULL OR NEW."reviewedById" IS NOT NULL OR
      NEW."reviewNote" IS NOT NULL OR NEW."awardedXp"<>0;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "agri_entry_stages" WHERE "teamCompetitionId"=OLD.id) INTO has_history;
    IF TG_OP='DELETE' THEN protected_change=true; target_id=OLD."competitionId";
    ELSE
      target_id=NEW."competitionId";
      protected_change=NEW.id IS DISTINCT FROM OLD.id OR NEW."competitionId" IS DISTINCT FROM OLD."competitionId" OR
        NEW."teamId" IS DISTINCT FROM OLD."teamId" OR NEW."entryStatus" IS DISTINCT FROM OLD."entryStatus" OR
        NEW."submissionVersionId" IS DISTINCT FROM OLD."submissionVersionId" OR NEW."submittedById" IS DISTINCT FROM OLD."submittedById" OR
        NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt" OR NEW."submissionNote" IS DISTINCT FROM OLD."submissionNote" OR
        NEW."publicConsent" IS DISTINCT FROM OLD."publicConsent" OR NEW."reviewedAt" IS DISTINCT FROM OLD."reviewedAt" OR
        NEW."reviewedById" IS DISTINCT FROM OLD."reviewedById" OR NEW."reviewNote" IS DISTINCT FROM OLD."reviewNote" OR
        NEW."awardedXp" IS DISTINCT FROM OLD."awardedXp";
    END IF;
    IF has_history AND protected_change THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END IF;
  END IF;
  IF protected_change THEN
    BEGIN
      FOR row_workspace IN SELECT enabled FROM "agri_workspaces"
        WHERE "competitionId"=target_id OR (TG_OP<>'INSERT' AND "competitionId"=OLD."competitionId")
        ORDER BY "competitionId" FOR SHARE NOWAIT
      LOOP
        RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED';
      END LOOP;
    EXCEPTION WHEN lock_not_available THEN RAISE EXCEPTION 'AGRI_STAGE_WORKSPACE_REQUIRED'; END;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
"""
GUARD_FUNCTION_SQL = """SELECT jsonb_build_object('schema', n.nspname, 'name', p.proname,
 'identityArguments', pg_get_function_identity_arguments(p.oid), 'returnType', pg_get_function_result(p.oid),
 'language', l.lanname, 'kind', p.prokind, 'volatility', p.provolatile, 'parallel', p.proparallel,
 'securityDefiner', p.prosecdef, 'strict', p.proisstrict, 'leakproof', p.proleakproof,
 'config', p.proconfig, 'cost', p.procost, 'rows', p.prorows,
 'definition', pg_get_functiondef(p.oid)) AS item
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='public' AND p.proname='agri_legacy_entry_guard' AND p.prokind='f'
 AND pg_get_function_identity_arguments(p.oid)='' ORDER BY n.nspname,p.proname"""
TRIGGER_SQL = """SELECT jsonb_build_object('schema', n.nspname, 'table', r.relname, 'name', t.tgname,
 'enabled', t.tgenabled, 'type', t.tgtype, 'deferrable', t.tgdeferrable, 'initiallyDeferred', t.tginitdeferred,
 'functionSchema', fn.nspname, 'function', p.proname,
 'functionArguments', pg_get_function_identity_arguments(p.oid),
 'constraint', c.conname, 'definition', pg_get_triggerdef(t.oid,true)) AS item
 FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
 LEFT JOIN pg_constraint c ON c.oid=t.tgconstraint
 WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY r.relname,t.tgname"""


EVIDENCE_MIGRATION = "202610130002_agent_billing_evidence"
EVIDENCE_TABLE = "api_compute_billing_evidence"
EVIDENCE_FUNCTION = "ans_guard_api_billing_evidence"
EVIDENCE_TRIGGER = "api_billing_evidence_guard"
EVIDENCE_SQL_SHA256 = '3f8b63e55bf3ff72abc027fabfe1a502b842c8376d669e0c24cd045305b99a9d'
EVIDENCE_SQL = '-- Additive immutable-quote settlement evidence only. Preserve original quote/budget/state/wallet guards.\nSET lock_timeout = \'10s\';\nCREATE TABLE api_compute_billing_evidence (\n id TEXT PRIMARY KEY, "requestId" TEXT NOT NULL REFERENCES api_compute_requests(id) ON DELETE RESTRICT ON UPDATE NO ACTION,\n "ownerId" TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN (\'VERIFIED\',\'REJECTED\',\'WAIVER\')),\n "upstreamRequestId" TEXT, "upstreamQuota" BIGINT, "upstreamPoints" NUMERIC(24,6), "billedPoints" NUMERIC(24,6) NOT NULL,\n "platformCoveredPoints" NUMERIC(24,6), "rejectedUpstreamStatus" INTEGER, "actorId" TEXT, "policyVersion" TEXT NOT NULL,\n "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n CONSTRAINT api_compute_billing_evidence_request_key UNIQUE("requestId"),\n CONSTRAINT api_compute_billing_evidence_valid CHECK(COALESCE(\n  (kind=\'VERIFIED\' AND "upstreamRequestId" IS NOT NULL AND "upstreamRequestId" ~ \'^[A-Za-z0-9_-]{8,128}$\' AND "upstreamQuota" IS NOT NULL AND "upstreamQuota" BETWEEN 0 AND 500000000\n   AND "upstreamPoints" IS NOT NULL AND "upstreamPoints"="upstreamQuota"::numeric/500000 AND "billedPoints">=0 AND "billedPoints"<="upstreamPoints"\n   AND "platformCoveredPoints" IS NOT NULL AND "platformCoveredPoints"="upstreamPoints"-"billedPoints" AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NULL)\n  OR (kind=\'REJECTED\' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0\n   AND "rejectedUpstreamStatus" IS NOT NULL AND "rejectedUpstreamStatus" IN (400,401,403,404,422,429) AND "actorId" IS NULL)\n  OR (kind=\'WAIVER\' AND "upstreamQuota" IS NULL AND "upstreamPoints" IS NULL AND "platformCoveredPoints" IS NULL AND "billedPoints"=0\n   AND "rejectedUpstreamStatus" IS NULL AND "actorId" IS NOT NULL AND length(btrim("actorId"))>0)\n ,false))\n);\nCREATE INDEX api_compute_billing_evidence_owner_time_idx ON api_compute_billing_evidence("ownerId","createdAt",id);\nCREATE FUNCTION ans_guard_api_billing_evidence() RETURNS trigger LANGUAGE plpgsql AS $$\nDECLARE task_ api_compute_requests%ROWTYPE; actor_ users%ROWTYPE;\nBEGIN\n IF TG_OP<>\'INSERT\' THEN RAISE EXCEPTION \'API_BILLING_EVIDENCE_IMMUTABLE\'; END IF;\n SELECT * INTO task_ FROM api_compute_requests WHERE id=NEW."requestId";\n IF NOT FOUND OR task_."userId"<>NEW."ownerId" OR task_.provider<>\'apic-codex\' OR task_."policyVersion"<>NEW."policyVersion"\n  OR task_.state NOT IN (\'RUNNING\',\'UNCERTAIN\') OR NEW."billedPoints">task_."authorizedPoints" THEN\n  RAISE EXCEPTION \'API_BILLING_EVIDENCE_REFERENCE_INVALID\';\n END IF;\n IF NEW.kind=\'WAIVER\' THEN\n  SELECT * INTO actor_ FROM users WHERE id=NEW."actorId";\n  IF NOT FOUND OR actor_.role<>\'ADMIN\' OR actor_.flagged OR actor_."deletedAt" IS NOT NULL\n   OR (jsonb_typeof(actor_."adminPermissions")=\'array\' AND NOT (actor_."adminPermissions" ? \'USERS_MANAGE\')) THEN\n   RAISE EXCEPTION \'API_BILLING_WAIVER_ACTOR_INVALID\';\n  END IF;\n END IF;\n RETURN NEW;\nEND $$;\nCREATE TRIGGER api_billing_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON api_compute_billing_evidence FOR EACH ROW EXECUTE FUNCTION ans_guard_api_billing_evidence();\n\n-- At commit, terminal evidence and the final request must describe the same event.\n-- Historical requests without evidence remain compatible; existing request guards stay intact.\nCREATE FUNCTION ans_check_api_billing_pair() RETURNS trigger LANGUAGE plpgsql AS $$\nDECLARE request_id_ TEXT; task_ api_compute_requests%ROWTYPE; evidence_ api_compute_billing_evidence%ROWTYPE;\nBEGIN\n IF TG_TABLE_NAME=\'api_compute_billing_evidence\' THEN request_id_:=NEW."requestId"; ELSE request_id_:=NEW.id; END IF;\n SELECT * INTO evidence_ FROM api_compute_billing_evidence WHERE "requestId"=request_id_;\n IF NOT FOUND THEN RETURN NULL; END IF;\n SELECT * INTO task_ FROM api_compute_requests WHERE id=request_id_;\n IF NOT FOUND OR task_."userId"<>evidence_."ownerId" OR task_.provider<>\'apic-codex\'\n  OR task_."policyVersion"<>evidence_."policyVersion" OR task_."settledPoints" IS NULL\n  OR task_."settledPoints"<>evidence_."billedPoints" OR task_."settledPoints">task_."authorizedPoints"\n  OR (evidence_.kind=\'VERIFIED\' AND (task_.state<>\'SETTLED\' OR task_.outcome IS DISTINCT FROM evidence_."upstreamRequestId"))\n  OR (evidence_.kind IN (\'REJECTED\',\'WAIVER\') AND (task_.state<>\'RELEASED\' OR task_."settledPoints"<>0))\n  OR (evidence_.kind=\'REJECTED\' AND evidence_."upstreamRequestId" IS NOT NULL AND task_.outcome IS DISTINCT FROM evidence_."upstreamRequestId") THEN\n  RAISE EXCEPTION \'API_BILLING_TERMINAL_PAIR_INVALID\';\n END IF;\n RETURN NULL;\nEND $$;\nCREATE CONSTRAINT TRIGGER api_billing_evidence_terminal_pair AFTER INSERT ON api_compute_billing_evidence\n DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_check_api_billing_pair();\nCREATE CONSTRAINT TRIGGER api_compute_request_billing_pair AFTER UPDATE ON api_compute_requests\n DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ans_check_api_billing_pair();\n'
PARENT_MIGRATION_COUNT = 78
PARENT_TABLE_COUNT = 123
COLUMN_SQL = """SELECT jsonb_build_object('table', c.relname, 'name', a.attname, 'position', a.attnum,
 'type', format_type(a.atttypid,a.atttypmod), 'notNull',a.attnotnull, 'identity',a.attidentity,
 'generated',a.attgenerated, 'default', pg_get_expr(d.adbin,d.adrelid), 'collation', coll.collname) AS item
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 LEFT JOIN pg_collation coll ON coll.oid=a.attcollation
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum"""
ALL_FUNCTION_SQL = GUARD_FUNCTION_SQL.replace("AND p.proname='agri_legacy_entry_guard' AND p.prokind='f'\n AND pg_get_function_identity_arguments(p.oid)=''", "AND p.prokind='f'").replace("ORDER BY n.nspname,p.proname", "ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)")


def reviewed_pending_sql(pending, migration_path):
    if pending != [EVIDENCE_MIGRATION]:
        raise RuntimeError("Only the exact reviewed gateway billing evidence migration may be rehearsed")
    expected = EVIDENCE_SQL.encode("utf-8")
    actual = (migration_path / EVIDENCE_MIGRATION / "migration.sql").read_bytes()
    if hashlib.sha256(expected).hexdigest() != EVIDENCE_SQL_SHA256 or actual != expected:
        raise RuntimeError("Gateway evidence SQL differs from reviewed exact LF bytes")
    return expected


def assert_evidence_catalog(before, after):
    expected = {
        'tables': lambda row: row['table'] == EVIDENCE_TABLE,
        'columns': lambda row: row['table'] == EVIDENCE_TABLE,
        'constraints': lambda row: row['table'] == EVIDENCE_TABLE or (row['table'] == 'api_compute_requests' and row['name'] == 'api_compute_request_billing_pair' and row['type'] == 't'),
        'indexes': lambda row: row['table'] == EVIDENCE_TABLE,
        'functions': lambda row: row['name'] in {EVIDENCE_FUNCTION, 'ans_check_api_billing_pair'} and row['identityArguments'] == '',
        'triggers': lambda row: (row['table'] == EVIDENCE_TABLE and row['name'] in {EVIDENCE_TRIGGER, 'api_billing_evidence_terminal_pair'}) or (row['table'] == 'api_compute_requests' and row['name'] == 'api_compute_request_billing_pair'),
    }
    additions = {}
    for kind, is_added in expected.items():
        old = [row for row in after[kind] if not is_added(row)]
        if old != before[kind] or any(is_added(row) for row in before[kind]):
            raise RuntimeError("Evidence DDL changed existing catalog objects: " + kind)
        additions[kind] = [row for row in after[kind] if is_added(row)]
    if [row['table'] for row in additions['tables']] != [EVIDENCE_TABLE]:
        raise RuntimeError("Unexpected evidence table set")
    expected_columns = [('id','text',True),('requestId','text',True),('ownerId','text',True),('kind','text',True),('upstreamRequestId','text',False),('upstreamQuota','bigint',False),('upstreamPoints','numeric(24,6)',False),('billedPoints','numeric(24,6)',True),('platformCoveredPoints','numeric(24,6)',False),('rejectedUpstreamStatus','integer',False),('actorId','text',False),('policyVersion','text',True),('createdAt','timestamp(3) with time zone',True)]
    if [(row['name'],row['type'],row['notNull']) for row in additions['columns']] != expected_columns:
        raise RuntimeError("Evidence column specification differs")
    expected_constraints = {
        (EVIDENCE_TABLE,'api_compute_billing_evidence_pkey','p'),
        (EVIDENCE_TABLE,'api_compute_billing_evidence_requestId_fkey','f'),
        (EVIDENCE_TABLE,'api_compute_billing_evidence_kind_check','c'),
        (EVIDENCE_TABLE,'api_compute_billing_evidence_request_key','u'),
        (EVIDENCE_TABLE,'api_compute_billing_evidence_valid','c'),
        (EVIDENCE_TABLE,'api_billing_evidence_terminal_pair','t'),
        ('api_compute_requests','api_compute_request_billing_pair','t'),
    }
    if {(row['table'],row['name'],row['type']) for row in additions['constraints']} != expected_constraints or len(additions['constraints']) != 7:
        raise RuntimeError("Evidence constraint specification differs")
    for constraint in additions['constraints']:
        deferred = constraint['type'] == 't'
        if constraint['validated'] is not True or constraint['deferrable'] is not deferred or constraint['initiallyDeferred'] is not deferred:
            raise RuntimeError("Evidence constraint timing/validation differs")
    if {row['name'] for row in additions['indexes']} != {'api_compute_billing_evidence_pkey','api_compute_billing_evidence_request_key','api_compute_billing_evidence_owner_time_idx'} or len(additions['indexes']) != 3:
        raise RuntimeError("Evidence index specification differs")
    if {row['name'] for row in additions['functions']} != {EVIDENCE_FUNCTION, 'ans_check_api_billing_pair'} or len(additions['functions']) != 2 or {row['name'] for row in additions['triggers']} != {EVIDENCE_TRIGGER, 'api_billing_evidence_terminal_pair', 'api_compute_request_billing_pair'} or len(additions['triggers']) != 3:
        raise RuntimeError("Evidence trigger/function set differs")
    for trigger in additions['triggers']:
        deferred = trigger['name'] != EVIDENCE_TRIGGER
        expected_type = {EVIDENCE_TRIGGER:31, 'api_billing_evidence_terminal_pair':5, 'api_compute_request_billing_pair':17}[trigger['name']]
        expected_function = 'ans_check_api_billing_pair' if deferred else EVIDENCE_FUNCTION
        if trigger['deferrable'] is not deferred or trigger['initiallyDeferred'] is not deferred or trigger['type'] != expected_type or trigger['enabled'] != 'O' or trigger['functionSchema'] != 'public' or trigger['function'] != expected_function or trigger['functionArguments'] != '':
            raise RuntimeError("Evidence trigger timing specification differs")
    return additions


def run(args, *, env=None, input=None, timeout=120):
    result = subprocess.run(args, input=input, text=True, env=env, capture_output=True, timeout=timeout)
    if result.returncode:
        # Never replay upstream connection errors: they may contain credentials.
        label = next((token for token in args if token in {"pg_dump", "pg_restore", "psql", "pg_isready"}), args[0])
        reason = "unspecified"
        for pattern, kind in [(r'schema .* already exists', 'schema already exists'), (r'Permission denied|permission denied', 'permission denied'),
                              (r'No such file', 'file unavailable'), (r'database system is starting', 'database starting'),
                              (r'type .* does not exist', 'required type unavailable'), (r'role .* does not exist', 'required role unavailable')]:
            if re.search(pattern, result.stderr): reason = kind; break
        raise RuntimeError("Operation failed: " + label + " (exit " + str(result.returncode) + "; " + reason + ")")
    return result.stdout


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def main():
    release_id = sys.argv[1]
    if release_id != "ans-hub-workflow-settlement-r5-20261013":
        raise RuntimeError("Invalid release identifier")
    release = (ROOT / release_id).resolve()
    if release.parent != ROOT or not (release / "source/prisma/migrations").is_dir():
        raise RuntimeError("Release source unavailable")
    backup = release / "backup"
    backup.mkdir(mode=0o700, exist_ok=True)
    if (backup / "public.dump").exists() or (backup / "verification.json").exists():
        raise RuntimeError("A prior backup exists; do not overwrite it")
    os.chmod(backup, 0o700)
    info = json.loads(run(["docker", "inspect", APP]))[0]
    if info['Id'] != '68fb78b77b23435211c15db75b36175f1b4cfe718a72c79c4f47cf62d15cc340' or info['Image'] != 'sha256:ae3e1ac69d80af2730fba4ac1b405f162515237fc27f499b84911568ffb5e5a9' or info['State'].get('Health', {}).get('Status') != 'healthy' or info['Config'].get('Labels', {}).get('org.ans.source-sha256') != '4211ff0db29061de8c9fa77615d56d4194622765d70fbd3a969f666738cb49f5' or info['Config'].get('Labels', {}).get('org.opencontainers.image.revision') != 'dae90a70a95e835f64617e726e0611727060a84f' or info['Config'].get('Labels', {}).get('org.ans.release') != 'ans-vibehub-fragment-r4-20261013':
        raise RuntimeError("Expected exact healthy R4 parent for fresh backup")
    if run(["docker", "exec", APP, "cat", "/app/.next/BUILD_ID"]).strip() != "ecLD9patE6KdDQoi-LmmY":
        raise RuntimeError("Expected exact R4 BUILD_ID for fresh backup")
    values = dict(item.split("=", 1) for item in info["Config"]["Env"] if "=" in item)
    snapshot_url = values.get("DIRECT_URL") or values["DATABASE_URL"]
    url = urlparse(snapshot_url)
    if not url.hostname or not url.hostname.endswith(".pooler.supabase.com") or url.port != 5432:
        raise RuntimeError("Expected the verified Supabase session connection")
    pg_env = os.environ.copy()
    pg_env.update(PGHOST=url.hostname, PGPORT=str(url.port), PGUSER=unquote(url.username or ""),
                  PGPASSWORD=unquote(url.password or ""), PGDATABASE=url.path.lstrip("/"),
                  PGSSLMODE=parse_qs(url.query).get("sslmode", ["require"])[0], PGCONNECT_TIMEOUT="20")
    pg_flags = [flag for key in ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE", "PGCONNECT_TIMEOUT"] for flag in ["-e", key]]
    quote = lambda name: '"' + name.replace('"', '""') + '"'
    holder = None
    restored = None
    try:
        js = r"""
const {PrismaClient}=require('@prisma/client'); const db=new PrismaClient();
const q=n=>'"'+n.replaceAll('"','""')+'"';
(async()=>{await db.$transaction(async tx=>{
 await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
 await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
 const snapshot=(await tx.$queryRawUnsafe('SELECT pg_export_snapshot() AS id'))[0].id;
 const names=await tx.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
 const tables={}; for(const {tablename} of names){tables[tablename]=(await tx.$queryRawUnsafe('SELECT count(*)::text AS count, md5(COALESCE(string_agg(md5(row_to_json(t)::text),\'\' ORDER BY md5(row_to_json(t)::text)),\'\')) AS digest FROM public.'+q(tablename)+' t'))[0];}
 const constraints=await tx.$queryRawUnsafe(CONSTRAINT_SQL);
 const indexes=await tx.$queryRawUnsafe(INDEX_SQL);
 const migrations=await tx.$queryRawUnsafe(MIGRATION_SQL);
 const guardFunctions=await tx.$queryRawUnsafe(GUARD_FUNCTION_SQL);
 const triggers=await tx.$queryRawUnsafe(TRIGGER_SQL);
 const columns=await tx.$queryRawUnsafe(COLUMN_SQL);
 const allFunctions=await tx.$queryRawUnsafe(ALL_FUNCTION_SQL);
 console.log(JSON.stringify({snapshot,tables,constraints,indexes,migrations,guardFunctions,triggers,columns,allFunctions}));
 await new Promise(resolve=>{process.stdin.once('data',resolve);process.stdin.resume();});
 },{isolationLevel:'RepeatableRead',timeout:600000,maxWait:15000});await db.$disconnect();})().catch(()=>{console.error('Snapshot operation failed');process.exitCode=1;});
""".replace("CONSTRAINT_SQL", json.dumps(CONSTRAINT_SQL)).replace("INDEX_SQL", json.dumps(INDEX_SQL)).replace("MIGRATION_SQL", json.dumps(MIGRATION_SQL)).replace("GUARD_FUNCTION_SQL", json.dumps(GUARD_FUNCTION_SQL)).replace("TRIGGER_SQL", json.dumps(TRIGGER_SQL)).replace("COLUMN_SQL", json.dumps(COLUMN_SQL)).replace("ALL_FUNCTION_SQL", json.dumps(ALL_FUNCTION_SQL))
        snapshot_env = {**os.environ, "DATABASE_URL": snapshot_url}
        holder = subprocess.Popen(["docker", "exec", "-i", "-e", "DATABASE_URL", APP, "node", "-e", js], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=snapshot_env)
        if not select.select([holder.stdout], [], [], 90)[0]:
            raise RuntimeError("Snapshot did not become ready")
        source = json.loads(holder.stdout.readline())
        if not re.fullmatch(r"[0-9A-Fa-f-]+", source["snapshot"]):
            raise RuntimeError("Invalid snapshot")
        migration_path = release / "source/prisma/migrations"
        migration_names = sorted(p.name for p in migration_path.iterdir() if p.is_dir() and (p / "migration.sql").is_file())
        line_ending_matches = []
        original_byte_witnesses = []
        for item in source["migrations"]:
            # Retain resolved failed attempts in the snapshot, but validate SQL
            # against the successful attempt rather than a superseded rollback.
            if item["rolled_back"]:
                continue
            path = migration_path / item["migration_name"] / "migration.sql"
            if not item["finished"] or item["rolled_back"] or not path.is_file():
                raise RuntimeError("Migration history is not a compatible prefix")
            raw = path.read_bytes()
            lf = raw.replace(b"\r\n", b"\n")
            variants = [raw, lf, lf.replace(b"\n", b"\r\n")]
            if item["checksum"] not in [hashlib.sha256(data).hexdigest() for data in variants]:
                # Some original Windows migrations contain mixed LF/CRLF bytes.
                # Accept only a preserved original whose exact SHA is recorded in
                # production and whose normalized SQL bytes equal this release.
                original = release / "migration-originals" / item["migration_name"] / "migration.sql"
                if not original.is_file():
                    raise RuntimeError("Migration SQL content changed")
                old = original.read_bytes()
                if hashlib.sha256(old).hexdigest() != item["checksum"] or old.replace(b"\r\n", b"\n") != lf:
                    raise RuntimeError("Migration SQL content changed")
                original_byte_witnesses.append({"name": item["migration_name"], "originalSha256": item["checksum"],
                                               "releaseSha256": hashlib.sha256(raw).hexdigest(), "normalizedSha256": hashlib.sha256(lf).hexdigest()})
            if hashlib.sha256(raw).hexdigest() != item["checksum"]:
                line_ending_matches.append(item["migration_name"])
        successful_names = {item["migration_name"] for item in source["migrations"] if item["finished"] and not item["rolled_back"]}
        pending = [name for name in migration_names if name not in successful_names]
        if len(successful_names) != PARENT_MIGRATION_COUNT or len(source["tables"]) != PARENT_TABLE_COUNT or EVIDENCE_TABLE in source["tables"]:
            raise RuntimeError("Expected exact R4 78 migration / 123 table parent without evidence table")
        reviewed_pending_sql(pending, migration_path)
        dump = backup / "public.dump"
        run(["docker", "run", "--rm", "--network", "host", *pg_flags, "-v", str(backup) + ":/backup", "--entrypoint", "pg_dump", IMAGE,
             "--format=custom", "--schema=public", "--no-owner", "--no-acl", "--lock-wait-timeout=20s", "--snapshot=" + source["snapshot"], "--file=/backup/public.dump"], env=pg_env, timeout=480)
        holder.communicate("release\n", timeout=30)
        if holder.returncode:
            raise RuntimeError("Snapshot transaction did not close cleanly")
        holder = None
        os.chmod(dump, 0o600)
        run(["docker", "run", "--rm", "-v", str(backup) + ":/backup:ro", "--entrypoint", "pg_restore", IMAGE, "--list", "/backup/public.dump"])
        restored = "ans-restore-" + secrets.token_hex(6)
        restore_env = os.environ.copy()
        restore_env.update(POSTGRES_USER="ans_restore", POSTGRES_PASSWORD=secrets.token_urlsafe(36), POSTGRES_DB="ans_restore")
        run(["docker", "run", "-d", "--name", restored, "--network", "none", "-e", "POSTGRES_USER", "-e", "POSTGRES_PASSWORD", "-e", "POSTGRES_DB",
             "-v", str(backup) + ":/backup:ro", IMAGE], env=restore_env)
        for _ in range(60):
            ready = subprocess.run(["docker", "exec", restored, "pg_isready", "-h", "127.0.0.1", "-U", "ans_restore", "-d", "ans_restore"], capture_output=True)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Restore instance unavailable")
        # Only this freshly created, network-none rehearsal database is cleared.
        run(["docker", "exec", restored, "psql", "-X", "-U", "ans_restore", "-d", "ans_restore", "-v", "ON_ERROR_STOP=1", "-c", "DROP SCHEMA public CASCADE"])
        run(["docker", "exec", restored, "pg_restore", "-U", "ans_restore", "-d", "ans_restore", "--no-owner", "--no-acl", "--exit-on-error", "--single-transaction", "/backup/public.dump"], timeout=480)
        def sql(statement):
            value = run(["docker", "exec", "-i", restored, "psql", "-X", "-q", "-U", "ans_restore", "-d", "ans_restore", "-v", "ON_ERROR_STOP=1", "-At"], input="SET TIME ZONE 'UTC';\n" + statement + ";\n")
            return [json.loads(line) for line in value.splitlines() if line.strip()]
        restored_tables = {}
        for name in source["tables"]:
            restored_tables[name] = sql("SELECT jsonb_build_object('count',count(*)::text,'digest',md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),''))) FROM public." + quote(name) + " t")[0]
        constraints = [{"item": item} for item in sql(CONSTRAINT_SQL)]
        indexes = [{"item": item} for item in sql(INDEX_SQL)]
        migrations = sql("SELECT row_to_json(t) FROM (" + MIGRATION_SQL + ") t")
        guard_functions = [{"item": item} for item in sql(GUARD_FUNCTION_SQL)]
        triggers = [{"item": item} for item in sql(TRIGGER_SQL)]
        columns = [{"item": item} for item in sql(COLUMN_SQL)]
        all_functions = [{"item": item} for item in sql(ALL_FUNCTION_SQL)]
        # Strict rendering compatibility witnessed on the isolated restored database.
        # Every differing CHECK must retain all metadata and reparse to the exact
        # restored definition. Any other constraint difference remains a failure.
        witnesses = []
        expected_constraints = source['constraints']
        if constraints != expected_constraints:
            expected_map = {(x['item']['table'], x['item']['name']): x for x in expected_constraints}
            actual_map = {(x['item']['table'], x['item']['name']): x for x in constraints}
            if expected_map.keys() != actual_map.keys():
                raise RuntimeError('Restore constraint set changed')
            for key, entry in expected_map.items():
                actual = actual_map[key]
                if actual == entry:
                    continue
                a, b = entry['item'], actual['item']
                # A PostgreSQL minor version may render explicit array casts
                # differently after pg_restore. Verify the source expression by
                # the restored server's parser, never by stripping SQL text.
                if a.get('type') != 'c' or b.get('type') != 'c' or {
                    key: value for key, value in a.items() if key != 'definition'
                } != {key: value for key, value in b.items() if key != 'definition'}:
                    raise RuntimeError('Restore constraint metadata changed')
                if not a['definition'].startswith('CHECK (') or not b['definition'].startswith('CHECK ('):
                    raise RuntimeError('Unrecognized CHECK definition')
                witness = 'ans_witness_' + secrets.token_hex(6)
                table = 'public.' + quote(a['table'])
                literal = lambda value: "'" + value.replace("'", "''") + "'"
                statement = ('BEGIN; ALTER TABLE ' + table + ' ADD CONSTRAINT ' + quote(witness) + ' ' + a['definition']
                             + "; SELECT jsonb_build_object('definition', pg_get_constraintdef(oid,true)) FROM pg_constraint WHERE conrelid="
                             + literal(table) + '::regclass AND conname=' + literal(witness) + '; ROLLBACK')
                canonical = sql(statement)[0]['definition']
                if canonical != b['definition']:
                    raise RuntimeError('Restore CHECK reparse mismatch')
                witnesses.append({'table': a['table'], 'name': a['name'], 'sourceSha256': digest(a['definition']),
                                  'reparsedSha256': digest(canonical), 'restoredSha256': digest(b['definition']),
                                  'witnessRolledBack': True})
            constraints_after = [{'item': item} for item in sql(CONSTRAINT_SQL)]
            if constraints_after != constraints:
                raise RuntimeError('Constraint witness changed restored schema')
            for name, before in restored_tables.items():
                after = sql("SELECT jsonb_build_object('count',count(*)::text,'digest',md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),''))) FROM public." + quote(name) + " t")[0]
                if after != before:
                    raise RuntimeError('Constraint witness changed restored data')
            expected_constraints = [actual_map[(x['item']['table'], x['item']['name'])] for x in expected_constraints]
        for label, actual in [("tables", restored_tables), ("constraints", constraints), ("indexes", indexes), ("migrations", migrations), ("guardFunctions", guard_functions), ("triggers", triggers), ("columns", columns), ("allFunctions", all_functions)]:
            if actual != (expected_constraints if label == "constraints" else source[label]):
                raise RuntimeError("Restore mismatch: " + label)
        # The parser witness is rolled back and never substitutes for the actual
        # restore rehearsal. Compare every existing column/function as well as data.
        def catalog():
            return {
                'tables': sql("SELECT jsonb_build_object('table',tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename"),
                'columns': sql(COLUMN_SQL), 'constraints': sql(CONSTRAINT_SQL),
                'indexes': sql(INDEX_SQL), 'functions': sql(ALL_FUNCTION_SQL), 'triggers': sql(TRIGGER_SQL),
            }
        before_catalog = catalog()
        source_catalog = {'tables': [{'table': name} for name in source['tables']],
            'columns': [row['item'] for row in source['columns']], 'constraints': [row['item'] for row in source['constraints']],
            'indexes': [row['item'] for row in source['indexes']], 'functions': [row['item'] for row in source['allFunctions']],
            'triggers': [row['item'] for row in source['triggers']]}
        expected_sql = reviewed_pending_sql(pending, migration_path)
        # Parse the exact reviewed SQL on the same isolated PG17 engine, snapshot
        # its complete canonical catalog, then prove ROLLBACK restored everything.
        witness_query = "SELECT jsonb_build_object(" + ",".join("'" + kind + "',(SELECT COALESCE(jsonb_agg(item),'[]'::jsonb) FROM (" + query + ") records)" for kind, query in {
            'tables': "SELECT jsonb_build_object('table',tablename) AS item FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
            'columns': COLUMN_SQL, 'constraints': CONSTRAINT_SQL, 'indexes': INDEX_SQL,
            'functions': ALL_FUNCTION_SQL, 'triggers': TRIGGER_SQL,
        }.items()) + ")"
        canonical = sql("BEGIN;\n" + expected_sql.decode() + "\n" + witness_query + "; ROLLBACK")[0]
        additions = assert_evidence_catalog(before_catalog, canonical)
        if catalog() != before_catalog:
            raise RuntimeError("Evidence parser witness did not fully roll back")
        run(["docker", "exec", "-i", restored, "psql", "-X", "-U", "ans_restore", "-d", "ans_restore", "-v", "ON_ERROR_STOP=1"], input="BEGIN;\n" + expected_sql.decode() + "\nCOMMIT;\n")
        after_catalog = catalog()
        if after_catalog != canonical:
            raise RuntimeError("Actual evidence rehearsal differs from exact parser witness")
        assert_evidence_catalog(before_catalog, after_catalog)
        # Only old CHECK renderings already proven by the server parser witness
        # differ between source and restore. Keep exact source bytes for live gates.
        source_constraint_map = {(row['table'],row['name']):row for row in source_catalog['constraints']}
        after_source_catalog = {**after_catalog, 'constraints': [
            source_constraint_map.get((row['table'],row['name']),row) for row in after_catalog['constraints']]}
        assert_evidence_catalog(source_catalog, after_source_catalog)
        if sql("SELECT count(*)::int FROM public." + quote(EVIDENCE_TABLE))[0] != 0:
            raise RuntimeError("New evidence table is not empty")
        for name, before in restored_tables.items():
            after = sql("SELECT jsonb_build_object('count',count(*)::text,'digest',md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),''))) FROM public." + quote(name) + " t")[0]
            if after != before: raise RuntimeError("Evidence rehearsal changed existing application data")
        if sql("SELECT row_to_json(t) FROM (" + MIGRATION_SQL + ") t") != migrations:
            raise RuntimeError("Evidence rehearsal changed historical migration records")
        if [{"item": item} for item in sql(GUARD_FUNCTION_SQL)] != guard_functions:
            raise RuntimeError("Evidence rehearsal changed the agri legacy guard")
        migration_rehearsal = [{"name": EVIDENCE_MIGRATION, "sqlSha256": EVIDENCE_SQL_SHA256,
            "isolatedNetwork": "none", "passed": True, "applicationDataPreserved": True,
            "existingCatalogPreserved": True, "existingColumnsPreserved": True,
            "constraintsPreserved": True, "indexesPreserved": True, "triggersPreserved": True,
            "existingFunctionsPreserved": True, "historicalMigrationsPreserved": True,
            "parserWitnessRolledBack": True, "newEvidenceEmpty": True,
            "newObjects": additions, "newObjectsDigest": digest(additions),
            "beforeCatalogDigest": digest(before_catalog), "afterCatalogDigest": digest(after_catalog)}]
        current = json.loads(run(["docker", "inspect", APP]))[0]
        if current['Id'] != info['Id'] or current['Image'] != info['Image'] or current['Config'].get('Labels') != info['Config'].get('Labels') or current['State'].get('Health', {}).get('Status') != 'healthy' or run(['docker','exec',APP,'cat','/app/.next/BUILD_ID']).strip() != 'ecLD9patE6KdDQoi-LmmY':
            raise RuntimeError("Production changed during backup/restore rehearsal")
        report = {"release": release_id, "sourceImage": info["Image"], "backupBytes": dump.stat().st_size,
                  "backupSha256": hashlib.sha256(dump.read_bytes()).hexdigest(), "schema": "public",
                  "snapshotConsistent": True, "restorePassed": True, "restorePostgresImage": IMAGE,
                  "tableCount": len(source["tables"]), "tableCounts": {k: v["count"] for k, v in source["tables"].items()},
                  "dataDigest": digest(source["tables"]), "constraintsDigest": digest(constraints), "sourceConstraintsDigest": digest(source["constraints"]), "checkReparseWitnesses": witnesses, "opsScriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "indexesDigest": digest(indexes),
                  "sourceCatalogDigest": digest(source_catalog), "afterSourceCatalogDigest": digest(after_source_catalog), "columnsDigest": digest(columns), "allFunctionsDigest": digest(all_functions), "beforeCatalogDigest": digest(before_catalog), "afterCatalogDigest": digest(after_catalog), "newObjectsDigest": digest(additions), "guardFunctionsDigest": digest(guard_functions), "triggersDigest": digest(triggers), "migrationsDigest": digest(migrations), "appliedMigrationCount": len(successful_names), "rolledBackAttemptCount": sum(item["rolled_back"] for item in migrations), "pendingMigrations": pending, "migrationRehearsal": migration_rehearsal, "lineEndingOnlyMatches": line_ending_matches, "originalByteWitnesses": original_byte_witnesses,
                  "checked": ["all existing public columns and functions", "exact reviewed additive evidence parser witness and actual isolated rehearsal", "all public table row counts and content digests", "all public constraints", "all public indexes", "guard function definition and metadata", "all public user triggers", "migration names and checksums (exact or proven LF/CRLF-only equivalence)"],
                  "limits": "Application public schema backup only; not Supabase platform schemas or external object storage."}
        report_path = backup / "verification.json"
        report_path.write_text(json.dumps(report, indent=2) + "\n")
        os.chmod(report_path, 0o600)
        print(json.dumps(report))
    finally:
        if holder:
            holder.communicate("release\n", timeout=30)
        if restored:
            run(["docker", "rm", "-f", restored])


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Error messages from this script are fixed/sanitized; upstream detail is not replayed.
        print("Backup verification failed: " + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
