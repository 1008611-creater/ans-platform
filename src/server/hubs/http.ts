import { auth } from "@/lib/auth";
import { assertRequestActor, readSameOriginJson, HttpRequestError } from "@/server/http/json";
import { ok, fail } from "@/server/http/respond";
import { ZodError } from "zod";
import { WorkflowHubError } from "./workflows";
export async function hubActor(request:Request){const session=await auth();if(!session?.user?.id)throw new WorkflowHubError("UNAUTHORIZED",401);assertRequestActor(request,session.user.id);return session.user.id;}
export const hubJson=readSameOriginJson;
export function hubQuery(request:Request){const result:Record<string,string>={};for(const[key,value]of new URL(request.url).searchParams){if(key in result)throw new WorkflowHubError("INVALID_INPUT",400);result[key]=value;}return result;}
export async function hubResponse(run:()=>Promise<unknown>){try{return ok(await run());}catch(error){const known=error instanceof WorkflowHubError||error instanceof HttpRequestError;const code=known?error.code:error instanceof ZodError?"INVALID_INPUT":"INTERNAL_ERROR";return fail(code,code,{status:known?error.status:error instanceof ZodError?400:500});}}
