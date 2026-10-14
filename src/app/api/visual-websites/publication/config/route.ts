import { publicationConfig } from "@/server/visual-portfolio/publication";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({ok:true,data:publicationConfig()},{headers:{"cache-control":"no-store"}});}
