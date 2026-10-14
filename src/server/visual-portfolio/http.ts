import { z, ZodError } from "zod";
import { fail, ok, isCodedError } from "@/server/http/respond";
import { assertWorker } from "./jobs";
import { readLimitedBody } from "./media";
import { VisualPortfolioError } from "./errors";
export const uuid=(value:string)=>z.string().uuid().parse(value);
export async function workerResponse(request:Request,run:()=>Promise<unknown>) {
 try {assertWorker(request);const value=await run();return value instanceof Response?value:ok(value);}
 catch(error){return fail(error instanceof ZodError?"INVALID_INPUT":isCodedError(error)?error.code??"INTERNAL_ERROR":"INTERNAL_ERROR","REQUEST_FAILED",{status:error instanceof ZodError?400:isCodedError(error)?error.status:500});}
}
export async function readWorkerJson(request:Request) {if(request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new VisualPortfolioError("INVALID_INPUT",415);try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readLimitedBody(request,10000)));}catch(error){if(error instanceof VisualPortfolioError)throw error;throw new VisualPortfolioError("INVALID_INPUT",400);}}
