import { auth } from "@/lib/auth";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { MarketRuleError } from "@/domain/marketplace/order";
import { assertRequestActor,HttpRequestError } from "@/server/http/json";
import { fail,ok } from "@/server/http/respond";
const GUARD_CODES=new Set(["AGRI_WALL_BINDING_CLOSED","AGRI_WALL_PUBLIC_PROJECT_REQUIRED","AGRI_WALL_PROJECT_MISMATCH","AGRI_WALL_CATEGORY_LOCKED","AGRI_POPULARITY_FUTURE_WINDOW_REQUIRED","AGRI_POPULARITY_WINDOW_LOCKED","AGRI_POPULARITY_VOTING_CLOSED","AGRI_POPULARITY_FROZEN","AGRI_POPULARITY_VOTE_INELIGIBLE"]);
export function agriWallErrorCode(error:unknown) {
 if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2010') {
  if(String(error.meta?.code)==='55P03')return 'CONFLICT';
  const message=String(error.meta?.message??'');
  for(const code of GUARD_CODES)if(message.includes(code))return code;
 }
 return null;
}
export async function agriWallActor(request:Request) {
 const session=await auth();if(!session?.user?.id)throw new AgriWorkspaceError('UNAUTHORIZED',401);
 assertRequestActor(request,session.user.id);return session.user.id;
}
export async function agriWallResponse(run:()=>Promise<unknown>) {
 try{return ok(await run());}catch(error){
  if(error instanceof ZodError)return fail('INVALID_INPUT','INVALID_INPUT',{status:400});
  if(error instanceof AgriWorkspaceError||error instanceof HttpRequestError||error instanceof MarketRuleError)return fail(error.code,error.code,{status:error.status});
  const guard=agriWallErrorCode(error);if(guard)return fail(guard,guard,{status:409});
  return fail('INTERNAL_ERROR','INTERNAL_ERROR',{status:500});
 }
}
