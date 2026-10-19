import type {ShootSettings} from '../app/lib/shoot-contract';
import type {StudioStore} from './store.mjs';
export const ACCOUNT_COOKIE:string;export const FLOW_COOKIE:string;export const ACCOUNT_FLOW_MAX_AGE:number;
export type SignedAccount={owner:string;name:string;expiresAt:number};
export function initializeAccounts(db:unknown):void;
export function accountConfig(env?:NodeJS.ProcessEnv):{issuer:string;origin:string;clientId:string;secret:string;callback:string;base:string};
export function signedAccount(store:StudioStore,token?:string):SignedAccount|null;
export function accountPublic(account:SignedAccount|null,env?:NodeJS.ProcessEnv):{enabled:boolean;giftOffered:boolean;signedIn:boolean;name:string|null;expiresAt:number|null};
export type AccountIntent={kind:'create';settings:ShootSettings}|{kind:'continue';owner:string;projectId:string;revision:number};
export function startAccountFlow(store:StudioStore,returnTo?:string,env?:NodeJS.ProcessEnv,intent?:AccountIntent|null):{flow:string;url:string};
export function takeAccountFlow(store:StudioStore,token:string|undefined,state:string|null):{state:string;nonce:string;verifier:string;returnTo:string;intent?:AccountIntent};
export function completeAccountFlow(store:StudioStore,flow:unknown,code:string|null,options?:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch}):Promise<{token:string;owner:string;name:string;expiresAt:number;returnTo:string}>;
export function logoutAccount(store:StudioStore,token?:string):void;export function purgeAccounts(store:StudioStore):void;

export function verifyIdentityToken(token:string,jwks:unknown,config:ReturnType<typeof accountConfig>,nonce:string,now?:number):{sub:string};
