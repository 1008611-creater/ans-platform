import { auth } from "@/lib/auth";
import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriWallActor,agriWallResponse } from "@/server/competitions/agrihackathon/wall-http";
import { readAgriWall,executeAgriWallCommand } from "@/server/competitions/agrihackathon/wall";
export const dynamic='force-dynamic';
const writes=new RateLimiter({max:20,windowSeconds:60});
export async function GET(request:Request){return agriWallResponse(async()=>{
 z.object({}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
 const session=await auth();
 if(request.headers.has('x-ans-actor') && request.headers.get('x-ans-actor')!==session?.user?.id)throw new AgriWorkspaceError('ACCOUNT_CHANGED',409);
 return readAgriWall(session?.user?.id);
});}
export async function POST(request:Request){return agriWallResponse(async()=>{
 const actorId=await agriWallActor(request);
 if(!writes.check(actorId).allowed)throw new AgriWorkspaceError('RATE_LIMITED',429);
 return executeAgriWallCommand(actorId,await readSameOriginJson(request));
});}
