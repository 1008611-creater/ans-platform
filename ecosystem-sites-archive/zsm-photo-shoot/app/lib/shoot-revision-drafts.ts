import type {RevisionDraft} from './shoot-contract';
export type DraftKey={projectId:string;resultId:string};
export type DraftEntry={note:string;remote:RevisionDraft;saving:boolean;error:string;conflict:boolean;sent?:{note:string;version:number}};
const empty=():RevisionDraft=>({note:'',version:0,updatedAt:0});
const key=(id:DraftKey)=>id.projectId+'/'+id.resultId;
type Transport={write:(id:DraftKey,note:string,version:number)=>Promise<RevisionDraft>;read:(id:DraftKey)=>Promise<RevisionDraft>};
/** Private server drafts, scoped to a particular project and immutable source photo. */
export class RevisionDrafts {
 private entries=new Map<string,DraftEntry>();
 private timers=new Map<string,ReturnType<typeof setTimeout>>();
 private requests=new Map<string,Promise<void>>();
 private listeners=new Set<()=>void>();
 private disposed=false;
 constructor(private transport:Transport,private delay=650){}
 subscribe(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 private emit(){if(!this.disposed)for(const listener of this.listeners)listener();}
 get(id:DraftKey){let entry=this.entries.get(key(id));if(!entry){entry={note:'',remote:empty(),saving:false,error:'',conflict:false};this.entries.set(key(id),entry);}return entry;}
 hasUnsaved(){return [...this.entries.values()].some(e=>e.note!==e.remote.note||e.saving||e.conflict);}
 observe(id:DraftKey,remote=empty()){
  const entry=this.get(id);if(remote.version<=entry.remote.version)return;
  const clean=entry.note===entry.remote.note;
  entry.remote=remote;
  if(clean){entry.note=remote.note;entry.conflict=false;entry.error='';}
  else if(entry.note===remote.note){entry.conflict=false;entry.error='';}
  else if(!entry.sent||entry.sent.note!==remote.note)entry.conflict=true;
  this.emit();
 }
 change(id:DraftKey,note:string){const entry=this.get(id);entry.note=note;this.emit();if(!entry.error&&!entry.conflict)this.schedule(id);}
 private schedule(id:DraftKey){if(this.disposed)return;const k=key(id);clearTimeout(this.timers.get(k));this.timers.set(k,setTimeout(()=>{this.timers.delete(k);void this.save(id).catch(()=>{});},this.delay));}
 async save(id:DraftKey):Promise<void>{
  const k=key(id);clearTimeout(this.timers.get(k));this.timers.delete(k);
  const running=this.requests.get(k);if(running){await running;return this.save(id);}
  const entry=this.get(id);
  if(entry.conflict)throw new Error('先选择保留哪份修改文字。');
  if(entry.note===entry.remote.note){entry.error='';this.emit();return;}
  const sent={note:entry.note,version:entry.remote.version};entry.sent=sent;entry.saving=true;entry.error='';this.emit();
  const request=(async()=>{
   try{
    const draft=await this.transport.write(id,sent.note,sent.version);
    this.observe(id,draft);
    if(entry.remote.version>draft.version&&entry.remote.note!==sent.note)entry.conflict=true;
   }catch(error){
    // Read after a failed/lost response; never automatically repeat the write.
    try{const remote=await this.transport.read(id);this.observe(id,remote);}catch{}
    if(entry.remote.note!==sent.note||entry.remote.version<=sent.version){entry.error=(error as Error).message||'修改文字未保存';throw error;}
   }finally{
    entry.saving=false;delete entry.sent;this.emit();
   }
  })();this.requests.set(k,request);
  try{await request;}finally{this.requests.delete(k);}
  if(!entry.error&&!entry.conflict&&entry.note!==entry.remote.note)this.schedule(id);
 }
 async flush(id:DraftKey){await this.save(id);const e=this.get(id);if(e.note!==e.remote.note)await this.save(id);}
 useRemote(id:DraftKey){const e=this.get(id);if(e.saving)return;e.note=e.remote.note;e.conflict=false;e.error='';clearTimeout(this.timers.get(key(id)));this.emit();}
 async keepMine(id:DraftKey){const e=this.get(id);if(e.saving)return;e.conflict=false;e.error='';await this.save(id);}
 async clearIfMatching(id:DraftKey,note:string){const e=this.get(id);if(e.note!==note||e.conflict||e.error)return;this.change(id,'');await this.flush(id);}
 forgetProject(projectId:string){for(const k of this.entries.keys())if(k.startsWith(projectId+'/')){clearTimeout(this.timers.get(k));this.timers.delete(k);this.entries.delete(k);}this.emit();}
 pause(){for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();}
 dispose(){this.disposed=true;for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();this.listeners.clear();}
}
