import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Catalog,type CatalogData } from "../../catalog-client";
import { readVibeData,languageParam } from "../../source-data";
type Props={params:Promise<{id:string}>;searchParams:Promise<{lang?:string;q?:string}>};
export async function generateMetadata({params,searchParams}:Props){const {id}=await params;const lang=languageParam((await searchParams).lang,await getLocale());const data=await readVibeData<CatalogData>("catalog.json");return {title:data?.topics.find(item=>item.slug===id)?.[lang].title||id,alternates:{canonical:`/vibe-hub/topics/${id}?lang=${lang}`}};}
export default async function Topic({params,searchParams}:Props){const {id}=await params;const query=await searchParams;const data=await readVibeData<CatalogData>("catalog.json");if(!data||!data.topics.some(item=>item.slug===id))notFound();return <Catalog key={`${id}:${query.q||""}`} data={data} initialTopic={id} initialQuery={query.q||""}/>;}
