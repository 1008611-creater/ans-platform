/**
 * Real PostgreSQL regression for READINESS-RESTORE-001.
 * Run: node scripts/agri-task-restore-integration.mjs
 * Requires PostgreSQL server tools (PG_BIN or PATH) and installed Prisma CLI.
 * Creates its own loopback-only cluster, never uses an existing DATABASE_URL,
 * preserves evidence in AGRI_TASK_RESTORE_REPORT_DIR (or a temporary directory).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const prisma = require.resolve('prisma/build/index.js');
const fix = '20261015210000_agri_task_restore_helpers';
const migrations = path.join(root, 'prisma/migrations');
const reportDir = fs.mkdtempSync(path.join(process.env.AGRI_TASK_RESTORE_REPORT_DIR || os.tmpdir(), 'agri-task-restore-'));
const pgBin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const data = path.join(reportDir, 'postgres');
const password = randomBytes(32).toString('hex');
const user = 'agri_restore_fixture';
const env = { ...process.env };
for (const name of Object.keys(env)) {
  if (/(?:API_KEY|SECRET|TOKEN|DATABASE_URL|DIRECT_URL|BASE_URL|SENTRY|OIDC|SMTP|S3_|ANS_AGRI_EVIDENCE_)/i.test(name)) delete env[name];
}
env.PGPASSWORD = password;
const report = { passed: false, productionChanged: false, checks: [], reportDir };
let started = false;
let connection;
function run(executable, args, label, { expectedFailure = false, cwd = root } = {}) {
  const isControl = label === 'start' || label === 'stop';
  const fd = isControl ? fs.openSync(path.join(reportDir, label + '.log'), 'a') : undefined;
  let result;
  try {
    result = spawnSync(executable, args, {
      cwd, env, windowsHide: true, encoding: 'utf8', timeout: 180000,
      maxBuffer: 16 * 1024 ** 2,
      ...(isControl ? { stdio: ['ignore', fd, fd] } : {}),
    });
  } finally { if (fd !== undefined) fs.closeSync(fd); }
  const output = ((result.stdout || '') + (result.stderr || '')).replaceAll(password, '[fixture-password]');
  if (!isControl) fs.writeFileSync(path.join(reportDir, label + '.log'), output);
  if (result.error) throw new Error(label + ': ' + result.error.message);
  if (expectedFailure) assert.notEqual(result.status, 0, label + ' should fail on the old helpers');
  else assert.equal(result.status, 0, label + ' failed; see report log');
  return output;
}
function pg(tool, args, label, options) {
  return run(path.join(pgBin, tool + (process.platform === 'win32' ? '.exe' : '')), args, label, options);
}
function sql(db, text, label, options) {
  const file = path.join(reportDir, label + '.sql');
  fs.writeFileSync(file, text);
  return pg('psql', [...connection, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', db, '-f', file], label, options).trim();
}
const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const input = latestAt => ({ from: 'LOCAL FIXTURE', needed: 'Restore check', latestAt });
const date = (state, at) => ({ state, at });
const validDates = [date('UNKNOWN', null), date('TENTATIVE', '2026-11-01T12:00:00Z'), date('CONFIRMED', '2026-11-01T12:00:00+08:00')];
const cases = [
  ...validDates.map(value => ['date', value, true]),
  ['date', date('UNKNOWN', '2026-11-01T12:00:00Z'), false],
  ['date', date('CONFIRMED', 'not-a-date'), false],
  ['date', date('CONFIRMED', '2026-99-01T12:00:00Z'), false],
  ['date', date('TENTATIVE', null), false],
  ['date', { ...validDates[0], extra: true }, false],
  ['date', null, false],
  ...validDates.map(value => ['input', input(value), true]),
  ['input', { ...input(validDates[0]), from: '' }, false],
  ['input', { ...input(validDates[0]), needed: ' ' }, false],
  ['input', { ...input(validDates[0]), extra: 1 }, false],
  ['input', null, false],
  ['inputs', { schemaVersion: 1, items: [] }, true],
  ['inputs', { schemaVersion: 1, items: validDates.map(input) }, true],
  ['inputs', { schemaVersion: 1, items: [input(validDates[1]), {}] }, false],
  ['inputs', { schemaVersion: 1, items: Array(21).fill(input(validDates[0])) }, false],
  ['inputs', { schemaVersion: 2, items: [] }, false],
  ['inputs', null, false],
];
function matrix(db, searchPath, label) {
  const output = sql(db, `SET search_path = ${searchPath};\n` + cases.map(([kind, value]) =>
    `SELECT public.ans_agri_task_${kind}_valid(${literal(value)});`).join('\n'), label);
  assert.deepEqual(output.split(/\r?\n/), cases.map(([, , valid]) => valid ? 't' : 'f'));
}
const snapshotSQL = `SELECT jsonb_build_object(
 'tasks',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.agri_personal_tasks t),
 'events',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.agri_task_events t),
 'receipts',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.agri_task_command_receipts t),
 'shares',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.agri_task_shares t),
 'constraints',(SELECT jsonb_agg(jsonb_build_array(conname,contype,convalidated,pg_get_constraintdef(oid)) ORDER BY conname)
   FROM pg_constraint WHERE conrelid IN ('public.agri_personal_tasks'::regclass,'public.agri_task_events'::regclass,'public.agri_task_command_receipts'::regclass,'public.agri_task_shares'::regclass))
)::text;`;
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}
try {
  const port = await freePort();
  report.port = port;
  connection = ['-h', '127.0.0.1', '-p', String(port), '-U', user];
  const pwFile = path.join(reportDir, 'init-password');
  fs.writeFileSync(pwFile, password, { flag: 'wx', mode: 0o600 });
  try { pg('initdb', ['-D', data, '-U', user, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--pwfile', pwFile, '--encoding=UTF8', '--locale=C'], 'initdb'); }
  finally { fs.unlinkSync(pwFile); }
  pg('pg_ctl', ['-D', data, '-l', path.join(reportDir, 'server.log'), '-o', '-h 127.0.0.1 -p ' + port, '-w', 'start'], 'start');
  started = true;
  const db = 'agri_restore_fixture';
  pg('createdb', [...connection, db], 'create-baseline');
  const baseline = path.join(reportDir, 'baseline');
  fs.mkdirSync(path.join(baseline, 'prisma/migrations'), { recursive: true });
  fs.copyFileSync(path.join(root, 'prisma/schema.prisma'), path.join(baseline, 'prisma/schema.prisma'));
  const names = fs.readdirSync(migrations).filter(name => fs.statSync(path.join(migrations, name)).isDirectory());
  assert.ok(names.includes(fix));
  for (const name of fs.readdirSync(migrations)) {
    if (name !== fix) fs.cpSync(path.join(migrations, name), path.join(baseline, 'prisma/migrations', name), { recursive: true });
  }
  const url = `postgresql://${user}:${password}@127.0.0.1:${port}/${db}`;
  env.DATABASE_URL = url;
  env.DIRECT_URL = url;
  run(process.execPath, [prisma, 'migrate', 'deploy'], 'baseline-migrations', { cwd: baseline });
  matrix(db, 'public, pg_catalog', 'old-public-matrix');
  const fixture = `INSERT INTO public.users (id,email,username,"updatedAt") VALUES
 ('restore-owner','restore-owner@example.invalid','restore-owner',CURRENT_TIMESTAMP),
 ('restore-reader','restore-reader@example.invalid','restore-reader',CURRENT_TIMESTAMP);
 INSERT INTO public.competitions (id,title) VALUES ('restore-competition','LOCAL FIXTURE');\n` +
    validDates.map((due, index) => {
      const id = 'restore-task-' + index;
      return `INSERT INTO public.agri_personal_tasks (id,"competitionId","ownerId",title,stage,status,"dueState","dueAt","acceptanceCriteria","inputRequirements","blockingInput","updatedAt") VALUES
       ('${id}','restore-competition','restore-owner','LOCAL FIXTURE','PREPARATION','BLOCKED','${due.state}',${due.at ? "'" + due.at + "'" : 'NULL'},'Restore retains exact task and history',${literal({ schemaVersion: 1, items: [input(due)] })},${literal(input(due))},CURRENT_TIMESTAMP);
       INSERT INTO public.agri_task_events (id,"taskId","actorId",revision,action,snapshot) VALUES
       ('restore-event-${index}','${id}','restore-owner',1,'create',jsonb_build_object('schemaVersion',1,'task',(SELECT to_jsonb(t) FROM public.agri_personal_tasks t WHERE id='${id}')));
       INSERT INTO public.agri_task_command_receipts (id,"competitionId","actorId",operation,"idempotencyKey","requestHash","taskId","appliedRevision") VALUES
       ('restore-receipt-${index}','restore-competition','restore-owner','create','restore-create-${index}',repeat('a',64),'${id}',1);`;
    }).join('\n') + `\nINSERT INTO public.agri_task_shares (id,"taskId","userId","sharedById") VALUES ('restore-share','restore-task-0','restore-reader','restore-owner');`;
  sql(db, fixture, 'seed-real-task-history');
  const before = sql(db, snapshotSQL, 'before-migration');
  assert.equal(JSON.parse(before).tasks.length, 3);
  const oldError = sql(db, `SET search_path = ''; SELECT public.ans_agri_task_input_valid(${literal(input(validDates[0]))});`, 'old-empty-path', { expectedFailure: true });
  assert.match(oldError, /function ans_agri_task_date_valid\(jsonb\) does not exist/);
  const oldDump = path.join(reportDir, 'before.backup');
  pg('pg_dump', [...connection, '-Fc', '-f', oldDump, db], 'dump-before');
  pg('createdb', [...connection, 'agri_restore_before'], 'create-before-restore');
  const restoreError = pg('pg_restore', [...connection, '--exit-on-error', '-d', 'agri_restore_before', oldDump], 'restore-before-expected-failure', { expectedFailure: true });
  assert.match(restoreError, /function ans_agri_task_date_valid\(jsonb\) does not exist/);
  report.checks.push('Old helpers reproduce both empty-search-path failure and standard full pg_restore failure with real tasks/events/receipts/shares');
  const oldMetadata = sql(db, `SELECT jsonb_agg(jsonb_build_array(oid,proname,provolatile,proisstrict,prosecdef,prorettype,proargtypes::text,proconfig) ORDER BY proname)::text FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'ans_agri_task_%_valid';`, 'helper-metadata-before');
  run(process.execPath, [prisma, 'migrate', 'deploy'], 'apply-fix');
  assert.equal(sql(db, snapshotSQL, 'after-migration'), before);
  assert.equal(sql(db, `SELECT jsonb_agg(jsonb_build_array(oid,proname,provolatile,proisstrict,prosecdef,prorettype,proargtypes::text,proconfig) ORDER BY proname)::text FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'ans_agri_task_%_valid';`, 'helper-metadata-after'), oldMetadata);
  const history = JSON.parse(sql(db, `SELECT jsonb_agg(jsonb_build_object('name',migration_name,'checksum',checksum,'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL) ORDER BY migration_name)::text FROM public._prisma_migrations;`, 'migration-history'));
  assert.equal(history.length, names.length);
  for (const item of history) {
    assert.ok(item.finished && !item.rolledBack);
    assert.equal(item.checksum, createHash('sha256').update(fs.readFileSync(path.join(migrations, item.name, 'migration.sql'))).digest('hex'));
  }
  report.migrationCount = history.length;
  report.checks.push('Sequential baseline-to-fix Prisma deploy; every migration checksum matches; task/history/share/receipt bytes and constraints unchanged; helper OIDs/attributes unchanged');
  matrix(db, "''", 'new-empty-path-matrix');
  matrix(db, 'public, pg_catalog', 'new-public-matrix');
  sql(db, `CREATE SCHEMA restore_shadow;
    CREATE FUNCTION restore_shadow.ans_agri_task_instant_valid(text) RETURNS boolean LANGUAGE SQL IMMUTABLE AS 'SELECT false';
    CREATE FUNCTION restore_shadow.ans_agri_task_date_valid(jsonb) RETURNS boolean LANGUAGE SQL IMMUTABLE AS 'SELECT false';
    CREATE FUNCTION restore_shadow.ans_agri_task_input_valid(jsonb) RETURNS boolean LANGUAGE SQL IMMUTABLE AS 'SELECT false';`, 'create-shadow-helpers');
  matrix(db, 'restore_shadow, pg_catalog', 'new-shadow-path-matrix');
  sql(db, 'DROP SCHEMA restore_shadow CASCADE;', 'drop-owned-shadow-schema');
  report.checks.push(`${cases.length} positive/negative validation cases match old behavior under public, empty, and shadow search paths`);
  // CHECK expressions store their direct function OIDs. Inspect nested custom calls
  // separately: quoted-string SQL/PLpgSQL bodies do not record all such dependencies.
  const functions = JSON.parse(sql(db, `SELECT jsonb_agg(jsonb_build_object('name',proname,'body',prosrc) ORDER BY proname)::text FROM pg_proc WHERE pronamespace='public'::regnamespace;`, 'public-function-bodies'));
  const checkFunctions = JSON.parse(sql(db, `SELECT jsonb_agg(x ORDER BY name)::text FROM (SELECT DISTINCT p.proname AS name FROM pg_constraint c JOIN pg_depend d ON d.classid='pg_constraint'::regclass AND d.objid=c.oid AND d.refclassid='pg_proc'::regclass JOIN pg_proc p ON p.oid=d.refobjid WHERE c.contype='c' AND p.pronamespace='public'::regnamespace) x;`, 'check-function-dependencies'));
  const byName = new Map(functions.map(item => [item.name, item.body]));
  const pending = checkFunctions.map(item => item.name);
  const inspected = new Set();
  while (pending.length) {
    const name = pending.pop();
    if (inspected.has(name)) continue;
    inspected.add(name);
    const body = byName.get(name);
    assert.ok(body !== undefined);
    for (const callee of byName.keys()) {
      const calls = [...body.matchAll(new RegExp(`(?:\\b(public)\\.)?\\b${callee}\\s*\\(`, 'g'))];
      for (const call of calls) assert.equal(call[1], 'public', `${name} has an unqualified custom call to ${callee}`);
      if (calls.length) pending.push(callee);
    }
  }
  report.checkFunctionsInspected = [...inspected].sort();
  const dump = path.join(reportDir, 'after.backup');
  pg('pg_dump', [...connection, '-Fc', '-f', dump, db], 'dump-after');
  pg('createdb', [...connection, 'agri_restore_after'], 'create-after-restore');
  pg('pg_restore', [...connection, '--exit-on-error', '-d', 'agri_restore_after', dump], 'restore-after');
  const restored = JSON.parse(sql('agri_restore_after', snapshotSQL, 'restored-task-history'));
  const original = JSON.parse(before);
  // pg_dump/pg_restore reparses CHECK SQL and may flatten equivalent AND groups.
  // Compare row bytes and constraint identity/type/validation across databases;
  // the stronger exact definition comparison above covers the migration itself.
  for (const key of ['tasks', 'events', 'receipts', 'shares']) assert.deepEqual(restored[key], original[key]);
  assert.deepEqual(restored.constraints.map(item => item.slice(0, 3)), original.constraints.map(item => item.slice(0, 3)));
  matrix('agri_restore_after', "''", 'restored-empty-path-matrix');
  const invalidTask = sql('agri_restore_after', `INSERT INTO public.agri_personal_tasks (id,"competitionId","ownerId",title,stage,status,"acceptanceCriteria","inputRequirements","updatedAt") VALUES ('invalid-task','restore-competition','restore-owner','LOCAL FIXTURE','PREPARATION','NOT_STARTED','Must fail','{"schemaVersion":1,"items":[{}]}',CURRENT_TIMESTAMP);`, 'restored-invalid-task', { expectedFailure: true });
  assert.match(invalidTask, /agri_task_state_valid/);
  const invalidFK = sql('agri_restore_after', `INSERT INTO public.agri_task_command_receipts (id,"competitionId","actorId",operation,"idempotencyKey","requestHash","createdTaskCount") VALUES ('invalid-fk','missing-competition','restore-owner','initialize','invalid-fk',repeat('b',64),0);`, 'restored-invalid-fk', { expectedFailure: true });
  assert.match(invalidFK, /foreign key constraint/);
  report.checks.push('Unmodified standard full pg_dump/pg_restore succeeds; independent fresh psql processes read identical rows/constraints; invalid task and orphan receipt remain rejected');
  // Recover a pre-fix backup without editing its exported SQL: install the
  // exact additive repair after pre-data, then load data and finish constraints.
  const rescue = 'agri_restore_prefixed_backup';
  pg('createdb', [...connection, rescue], 'create-prefix-backup-recovery');
  pg('pg_restore', [...connection, '--exit-on-error', '--section=pre-data', '-d', rescue, oldDump], 'prefix-backup-pre-data');
  sql(rescue, fs.readFileSync(path.join(migrations, fix, 'migration.sql'), 'utf8'), 'prefix-backup-helper-repair');
  pg('pg_restore', [...connection, '--exit-on-error', '--section=data', '-d', rescue, oldDump], 'prefix-backup-data');
  pg('pg_restore', [...connection, '--exit-on-error', '--section=post-data', '-d', rescue, oldDump], 'prefix-backup-post-data');
  const rescueURL = new URL(url);
  rescueURL.pathname = '/' + rescue;
  env.DATABASE_URL = rescueURL.href;
  env.DIRECT_URL = env.DATABASE_URL;
  run(process.execPath, [prisma, 'migrate', 'deploy'], 'prefix-backup-reconcile-migration-history');
  const rescued = JSON.parse(sql(rescue, snapshotSQL, 'prefix-backup-task-history'));
  for (const key of ['tasks', 'events', 'receipts', 'shares']) assert.deepEqual(rescued[key], original[key]);
  assert.deepEqual(rescued.constraints.map(item => item.slice(0, 3)), original.constraints.map(item => item.slice(0, 3)));
  matrix(rescue, "''", 'prefix-backup-empty-path-matrix');
  assert.equal(Number(sql(rescue, 'SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;', 'prefix-backup-migration-count')), names.length);
  report.checks.push('Pre-fix backup recovery verified with original pg_restore sections plus the exact helper repair before data, followed by normal Prisma migration history reconciliation');
  report.rollback = 'Keep additive helper migration when rolling the application back: no table/column/type change and no data rewrite. Do not restore the broken unqualified bodies. Before production, take a full pre-migration backup and verify its isolated restore with the helper fix; a raw pre-fix dump retains the known restore defect. Tested recovery: restore pre-data, apply this exact helper SQL, restore data/post-data, then Prisma deploy reconciles its migration receipt.';
  report.standardPgRestorePassed = true;
  report.passed = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  if (started || fs.existsSync(path.join(data, 'postmaster.pid'))) {
    try { pg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'], 'stop'); report.ownPostgresStopped = true; }
    catch (error) { report.stopError = error.message; report.passed = false; process.exitCode = 1; }
  }
  fs.writeFileSync(path.join(reportDir, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}