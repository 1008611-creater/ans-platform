import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync, statfsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { defaultSettings, recipeFor, SHOTS, FORMATS, assertCreativeText } from './recipe.mjs';
import { hasCompanion, placeFor, referencePlan } from './destinations.mjs';
import { adaptStory, storyFor } from './stories.mjs';
import { characterKey, characterHook } from './characters.mjs';
import { initializeAccess, authorizeProject, consumeAccess, purgeAccess } from './access.mjs';
import {initializeAccounts,purgeAccounts} from './accounts.mjs';
import {initializeGallery,purgeGallery,galleryBytes} from './gallery.mjs';
import {initializeSubmissions,pendingSubmission,checkSubmission} from './submissions.mjs';
const roleKey=role=>{if(!['identity','composition','companion','location'].includes(role))throw new StudioError('INVALID_INPUT');return role+'Id';};
export const RETENTION_DAYS = 30;
export class StudioError extends Error { constructor(code, status=400) { super(code); this.code=code; this.status=status; } }
const parse = x => JSON.parse(x);
const timestamp = () => Date.now();
const validate = (settings,note='') => {try {assertCreativeText(settings,note);}catch(e){throw new StudioError(e.message);} }; 
export class StudioStore {
  constructor(directory) {
    this.directory = resolve(directory); mkdirSync(join(this.directory,'assets'),{recursive:true,mode:0o700});
    this.db = new DatabaseSync(join(this.directory,'studio.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL);'+
      'CREATE INDEX IF NOT EXISTS project_owner ON projects(owner);'+
      'CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, data TEXT NOT NULL);'+
      'CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, requestkey TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL, UNIQUE(project,requestkey));'+
      'CREATE INDEX IF NOT EXISTS job_status ON jobs(status,created);'+
      'CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, job TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, data TEXT NOT NULL, created INTEGER NOT NULL);'+
      'CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY, value INTEGER NOT NULL, expires INTEGER NOT NULL);'+
      'CREATE TABLE IF NOT EXISTS garbage(file TEXT PRIMARY KEY);'+
      'CREATE TABLE IF NOT EXISTS worker(id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, heartbeat INTEGER NOT NULL);'+
      'PRAGMA user_version=2;'
    );
    initializeAccess(this.db);initializeSubmissions(this.db);initializeAccounts(this.db);initializeGallery(this.db);
  }
  close() { this.db.close(); }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); this.pendingFiles=[]; try { const r=fn(); this.db.exec('COMMIT'); this.pendingFiles=null; return r; } catch(e) { this.db.exec('ROLLBACK'); for(const file of this.pendingFiles||[]) {try {unlinkSync(join(this.directory,'assets',file));}catch {this.db.prepare('INSERT OR IGNORE INTO garbage VALUES(?)').run(file);} } this.pendingFiles=null; throw e; } }
  budget(key, limit, windowMs=3600000) {
    return this.transaction(()=>{ const t=timestamp(), r=this.db.prepare('SELECT * FROM counters WHERE key=?').get(key);
      if(r && r.expires>t && r.value>=limit) throw new StudioError('RATE_LIMIT',429);
      this.db.prepare('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires').run(key,r && r.expires>t?r.value+1:1,r && r.expires>t?r.expires:t+windowMs);
    });
  }
  create(owner, settings=defaultSettings()) {
    validate(settings);
    if(this.list(owner).length>=20) throw new StudioError('PROJECT_LIMIT',429);
    const p={id:randomUUID(),owner,settings,revision:1,planRevision:1,people:1,recipe:recipeFor(settings),identityId:null,compositionId:null,companionId:null,locationId:null,consent:false,createdAt:timestamp(),updatedAt:timestamp(),expiresAt:timestamp()+RETENTION_DAYS*86400000,results:[]};
    this.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?)').run(p.id,owner,JSON.stringify(p),p.updatedAt,p.expiresAt); return this.view(p);
  }
  sequel(owner,id,placeId,expectedRevision) {return this.transaction(()=>{
    const source=this.get(owner,id);if(source.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
    const play=source.settings.play||'companion',story=adaptStory(source.settings,placeId,play);
    const settings={...source.settings,placeId,play,story,idea:'',shotNotes:{}};validate(settings);const place=placeFor(settings);
    settings.title=storyFor(settings)?.title||characterHook(place,settings);
    const created=this.create(owner,settings),p=this.get(owner,created.id);
    // Explicitly requested on-site reuse: never carry old location/composition, free text, jobs or results.
    for(const role of ['identity',...(hasCompanion(settings)?['companion']:[])]){const oldId=source[role+'Id'];if(!oldId)continue;const a=this.asset(owner,id,oldId);const {id:oldAsset,projectId,role:oldRole,file,bytes,sha256,createdAt,...metadata}=a;const copy=this.saveAsset(p.id,role,this.readAsset(a),metadata);p[role+'Id']=copy.id;}
    p.consent=source.consent&&!!(p.identityId||p.companionId);return this.view(this.write(p));
  });}
  remix(owner,id,expectedRevision,planRevision) {return this.transaction(()=>{
    const source=this.get(owner,id);if(source.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
    const settings=this.view(source).plans[planRevision??source.planRevision];if(!settings)throw new StudioError('INVALID_INPUT');
    const snapshot=planRevision&&planRevision!==source.planRevision?this.jobs(id).find(j=>j.planRevision===planRevision)?.snapshot:source;
    if(!snapshot)throw new StudioError('INVALID_INPUT');
    const created=this.create(owner,structuredClone(settings)),p=this.get(owner,created.id);
    for(const role of ['identity','companion','location','composition']){const oldId=snapshot[role+'Id'];if(!oldId)continue;const a=this.asset(owner,id,oldId);const {id:oldAsset,projectId,role:oldRole,file,bytes,sha256,createdAt,...metadata}=a;const copy=this.saveAsset(p.id,role,this.readAsset(a),metadata);p[role+'Id']=copy.id;}
    p.consent=!!snapshot.consent;return this.view(this.write(p));
  });}
  continueInAccount(sourceOwner,id,expectedRevision,owner) {return this.transaction(()=>{
    const source=this.get(sourceOwner,id);
    if(source.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
    if(this.active(id))throw new StudioError('PLAN_LOCKED',409);
    if(pendingSubmission(this,id))throw new StudioError('SUBMISSION_PENDING',409);
    // Explicitly copy only this saved plan and its current references. Never move jobs, results or grants.
    const created=this.create(owner,structuredClone(source.settings)),p=this.get(owner,created.id);
    for(const role of ['identity','companion','location','composition']) {
      const oldId=source[role+'Id'];if(!oldId)continue;
      const a=this.asset(sourceOwner,id,oldId),buffer=this.readAsset(a);
      if(buffer.length!==a.bytes||createHash('sha256').update(buffer).digest('hex')!==a.sha256)throw new StudioError('REFERENCE_UNAVAILABLE',409);
      const {id:oldAsset,projectId,role:oldRole,file,bytes,sha256,createdAt,...metadata}=a;
      p[role+'Id']=this.saveAsset(p.id,role,buffer,metadata).id;
    }
    p.consent=!!source.consent;return this.view(this.write(p));
  });}
  addBuiltinReference(owner,id,role,buffer,metadata,consent,expectedRevision) {
    return this.addReference(owner,id,role,buffer,metadata,consent,expectedRevision);
  }
  prepareBuiltinReferences(owner,id,inputs,consent,expectedRevision) {
    return this.transaction(()=>{
      const p=this.get(owner,id);
      if(this.active(id))throw new StudioError('PLAN_LOCKED',409);
      if(p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
      if(!consent)throw new StudioError('CONSENT_REQUIRED');
      if(!Array.isArray(inputs)||inputs.length>2||new Set(inputs.map(x=>x.role)).size!==inputs.length||inputs.some(x=>!['companion','location'].includes(x.role)||x.metadata.builtin!==true))throw new StudioError('INVALID_INPUT');
      let added=false;
      for(const input of inputs){
        if(p[input.role+'Id'])continue;
        if(this.db.prepare("SELECT COUNT(*) AS n FROM assets WHERE project=? AND json_extract(data,'$.role') IN ('identity','composition','companion','location')").get(id).n>=6)throw new StudioError('REFERENCE_LIMIT');
        const a=this.saveAsset(id,input.role,input.buffer,input.metadata);p[input.role+'Id']=a.id;added=true;
      }
      if(added){p.consent=true;p.revision++;p.planRevision=p.revision;p.recipe=recipeFor(p.settings);p.continuity=null;this.write(p);}
      return this.view(p);
    });
  }
  get(owner,id) { const r=this.db.prepare('SELECT data FROM projects WHERE id=? AND owner=? AND expires>?').get(id,owner,timestamp()); if(!r)throw new StudioError('NOT_FOUND',404); const p=parse(r.data);p.planRevision??=p.revision;return p; }
  write(p) { p.updatedAt=timestamp(); this.db.prepare('UPDATE projects SET data=?,updated=?,expires=? WHERE id=?').run(JSON.stringify(p),p.updatedAt,p.expiresAt,p.id); return p; }
  list(owner) { return this.db.prepare('SELECT data FROM projects WHERE owner=? AND expires>? ORDER BY updated DESC').all(owner,timestamp()).map(r=>this.view(parse(r.data))); }
  jobs(id) { return this.db.prepare('SELECT data FROM jobs WHERE project=? ORDER BY created DESC,rowid DESC').all(id).map(r=>parse(r.data)); }
  view(p) { const {owner,...safe}=p; return {...safe,pendingSubmission:pendingSubmission(this,p.id),plans:Object.fromEntries([...this.jobs(p.id).map(j=>[j.planRevision,j.snapshot.settings]),[p.planRevision??p.revision,p.settings]]),planRevision:p.planRevision??p.revision,jobs:this.jobs(p.id).map(j=>this.jobView(j)),references:this.db.prepare('SELECT data FROM assets WHERE project=?').all(p.id).map(r=>parse(r.data)).filter(a=>['identity','composition','companion','location'].includes(a.role)).map(({file,...a})=>a)}; }
  jobView(job) {
    const {snapshot,requestKey,accessId,accessBudgetKey,...safe}=job;
    const row=this.db.prepare('SELECT rowid FROM jobs WHERE id=?').get(job.id);
    const last=this.db.prepare('SELECT data FROM attempts WHERE job=? ORDER BY created DESC,rowid DESC LIMIT 1').get(job.id);
    const attempt=last?parse(last.data):null;
    const quotaUsed=this.db.prepare('SELECT COUNT(*) AS n FROM access_charges WHERE job=?').get(job.id).n;
    const queueAhead=job.status==='queued'&&row?this.db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status='running' OR (status='queued' AND (created<? OR (created=? AND rowid<?)))").get(job.createdAt,job.createdAt,row.rowid).n:undefined;
    // Describe the immutable dispatched plan, never the user's subsequently edited settings.
    return {...safe,requestedSize:FORMATS[snapshot.settings.format].size,quotaUsed,...(queueAhead!==undefined?{queueAhead}:{}),...(attempt?.returnedSize?{returnedSize:attempt.returnedSize}:{}),...(attempt?.rejectedSaveError?{rejectedSaveError:attempt.rejectedSaveError}:{})};
  }
  active(id) { return this.db.prepare("SELECT id FROM jobs WHERE project=? AND status IN ('queued','running')").get(id); }
  saveRevisionDraft(owner,id,resultId,note,expectedVersion) {
    return this.transaction(()=>{
      const p=this.get(owner,id);
      if(!p.results.some(r=>r.id===resultId))throw new StudioError('NOT_FOUND',404);
      if(typeof note!=='string'||note.length>400||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw new StudioError('INVALID_INPUT');
      const current=p.revisionDrafts?.[resultId]||{note:'',version:0,updatedAt:0};
      // Equal content is an idempotent acknowledgement, including a lost response.
      if(current.note===note)return current;
      if(current.version!==expectedVersion)throw new StudioError('DRAFT_CHANGED',409);
      const draft={note,version:current.version+1,updatedAt:timestamp()};
      // Empty drafts remain as versioned tombstones so stale windows cannot restore deleted text.
      p.revisionDrafts={...p.revisionDrafts,[resultId]:draft};this.write(p);return draft;
    });
  }
  update(owner,id,settings,expectedRevision) { const result=this.transaction(()=>{ const p=this.get(owner,id); validate(settings); if(this.active(id))throw new StudioError('PLAN_LOCKED',409); if(p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409); const {title:oldTitle,...before}=p.settings, {title:newTitle,...after}=settings; if(p.settings.placeId!==settings.placeId)p.locationId=null; if(characterKey(p.settings)!==characterKey(settings))p.companionId=null; this.pruneReferences(p); p.settings=settings; p.recipe=recipeFor(settings); p.revision++; if(JSON.stringify(before)!==JSON.stringify(after)){p.planRevision=p.revision;p.featuredResultId=null;p.continuity=null;} return this.view(this.write(p)); }); this.collectGarbage();return result; }
  asset(owner,projectId,assetId) { this.get(owner,projectId); const r=this.db.prepare('SELECT data FROM assets WHERE id=? AND project=?').get(assetId,projectId); if(!r)throw new StudioError('NOT_FOUND',404); return parse(r.data); }
  readAsset(asset) { return readFileSync(join(this.directory,'assets',asset.file)); }
  assertStorageCapacity(bytes,excludeJob) {
    const used=this.db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.bytes')),0) AS total FROM assets").get().total;
    const limit=Number(process.env.STUDIO_STORAGE_LIMIT_BYTES)||2*1024*1024*1024;
    const disk=statfsSync(this.directory),reserve=Math.max(128*1024*1024,Number(process.env.STUDIO_MIN_FREE_BYTES)||0);
    const pending=this.db.prepare("SELECT data FROM jobs WHERE status IN ('queued','running')").all().map(r=>parse(r.data)).filter(j=>j.id!==excludeJob).reduce((n,j)=>n+j.targets.filter(shot=>!j.completed.includes(shot)).length*20*1024*1024,0);
    if(used+galleryBytes(this)+pending+bytes>limit||disk.bavail*disk.bsize-pending-bytes<reserve)throw new StudioError('STORAGE_LIMIT',507);
  }
  saveAsset(projectId,role,buffer,metadata,reservationJob) {
    this.assertStorageCapacity(buffer.length,reservationJob);
    const id=randomUUID(), file=id+'.bin', a={id,projectId,role,file,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),createdAt:timestamp(),...metadata};
    writeFileSync(join(this.directory,'assets',file),buffer,{flag:'wx',mode:0o600});
    this.pendingFiles?.push(file);
    try { this.db.prepare('INSERT INTO assets VALUES(?,?,?)').run(id,projectId,JSON.stringify(a)); } catch(e) { unlinkSync(join(this.directory,'assets',file)); throw e; } return a;
  }
  saveRejectedOutput(job,attempt,buffer,metadata) { return this.transaction(()=>{
    this.get(job.snapshot.owner,job.projectId);
    const asset=this.saveAsset(job.projectId,'rejected-result',buffer,metadata,job.id);
    attempt.rejectedAssetId=asset.id;attempt.returnedSize=metadata.width+'x'+metadata.height;this.writeAttempt(attempt);
    const current=this.getJob(job.id);current.rejectedAssetId=asset.id;current.returnedSize=attempt.returnedSize;this.writeJob(current);
    return asset;
  }); }
  pruneReferences(p) {
    // Retain sources used by an actual task; discard unused superseded uploads.
    const used=new Set([p.identityId,p.compositionId,p.companionId,p.locationId]);
    for(const j of this.jobs(p.id)) {used.add(j.snapshot.identityId);used.add(j.snapshot.compositionId);used.add(j.snapshot.companionId);used.add(j.snapshot.locationId);}
    for(const row of this.db.prepare('SELECT data FROM assets WHERE project=?').all(p.id)) {
      const a=parse(row.data);if(['result','rejected-result'].includes(a.role)||used.has(a.id))continue;
      this.db.prepare('INSERT OR IGNORE INTO garbage VALUES(?)').run(a.file);
      this.db.prepare('DELETE FROM assets WHERE id=?').run(a.id);
    }
  }
  removeReference(owner,id,role,expectedRevision) {
    const result=this.transaction(()=>{const p=this.get(owner,id);
      if(this.active(id))throw new StudioError('PLAN_LOCKED',409);
      if(p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
      const key=roleKey(role);
      if(p[key]) {p[key]=null;p.revision++;p.planRevision=p.revision;p.recipe=recipeFor(p.settings);p.continuity=null;this.write(p);this.pruneReferences(p);}
      return this.view(p);
    });this.collectGarbage();return result;
  }
  addReference(owner,id,role,buffer,metadata,consent,expectedRevision) {
    const result=this.transaction(()=>{ const p=this.get(owner,id); if(this.active(id))throw new StudioError('PLAN_LOCKED',409);
      if(expectedRevision!==undefined&&p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
      if(!consent)throw new StudioError('CONSENT_REQUIRED');
      const field=roleKey(role);
      p[field]=null;this.pruneReferences(p);
      if(this.db.prepare("SELECT COUNT(*) AS n FROM assets WHERE project=? AND json_extract(data,'$.role') IN ('identity','composition','companion','location')").get(id).n>=6)throw new StudioError('REFERENCE_LIMIT');
      const a=this.saveAsset(id,role,buffer,metadata); p[roleKey(role)]=a.id; p.consent=true; p.revision++; p.planRevision=p.revision;p.recipe=recipeFor(p.settings);p.continuity=null; this.write(p); return this.view(p);
    });this.collectGarbage();return result;
  }
  enqueue(owner,id,key,kind='set',shotId=null,note='',acknowledge=false,parentResultId=null,coverResultId=null,expectedRevision=undefined,accessProvider=null) {
    return this.transaction(()=>{ const p=this.get(owner,id), existing=this.db.prepare('SELECT data FROM jobs WHERE project=? AND requestkey=?').get(id,key);
      if(existing)return parse(existing.data);
      checkSubmission(this,id,key,{revision:expectedRevision??p.revision,kind,shotId,note,parentResultId,coverResultId});
      if(expectedRevision!==undefined&&p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
      if(accessProvider&&kind==='set')throw new StudioError('SINGLE_SHOT_REQUIRED',409);
      if(!['set','cover','revision','continuation'].includes(kind))throw new StudioError('INVALID_INPUT');
      validate(p.settings,note);
      if(this.active(id))throw new StudioError('ALREADY_RUNNING',409);
      if(hasCompanion(p.settings)&&!p.companionId)throw new StudioError('COMPANION_REQUIRED');
      if(placeFor(p.settings)?.kind==='restaurant'&&!p.locationId)throw new StudioError('LOCATION_REQUIRED');
      for(const ref of referencePlan(p,'cover')) {if(ref.id){const a=this.asset(owner,id,ref.id);if(!existsSync(join(this.directory,'assets',a.file)))throw new StudioError('REFERENCE_REQUIRED');}}
      if(!p.identityId||!p.consent)throw new StudioError('REFERENCE_REQUIRED');
      const identity=this.asset(owner,id,p.identityId); if(!existsSync(join(this.directory,'assets',identity.file)))throw new StudioError('REFERENCE_REQUIRED');
      const jobs=this.jobs(id); if(jobs.some(j=>j.status==='recoverable')&&!acknowledge)throw new StudioError('UNCERTAIN_CHARGE',409);
      const firstCover=p.results.filter(r=>r.shotId==='cover'&&r.planRevision===p.planRevision).at(-1);
      const coverWorkflow=jobs.some(j=>j.kind==='cover'&&j.planRevision===p.planRevision);
      if(kind==='set'&&coverWorkflow){if(!p.continuity)throw new StudioError('COVER_APPROVAL_REQUIRED',409);throw new StudioError('SINGLE_SHOT_REQUIRED',409);}
      if(kind==='continuation'){
        if(!p.continuity||!coverResultId||p.continuity.resultId!==coverResultId||p.continuity.planRevision!==p.planRevision)throw new StudioError('COVER_APPROVAL_REQUIRED',409);
        if(!SHOTS.some(s=>s.id===shotId&&s.id!=='cover'))throw new StudioError('INVALID_INPUT');
        if(p.results.some(r=>r.shotId===shotId&&r.planRevision===p.planRevision))throw new StudioError('SHOT_EXISTS',409);
        const latestShots=SHOTS.filter(s=>s.id!=='cover').map(s=>p.results.filter(r=>r.shotId===s.id&&r.planRevision===p.planRevision).at(-1)).filter(Boolean);
        if(latestShots.some(r=>r.continuityResultId!==p.continuity.resultId||!r.review?.accepted||!r.review?.identity||!r.review?.composition||!r.review?.setConsistency||(hasCompanion(p.settings)&&!r.review?.character)))throw new StudioError('CONTINUATION_REVIEW_REQUIRED',409);
      }
      if(p.continuity&&(kind==='continuation'||(kind==='revision'&&shotId!=='cover')))this.verifyContinuity(p);
      if(kind==='cover'&&firstCover)throw new StudioError('COVER_EXISTS',409);
      const targets=['revision','continuation'].includes(kind)?[shotId]:kind==='cover'?['cover']:SHOTS.map(s=>s.id).filter(s=>!p.results.some(r=>r.shotId===s&&r.planRevision===p.planRevision));
      if(!targets.length)throw new StudioError('ALREADY_COMPLETE',409);
      let parent=null;
      if(kind==='revision') { parent=parentResultId?p.results.find(r=>r.id===parentResultId&&r.shotId===shotId):p.results.filter(r=>r.shotId===shotId).at(-1); if(!parent)throw new StudioError('RESULT_REQUIRED'); if(parent.planRevision!==p.planRevision)throw new StudioError('RESULT_PLAN_MISMATCH',409); }
      const refs=referencePlan(p,targets[0],parent?.assetId);if(refs.length>4)throw new StudioError('REFERENCE_COUNT_UNVERIFIED',409);
      // A failed mirror gets at most three explicit attempts, without blocking the other five.
      if(kind==='continuation'?jobs.filter(j=>j.kind==='continuation'&&j.shotId===shotId&&j.planRevision===p.planRevision&&j.status!=='cancelled').length>=3:jobs.filter(j=>j.kind!=='continuation').length>=12)throw new StudioError('ATTEMPT_LIMIT',429);
      const referenceFacts=referencePlan(p,targets[0],parent?.assetId).map(ref=>{const a=this.asset(owner,id,ref.id);return {id:a.id,role:ref.role,sha256:a.sha256,builtin:a.builtin===true};});
      const j={id:randomUUID(),projectId:id,kind,shotId,note,parentResultId:parent?.id||null,requestKey:key,planRevision:p.planRevision,snapshot:{...p,recipe:recipeFor(p.settings),referenceFacts},targets,completed:[],status:'queued',createdAt:timestamp(),updatedAt:timestamp(),stopRequested:false,error:null};
      if(accessProvider)this.assertStorageCapacity(targets.length*20*1024*1024);
      if(accessProvider){const access=authorizeProject(this,owner,j.snapshot,accessProvider,targets.length);j.accessId=access.id;j.accessBudgetKey=access.budgetKey;}
      this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?)').run(j.id,id,key,j.status,JSON.stringify(j),j.createdAt); return j;
    });
  }
  consumeAccess(job,provider,dailyLimit,shotId){return consumeAccess(this,job,provider,dailyLimit,shotId);}
  findRequest(owner,id,key){this.get(owner,id);const row=this.db.prepare('SELECT data FROM jobs WHERE project=? AND requestkey=?').get(id,key);return row?parse(row.data):null;}
  writeJob(j) { j.updatedAt=timestamp(); this.db.prepare('UPDATE jobs SET status=?,data=? WHERE id=?').run(j.status,JSON.stringify(j),j.id); return j; }
  getJob(id) { const r=this.db.prepare('SELECT data FROM jobs WHERE id=?').get(id); return r?parse(r.data):null; }
  claim() { return this.transaction(()=>{ const r=this.db.prepare("SELECT data FROM jobs WHERE status='queued' ORDER BY created,rowid LIMIT 1").get(); if(!r)return null; const j=parse(r.data); j.status='running'; return this.writeJob(j); }); }
  cancel(owner,id,jobId) { return this.transaction(()=>{this.get(owner,id); const j=this.getJob(jobId); if(!j||j.projectId!==id)throw new StudioError('NOT_FOUND',404); if(j.status==='queued')j.status='cancelled'; if(j.status==='running')j.stopRequested=true; return this.writeJob(j);}); }
  attempt(jobId,shotId,promptHash) { const a={id:randomUUID(),jobId,shotId,promptHash,model:'gpt-image-2.5-sunburst',status:'prepared',startedAt:timestamp(),elapsedMs:null,usage:null,cost:null,costSource:'unknown',error:null}; this.db.prepare('INSERT INTO attempts VALUES(?,?,?,?)').run(a.id,jobId,JSON.stringify(a),a.startedAt); return a; }
  writeAttempt(a) { this.db.prepare('UPDATE attempts SET data=? WHERE id=?').run(JSON.stringify(a),a.id); return a; }
  finishShot(j,shotId,buffer,metadata,attemptId) { return this.transaction(()=>{
    const p=this.get(j.snapshot.owner,j.projectId), a=this.saveAsset(j.projectId,'result',buffer,metadata,j.id);
    const r={id:randomUUID(),assetId:a.id,shotId,version:p.results.filter(x=>x.shotId===shotId).length+1,parentResultId:j.parentResultId,continuityResultId:shotId!=='cover'?j.snapshot.continuity?.resultId||null:null,planRevision:j.planRevision,recipe:j.snapshot.recipe,jobId:j.id,attemptId,createdAt:timestamp(),width:metadata.width,height:metadata.height,note:j.note,review:null,...(metadata.generation?{generation:structuredClone(metadata.generation)}:{})};
    p.results.push(r); this.write(p); const fresh=this.getJob(j.id); fresh.completed.push(shotId); this.writeJob(fresh); return r;
  }); }
  review(owner,id,resultId,review) { return this.transaction(()=>{const p=this.get(owner,id), r=p.results.find(x=>x.id===resultId); if(!r)throw new StudioError('NOT_FOUND',404); const settings=r.planRevision===p.planRevision?p.settings:this.jobs(id).find(j=>j.planRevision===r.planRevision)?.snapshot.settings||p.settings;if(review.accepted&&(!review.identity||!review.composition||(r.shotId!=='cover'&&!review.setConsistency)||(hasCompanion(settings)&&!review.character)))throw new StudioError('REVIEW_REQUIRED'); if(p.continuity?.resultId===r.id&&this.active(id))throw new StudioError('PLAN_LOCKED',409);
    r.review={...review,at:timestamp()};if(p.continuity?.resultId===r.id&&(!review.identity||!review.composition||!review.wouldShare||(hasCompanion(settings)&&!review.character)))p.continuity=null; return this.view(this.write(p));}); }
  resultGeneration(p,r) {
    const asset=this.asset(p.owner,p.id,r.assetId),attempt=this.db.prepare('SELECT data FROM attempts WHERE id=? AND job=?').get(r.attemptId,r.jobId);
    const savedAttempt=attempt?parse(attempt.data):null;
    const fields=['channel','model','quality','size'];
    const recorded=[asset.generation,r.generation].filter(Boolean);
    const fromAttempt=savedAttempt?.status==='saved'&&fields.every(k=>savedAttempt[k])?savedAttempt:null;
    const g=recorded[0]||fromAttempt;
    if(!g||fields.some(k=>typeof g[k]!=='string'||!g[k]||g[k].length>160)||g.size!==asset.width+'x'+asset.height||g.size!==r.width+'x'+r.height)throw new StudioError('COVER_PROVENANCE_REQUIRED',409);
    if(recorded.some(other=>fields.some(k=>other[k]!==g[k]))||(fromAttempt&&fields.some(k=>fromAttempt[k]!==g[k])))throw new StudioError('CONTINUITY_PROVENANCE_CHANGED',409);
    return Object.fromEntries(fields.map(k=>[k,g[k]]));
  }
  approveCover(owner,id,resultId,expectedRevision) {return this.transaction(()=>{
    const p=this.get(owner,id);if(this.active(id))throw new StudioError('PLAN_LOCKED',409);if(p.revision!==expectedRevision)throw new StudioError('STALE_PLAN',409);
    const r=p.results.find(x=>x.id===resultId&&x.shotId==='cover');if(!r)throw new StudioError('RESULT_REQUIRED');
    if(r.planRevision!==p.planRevision)throw new StudioError('RESULT_PLAN_MISMATCH',409);
    const j=this.getJob(r.jobId);if(!j||j.projectId!==id||!j.completed.includes('cover'))throw new StudioError('RESULT_REQUIRED');
    if(!r.review?.identity||!r.review?.composition||!r.review?.wouldShare||(hasCompanion(p.settings)&&!r.review?.character))throw new StudioError('COVER_REVIEW_REQUIRED',409);
    const generation=this.resultGeneration(p,r);if(generation.size!==FORMATS[p.settings.format].size)throw new StudioError('CONTINUITY_PROVENANCE_CHANGED',409);
    const references=referencePlan({...p,continuity:null},'place');references.splice(1,0,{role:'continuity',id:r.assetId});
    const hashed=references.map(ref=>{const a=this.asset(owner,id,ref.id);let bytes;try{bytes=this.readAsset(a);}catch{throw new StudioError('CONTINUITY_REFERENCE_MISSING',409);}if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new StudioError('CONTINUITY_REFERENCE_CHANGED',409);return {...ref,sha256:a.sha256};});
    p.continuity={version:1,resultId:r.id,assetId:r.assetId,planRevision:p.planRevision,approvedAt:timestamp(),references:hashed,recipe:{...p.recipe},...generation,
      locks:{identity:'本人原照负责身份，母版保持其面部呈现',outfit:'沿用母版实际服装',character:'沿用母版与角色原图的比例及材质',lighting:'沿用母版现场时段、主光方向、曝光与白平衡'},validation:'human-approved-cover;continuation-unverified'};
    return this.view(this.write(p));
  });}
  verifyContinuity(p) {
    const c=p.continuity;if(!c||c.planRevision!==p.planRevision)throw new StudioError('COVER_APPROVAL_REQUIRED',409);
    const result=p.results.find(r=>r.id===c.resultId&&r.assetId===c.assetId&&r.shotId==='cover'&&r.planRevision===c.planRevision);if(!result)throw new StudioError('COVER_APPROVAL_REQUIRED',409);
    const generation=this.resultGeneration(p,result);
    if(['model','quality','size'].some(k=>c[k]!==generation[k])||(c.channel?c.channel!==generation.channel:generation.channel!=='McGrox'))throw new StudioError('CONTINUITY_PROVENANCE_CHANGED',409);
    for(const ref of c.references){let a,bytes;try{a=this.asset(p.owner,p.id,ref.id);bytes=this.readAsset(a);}catch{throw new StudioError('CONTINUITY_REFERENCE_MISSING',409);}
      if(a.sha256!==ref.sha256||createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw new StudioError('CONTINUITY_REFERENCE_CHANGED',409);
    }
  }
  featureResult(owner,id,resultId) { return this.transaction(()=>{const p=this.get(owner,id),r=p.results.find(x=>x.id===resultId);if(!r)throw new StudioError('NOT_FOUND',404);if(r.planRevision!==p.planRevision)throw new StudioError('RESULT_PLAN_MISMATCH',409);p.featuredResultId=r.id;return this.view(this.write(p));}); }
  costs(owner,id) { this.get(owner,id); return this.db.prepare('SELECT attempts.data FROM attempts JOIN jobs ON attempts.job=jobs.id WHERE jobs.project=? ORDER BY attempts.created').all(id).map(r=>parse(r.data)); }
  delete(owner,id) { const p=this.get(owner,id); if(this.active(id))throw new StudioError('PLAN_LOCKED',409); this.remove(p.id); }
  remove(id) { this.transaction(()=>{if(this.active(id))throw new StudioError('PLAN_LOCKED',409);const files=this.db.prepare('SELECT data FROM assets WHERE project=?').all(id).map(r=>parse(r.data).file); for(const f of files)this.db.prepare('INSERT OR IGNORE INTO garbage VALUES(?)').run(f); this.db.prepare('DELETE FROM projects WHERE id=?').run(id);}); this.collectGarbage(); }
  collectGarbage() { for(const r of this.db.prepare('SELECT file FROM garbage').all()) {try {unlinkSync(join(this.directory,'assets',r.file));}catch(e) {if(e.code!=='ENOENT')continue;} this.db.prepare('DELETE FROM garbage WHERE file=?').run(r.file);} }
  purge() { purgeAccess(this);purgeAccounts(this);purgeGallery(this);this.collectGarbage(); const expired=this.db.prepare('SELECT id FROM projects WHERE expires<=?').all(timestamp()); for(const p of expired)if(!this.active(p.id))this.remove(p.id); this.db.prepare("DELETE FROM counters WHERE expires<? AND key NOT IN (SELECT json_extract(data,'$.budgetKey') FROM shoot_access)").run(timestamp()); }
  heartbeat(token) { return this.db.prepare('UPDATE worker SET heartbeat=? WHERE id=1 AND token=?').run(timestamp(),token).changes===1; }
  workerLock(token) { return this.transaction(()=>{ const r=this.db.prepare('SELECT * FROM worker WHERE id=1').get(); if(r&&r.heartbeat>timestamp()-30000)return false; this.db.prepare('INSERT INTO worker VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,heartbeat=excluded.heartbeat').run(token,timestamp()); return true; }); }
  releaseWorker(token) { this.db.prepare('DELETE FROM worker WHERE token=?').run(token); }
  recoverInterrupted() { for(const r of this.db.prepare("SELECT data FROM jobs WHERE status='running'").all()) { const j=parse(r.data); j.status='recoverable'; j.error='INTERRUPTED'; this.writeJob(j); } for(const r of this.db.prepare("SELECT data FROM attempts WHERE json_extract(data,'$.status') IN ('prepared','submitted','received')").all()) { const a=parse(r.data); a.status='unknown'; a.error='INTERRUPTED'; this.writeAttempt(a); } }
  health() { const worker=this.db.prepare('SELECT heartbeat FROM worker WHERE id=1').get(); return { database:'ok',schemaVersion:2,worker:worker&&worker.heartbeat>timestamp()-30000?'online':'offline' }; }
}
let singleton;
export function store() { return singleton??=new StudioStore(process.env.STUDIO_DATA_DIR||resolve('.studio-data')); }
