import { z } from "zod";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriWallActor,agriWallResponse } from "@/server/competitions/agrihackathon/wall-http";
import { readAgriWallMine } from "@/server/competitions/agrihackathon/wall";
export const dynamic='force-dynamic';
const reads=new RateLimiter({max:60,windowSeconds:60});
export async function GET(request:Request){return agriWallResponse(async()=>{
 z.object({}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
 const actorId=await agriWallActor(request);if(!reads.check(actorId).allowed)throw new AgriWorkspaceError('RATE_LIMITED',429);
 return readAgriWallMine(actorId);
});}
