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
 'type', c.contype, 'validated', c.convalidated, 'definition', pg_get_constraintdef(c.oid, true)) AS item
 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 WHERE n.nspname='public' ORDER BY r.relname,c.conname"""
INDEX_SQL = "SELECT jsonb_build_object('table', tablename, 'name', indexname, 'definition', indexdef) AS item FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"
MIGRATION_SQL = 'SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY migration_name'


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
    if not re.fullmatch(r"ans-[a-z0-9-]{8,64}", release_id):
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
 console.log(JSON.stringify({snapshot,tables,constraints,indexes,migrations}));
 await new Promise(resolve=>{process.stdin.once('data',resolve);process.stdin.resume();});
 },{isolationLevel:'RepeatableRead',timeout:600000,maxWait:15000});await db.$disconnect();})().catch(()=>{console.error('Snapshot operation failed');process.exitCode=1;});
""".replace("CONSTRAINT_SQL", json.dumps(CONSTRAINT_SQL)).replace("INDEX_SQL", json.dumps(INDEX_SQL)).replace("MIGRATION_SQL", json.dumps(MIGRATION_SQL))
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
        for label, actual in [("tables", restored_tables), ("constraints", constraints), ("indexes", indexes), ("migrations", migrations)]:
            if actual != (expected_constraints if label == "constraints" else source[label]):
                raise RuntimeError("Restore mismatch: " + label)
        report = {"release": release_id, "sourceImage": info["Image"], "backupBytes": dump.stat().st_size,
                  "backupSha256": hashlib.sha256(dump.read_bytes()).hexdigest(), "schema": "public",
                  "snapshotConsistent": True, "restorePassed": True, "restorePostgresImage": IMAGE,
                  "tableCount": len(source["tables"]), "tableCounts": {k: v["count"] for k, v in source["tables"].items()},
                  "dataDigest": digest(source["tables"]), "constraintsDigest": digest(constraints), "sourceConstraintsDigest": digest(source["constraints"]), "checkReparseWitnesses": witnesses, "opsScriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "indexesDigest": digest(indexes),
                  "migrationsDigest": digest(migrations), "appliedMigrationCount": len(successful_names), "rolledBackAttemptCount": sum(item["rolled_back"] for item in migrations), "pendingMigrations": pending, "lineEndingOnlyMatches": line_ending_matches, "originalByteWitnesses": original_byte_witnesses,
                  "checked": ["all public table row counts and content digests", "all public constraints", "all public indexes", "migration names and checksums (exact or proven LF/CRLF-only equivalence)"],
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
