export class ShootApiError extends Error {
 constructor(message:string,public code:string,public uncertain=false){super(message);this.name='ShootApiError';}
}
export async function shootApi<T>(base:string,url:string,init?:RequestInit):Promise<T>{
 let response:Response;
 try{response=await fetch(base+'/api/shoot/'+url,{...init,cache:'no-store',signal:init?.signal??AbortSignal.timeout(45000),headers:init?.body instanceof FormData?init.headers:{'Content-Type':'application/json',...init?.headers}});}
 catch{throw new ShootApiError('网络连接失败或等待超时。先同步状态，确认刚才的操作是否保存。','NETWORK',true);}
 let body;try{body=await response.json();}catch{throw new ShootApiError('未能读取服务回复，请先同步状态。','UNREADABLE',true);}
 if(!response.ok)throw new ShootApiError(body.message||'暂时无法连接，请同步后再试。',body.error||'INTERNAL',response.status>=500&&(!body.error||body.error==='INTERNAL'));
 return body;
}
