import {randomUUID,createHash} from 'node:crypto';
import {writeFileSync,readFileSync,statfsSync} from 'node:fs';
import {join} from 'node:path';
import {StudioError,RETENTION_DAYS} from './store.mjs';
export function initializeGallery(db){db.exec('CREATE TABLE IF NOT EXISTS gallery(id TEXT PRIMARY KEY,owner TEXT NOT NULL,data TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS gallery_submissions(owner TEXT NOT NULL,requestkey TEXT NOT NULL,id TEXT NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,sha256 TEXT NOT NULL,title TEXT NOT NULL,PRIMARY KEY(owner,requestkey)); CREATE INDEX IF NOT EXISTS gallery_owner ON gallery(owner);');}
export function galleryBytes(store){return Number(store.db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.bytes')),0) AS total FROM gallery").get().total);}
const safe=work=>{const {owner,file,...rest}=work;return rest;};
export function privateWorks(store,owner){return store.db.prepare('SELECT data FROM gallery WHERE owner=? AND expires>? ORDER BY rowid DESC LIMIT 30').all(owner,Date.now()).map(row=>safe(JSON.parse(row.data)));}
export function publicWorks(store){return store.db.prepare("SELECT data FROM gallery WHERE json_extract(data,'$.status')='published' AND expires>? ORDER BY rowid DESC LIMIT 30").all(Date.now()).map(row=>{const w=JSON.parse(row.data);return {id:w.id,title:w.title,author:w.author,width:w.width,height:w.height,createdAt:w.createdAt,source:'upload'};});}
export function getWork(store,owner,id){const row=store.db.prepare('SELECT data FROM gallery WHERE id=? AND owner=? AND expires>?').get(id,owner,Date.now());if(!row)throw new StudioError('NOT_FOUND',404);return JSON.parse(row.data);}
export function publicWork(store,id){const row=store.db.prepare("SELECT data FROM gallery WHERE id=? AND json_extract(data,'$.status')='published' AND expires>?").get(id,Date.now());if(!row)throw new StudioError('NOT_FOUND',404);return JSON.parse(row.data);}
export function uploadWork(store,owner,author,title,bytes,metadata,requestKey){
 if(!title||title.length>60||bytes.length>8*1024*1024||!requestKey||!/^[a-f0-9-]{36}$/.test(requestKey))throw new StudioError('INVALID_INPUT');
 return store.transaction(()=>{
  const digest=createHash('sha256').update(bytes).digest('hex'),prior=store.db.prepare('SELECT * FROM gallery_submissions WHERE owner=? AND requestkey=?').get(owner,requestKey);
  if(prior){if(prior.sha256!==digest||prior.title!==title)throw new StudioError('WORK_SUBMISSION_CHANGED',409);return safe(getWork(store,owner,prior.id));}
  if(privateWorks(store,owner).length>=20)throw new StudioError('WORK_LIMIT',429);
  const used=Number(store.db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.bytes')),0) AS total FROM assets").get().total)+galleryBytes(store),limit=Number(process.env.STUDIO_STORAGE_LIMIT_BYTES)||2*1024*1024*1024;
  store.assertStorageCapacity(bytes.length);
  const disk=statfsSync(store.directory),galleryLimit=Number(process.env.STUDIO_GALLERY_STORAGE_LIMIT_BYTES)||128*1024*1024;
  if(galleryBytes(store)+bytes.length>galleryLimit||disk.bavail*disk.bsize-bytes.length<128*1024*1024||used+bytes.length>limit)throw new StudioError('STORAGE_LIMIT',507);
  const id=randomUUID(),file=id+'.bin',work={id,owner,file,title,author,source:'upload',status:'private',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...metadata,createdAt:Date.now(),expiresAt:Date.now()+RETENTION_DAYS*86400000};
  writeFileSync(join(store.directory,'assets',file),bytes,{flag:'wx',mode:0o600});store.pendingFiles?.push(file);
  store.db.prepare('INSERT INTO gallery VALUES(?,?,?,?)').run(id,owner,JSON.stringify(work),work.expiresAt);store.db.prepare('INSERT INTO gallery_submissions VALUES(?,?,?,?,?)').run(owner,requestKey,id,digest,title);return safe(work);
 });
}
export function readWork(store,work){const bytes=readFileSync(join(store.directory,'assets',work.file));if(createHash('sha256').update(bytes).digest('hex')!==work.sha256)throw new StudioError('WORK_UNAVAILABLE',503);return bytes;}
export function submitWork(store,owner,id,consent){return store.transaction(()=>{const work=getWork(store,owner,id);if(!consent)throw new StudioError('CONSENT_REQUIRED');if(work.status==='published'||work.status==='pending')return safe(work);work.status='pending';work.publicConsentAt=Date.now();work.rejectionReason=null;store.db.prepare('UPDATE gallery SET data=? WHERE id=?').run(JSON.stringify(work),id);return safe(work);});}
export function withdrawWork(store,owner,id){return store.transaction(()=>{const work=getWork(store,owner,id);work.status='private';work.withdrawnAt=Date.now();store.db.prepare('UPDATE gallery SET data=? WHERE id=?').run(JSON.stringify(work),id);return safe(work);});}
export function deleteWork(store,owner,id){store.transaction(()=>{const work=getWork(store,owner,id);store.db.prepare('INSERT OR IGNORE INTO garbage VALUES(?)').run(work.file);store.db.prepare('DELETE FROM gallery WHERE id=? AND owner=?').run(id,owner);});store.collectGarbage();}
export function reviewWork(store,id,accepted,reason){return store.transaction(()=>{const row=store.db.prepare('SELECT data FROM gallery WHERE id=? AND expires>?').get(id,Date.now());if(!row)throw new StudioError('NOT_FOUND',404);const work=JSON.parse(row.data);if(work.status!=='pending'||!work.publicConsentAt)throw new StudioError('WORK_NOT_PENDING',409);readWork(store,work);work.status=accepted?'published':'rejected';work.reviewedAt=Date.now();work.rejectionReason=accepted?null:String(reason||'请检查作品使用权与内容').slice(0,120);store.db.prepare('UPDATE gallery SET data=? WHERE id=?').run(JSON.stringify(work),id);return safe(work);});}
export function purgeGallery(store){store.transaction(()=>{for(const row of store.db.prepare('SELECT id,data FROM gallery WHERE expires<=?').all(Date.now())){const work=JSON.parse(row.data);store.db.prepare('INSERT OR IGNORE INTO garbage VALUES(?)').run(work.file);store.db.prepare('DELETE FROM gallery WHERE id=?').run(row.id);}});}
