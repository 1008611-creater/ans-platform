import { assertPublicationReader,publicWebsiteBytes } from "@/server/visual-portfolio/publication";
import { bindDomainSchema,publishWebsiteSchema } from "@/contracts/visual-generation";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 assertPublicationReader(request);const url=new URL(request.url);const hostname=url.searchParams.get("hostname"),slug=url.searchParams.get("slug");
 if(hostname)bindDomainSchema.shape.hostname.parse(hostname);else publishWebsiteSchema.shape.slug.parse(slug);
 return new Response(await publicWebsiteBytes(slug,hostname),{headers:{"content-type":"text/html;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"sandbox allow-scripts allow-popups; default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data: blob:; connect-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}catch{return new Response(null,{status:404,headers:{"cache-control":"no-store"}});}}
