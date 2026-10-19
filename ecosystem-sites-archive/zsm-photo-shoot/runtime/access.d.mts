import type {StudioStore} from './store.mjs';
import type {ShootProject} from '../app/lib/shoot-contract';
export type AccessGrant={id:string;owner:string;label:string;scope?:'account'|'references';channel:string;model:string;limit:number;budgetKey:string;referenceHashes:Record<string,string>;expiresAt:number;revoked:boolean};
export function resolveOwner(store:StudioStore,sessionHash:string):string;
export function issueRecovery(store:StudioStore,owner:string):string;
export function recoverSession(store:StudioStore,currentOwner:string,sessionHash:string,code:string):string;
export function grantAccess(store:StudioStore,input:Omit<AccessGrant,'id'|'revoked'>):AccessGrant;
export function ownerAccess(store:StudioStore,owner:string,provider:{channel:string;model:string}):{enabled:boolean;remaining:number;label:string|null;gift:{total:number;used:number;reserved:number;remaining:number}|null};
export function authorizeProject(store:StudioStore,owner:string,project:ShootProject,provider:{channel:string;model:string},needed?:number,exclude?:string):AccessGrant;

export function accessRemaining(store:StudioStore,grant:AccessGrant,exclude?:string):number;

export function ensureAccountGift(store:StudioStore,owner:string,provider:{channel:string;model:string},env?:Record<string,string|undefined>):AccessGrant|null;

export function dailyDispatchStatus(store:StudioStore,env?:NodeJS.ProcessEnv):{limit:number;used:number;remaining:number};
