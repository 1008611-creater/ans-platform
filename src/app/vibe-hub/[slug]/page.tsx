import terms from "../terms.json";
import VibeHubTermClient from "../term-client";
export function generateStaticParams(){return terms.map(t=>({slug:t.slug}));}
export default async function VibeHubTerm({params}:{params:Promise<{slug:string}>}){const {slug}=await params; const index=terms.findIndex(t=>t.slug===slug); const term=terms[index]; if(!term)return <main className="p-10">Not found</main>; return <VibeHubTermClient term={term} previous={terms[(index-1+terms.length)%terms.length]} next={terms[(index+1)%terms.length]} />}
