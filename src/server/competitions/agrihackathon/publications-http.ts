import { ZodError } from "zod";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { ok, fail } from "@/server/http/respond";
export function publicationQuery(request: Request) {
  const params=new URL(request.url).searchParams, result:Record<string,string>={};
  for(const [key,value] of params) {if(key in result) throw new AgriWorkspaceError("INVALID_INPUT",400);result[key]=value;}
  return result;
}
export async function agriPublicPublicationResponse<T>(run:()=>Promise<T>) {
  try{return ok(await run());}
  catch(error){if(error instanceof ZodError)return fail("INVALID_INPUT","INVALID_INPUT",{status:400});if(error instanceof AgriWorkspaceError)return fail(error.code,error.code,{status:error.status});return fail("INTERNAL_ERROR","INTERNAL_ERROR",{status:500});}
}
