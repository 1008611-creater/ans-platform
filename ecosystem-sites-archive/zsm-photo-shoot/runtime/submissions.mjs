import {createHash} from 'node:crypto';
import {StudioError} from './store.mjs';
export function initializeSubmissions(db){db.exec(`CREATE TABLE IF NOT EXISTS submissions(project TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(project,key));`);}
const parse=row=>row?JSON.parse(row.data):null;
export function readSubmission(store,owner,id,key){store.get(owner,id);const value=parse(store.db.prepare('SELECT data FROM submissions WHERE project=? AND key=?').get(id,key));if(!value)throw new StudioError('NOT_FOUND',404);return value;}
export function pendingSubmission(store,id){
 const rows=store.db.prepare("SELECT s.data FROM submissions s LEFT JOIN jobs j ON j.project=s.project AND j.requestkey=s.key WHERE s.project=? AND json_extract(s.data,'$.status')='prepared' AND j.id IS NULL ORDER BY json_extract(s.data,'$.createdAt') DESC").all(id);
 const value=parse(rows[0]);if(!value)return null;
 const {command,fingerprint,priorJobId,...safe}=value;
 return {...safe,revision:command.revision,kind:command.kind,shotId:command.shotId||'cover',note:command.note||'',parentResultId:command.parentResultId||null};
}
export function prepareSubmission(store,owner,id,command,priorJobId){return store.transaction(()=>{
 const project=store.get(owner,id),old=parse(store.db.prepare('SELECT data FROM submissions WHERE project=? AND key=?').get(id,command.key));
 if(old){if(old.status==='discarded')throw new StudioError('SUBMISSION_DISCARDED',409);return old;}
 if(project.revision!==command.revision)throw new StudioError('STALE_PLAN',409);
 if(store.active(id))throw new StudioError('ALREADY_RUNNING',409);
 const current=store.jobs(id)[0]?.id||null;if(current!==priorJobId)throw new StudioError('SUBMISSION_CHANGED',409);
 const {key,acknowledge,...facts}=command;
 const fingerprint=createHash('sha256').update(JSON.stringify([facts,priorJobId])).digest('hex');
 const pending=pendingSubmission(store,id);
 if(pending){const entry=readSubmission(store,owner,id,pending.key);if(entry.fingerprint===fingerprint)return entry;throw new StudioError('SUBMISSION_PENDING',409);}
 if(store.db.prepare('SELECT COUNT(*) AS n FROM submissions WHERE project=?').get(id).n>=40)throw new StudioError('ATTEMPT_LIMIT',429);
 const entry={key,status:'prepared',createdAt:Date.now(),command:{...command,acknowledge:false},fingerprint,priorJobId};
 store.db.prepare('INSERT INTO submissions VALUES(?,?,?)').run(id,key,JSON.stringify(entry));return entry;
});}
// Called while enqueue owns SQLite's IMMEDIATE transaction. An explicit discard
// and a late confirmation cannot race into an unintended model task.
export function checkSubmission(store,id,key,input){
 const entry=parse(store.db.prepare('SELECT data FROM submissions WHERE project=? AND key=?').get(id,key));
 if(entry){const c=entry.command;for(const field of ['revision','kind','shotId','note','parentResultId','coverResultId'])if((c[field]||null)!==(input[field]||null))throw new StudioError('SUBMISSION_CHANGED',409);if(entry.status==='discarded')throw new StudioError('SUBMISSION_DISCARDED',409);if((store.jobs(id)[0]?.id||null)!==entry.priorJobId)throw new StudioError('SUBMISSION_CHANGED',409);}
 const pending=pendingSubmission(store,id);if(pending&&pending.key!==key)throw new StudioError('SUBMISSION_PENDING',409);
}
export function discardSubmission(store,owner,id,key){return store.transaction(()=>{
 const entry=readSubmission(store,owner,id,key);
 if(store.findRequest(owner,id,key))throw new StudioError('SUBMISSION_ADMITTED',409);
 entry.status='discarded';store.db.prepare('UPDATE submissions SET data=? WHERE project=? AND key=?').run(JSON.stringify(entry),id,key);
 return true;
});}
