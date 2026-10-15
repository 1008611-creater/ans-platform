import { workerResponse } from "@/server/visual-portfolio/http";
import { claimFourViewJob } from "@/server/visual-portfolio/four-view-jobs";
export async function POST(request:Request){return workerResponse(request,claimFourViewJob);}
