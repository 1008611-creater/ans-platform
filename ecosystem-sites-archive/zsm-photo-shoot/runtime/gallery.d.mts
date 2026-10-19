import type {StudioStore} from './store.mjs';
export type UploadedWork={id:string;title:string;author:string;source:'upload';status:'private'|'pending'|'published'|'rejected';width:number;height:number;contentType:string;bytes:number;sha256:string;createdAt:number;expiresAt:number;rejectionReason?:string|null};
export type PublicWork=Pick<UploadedWork,'id'|'title'|'author'|'width'|'height'|'createdAt'|'source'>;
export function initializeGallery(db:unknown):void;export function galleryBytes(store:StudioStore):number;
export function privateWorks(store:StudioStore,owner:string):UploadedWork[];export function publicWorks(store:StudioStore):PublicWork[];
export function getWork(store:StudioStore,owner:string,id:string):UploadedWork&{file:string};export function publicWork(store:StudioStore,id:string):UploadedWork&{file:string};
export function uploadWork(store:StudioStore,owner:string,author:string,title:string,bytes:Buffer,metadata:unknown,requestKey:string):UploadedWork;
export function readWork(store:StudioStore,work:unknown):Buffer;export function submitWork(store:StudioStore,owner:string,id:string,consent:boolean):UploadedWork;
export function withdrawWork(store:StudioStore,owner:string,id:string):UploadedWork;export function deleteWork(store:StudioStore,owner:string,id:string):void;
export function purgeGallery(store:StudioStore):void;

export function reviewWork(store:StudioStore,id:string,accepted:boolean,reason?:string):UploadedWork;
