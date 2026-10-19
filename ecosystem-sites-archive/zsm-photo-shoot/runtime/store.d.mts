import type {DatabaseSync} from 'node:sqlite';
import type { ShootProject, ShootSettings, ShootJob, Reference, CostAttempt } from '../app/lib/shoot-contract';
export const RETENTION_DAYS: number;
export class StudioError extends Error {code:string;status:number;constructor(code:string,status?:number);}
export class StudioStore {
 constructor(directory:string); directory:string; db:DatabaseSync; transaction<T>(fn:()=>T):T; close():void;
 continueInAccount(sourceOwner:string,id:string,expectedRevision:number,owner:string):ShootProject;
 remix(owner:string,id:string,expectedRevision:number,planRevision?:number):ShootProject;
 addBuiltinReference(owner:string,id:string,role:string,buffer:Buffer,metadata:{contentType:string;width:number;height:number;source:string;rights:string;builtin:boolean},consent:boolean,expectedRevision:number):ShootProject;
 prepareBuiltinReferences(owner:string,id:string,inputs:Array<{role:'companion'|'location';buffer:Buffer;metadata:{contentType:string;width:number;height:number;builtin:boolean;source:string;rights:string}}>,consent:boolean,expectedRevision:number):ShootProject;
 sequel(owner:string,id:string,placeId:string,expectedRevision:number):ShootProject;
 create(owner:string,settings?:ShootSettings):ShootProject; get(owner:string,id:string):ShootProject & {owner:string};
 list(owner:string):ShootProject[]; view(p:ShootProject):ShootProject;
 saveRevisionDraft(owner:string,id:string,resultId:string,note:string,expectedVersion:number):{note:string;version:number;updatedAt:number};
 update(owner:string,id:string,settings:ShootSettings,expectedRevision:number):ShootProject;
 saveRejectedOutput(job:ShootJob,attempt:CostAttempt,buffer:Buffer,metadata:{contentType:string;width:number;height:number}):Reference & {file:string};
 saveAsset(projectId:string,role:string,buffer:Buffer,metadata:{contentType:string;width:number;height:number}):Reference & {file:string};
 asset(owner:string,projectId:string,assetId:string):Reference & {file:string}; readAsset(asset:Reference):Buffer;
 addReference(owner:string,id:string,role:string,buffer:Buffer,metadata:{contentType:string;width:number;height:number},consent:boolean,expectedRevision?:number):ShootProject;
 removeReference(owner:string,id:string,role:string,expectedRevision:number):ShootProject;
 enqueue(owner:string,id:string,key:string,kind?:string,shotId?:string|null,note?:string,acknowledge?:boolean,parentResultId?:string|null,coverResultId?:string|null,expectedRevision?:number,accessProvider?:{channel:string;model:string}|null):ShootJob;
 findRequest(owner:string,id:string,key:string):ShootJob|null;
 assertStorageCapacity(bytes:number,excludeJob?:string):void;
 consumeAccess(job:ShootJob,provider:{channel:string;model:string},dailyLimit:number,shotId?:string):void;
 active(id:string):{id:string}|undefined;
 jobs(id:string):Array<ShootJob & {snapshot:ShootProject}>;
 cancel(owner:string,id:string,jobId:string):ShootJob;
 approveCover(owner:string,id:string,resultId:string,expectedRevision:number):ShootProject;
 verifyContinuity(p:ShootProject & {owner:string}):void;
 featureResult(owner:string,id:string,resultId:string):ShootProject;
 costs(owner:string,id:string):CostAttempt[]; delete(owner:string,id:string):void;
 review(owner:string,id:string,resultId:string,review:{character?:boolean;fun?:boolean;wouldShare?:boolean;identity:boolean;composition:boolean;setConsistency:boolean;accepted:boolean}):ShootProject;
 budget(key:string,limit:number,windowMs?:number):void; health():{database:string;schemaVersion:number;worker:string};
 purge():void; recoverInterrupted():void; workerLock(token:string):boolean; releaseWorker(token:string):void; heartbeat(token:string):void;
 claim():ShootJob|null; getJob(id:string):ShootJob|null; writeJob(job:ShootJob):ShootJob;
}
export function store():StudioStore;
