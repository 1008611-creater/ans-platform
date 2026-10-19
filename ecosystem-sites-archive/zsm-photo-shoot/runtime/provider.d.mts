import type { Capability, ShootJob } from '../app/lib/shoot-contract';
import type { StudioStore } from './store.mjs';
export const MAX_IMAGE_BYTES:number;
export function capabilities(env?:Record<string,string|undefined>):Omit<Capability,'worker'|'version'>;
export function inspectImage(buffer:Buffer,max?:number):Promise<{contentType:string;width:number;height:number}>;
export function requestPhoto(input:unknown):Promise<{buffer:Buffer;metadata:{contentType:string;width:number;height:number};usage:Record<string,number>|null;promptHash:string}>;
export function executeJob(store:StudioStore,job:ShootJob,request?:unknown,env?:Record<string,string|undefined>,options?:{compile:(project:unknown,shotId:string,note:string)=>string}):Promise<void>;

export type ProviderConfig = {channel:string;model:string;quality:string;base:string|undefined;key:string|undefined;hosts:string[];formats:string[]};
export function providerConfig(env?:Record<string,string|undefined>):ProviderConfig;
