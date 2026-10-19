import type {StudioStore} from './store.mjs';
import type {PendingSubmission} from '../app/lib/shoot-contract';
export type ShootCommand={key:string;revision:number;kind:'set'|'cover'|'revision'|'continuation';shotId?:string;note?:string;acknowledge?:boolean;parentResultId?:string;coverResultId?:string};
export type Submission={key:string;status:'prepared'|'discarded';createdAt:number;command:ShootCommand;fingerprint:string;priorJobId:string|null};
export function readSubmission(store:StudioStore,owner:string,id:string,key:string):Submission;
export function pendingSubmission(store:StudioStore,id:string):PendingSubmission|null;
export function prepareSubmission(store:StudioStore,owner:string,id:string,command:ShootCommand,priorJobId:string|null):Submission;
export function discardSubmission(store:StudioStore,owner:string,id:string,key:string):boolean;
