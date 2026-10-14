import { generationConfig } from "@/server/visual-portfolio/jobs";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({ok:true,data:generationConfig()},{headers:{"cache-control":"no-store"}});}
