import TermPage, { generateMetadata as termMetadata } from "../[slug]/page";
type Props={searchParams:Promise<{lang?:string}>};
export default function SkillTerm(props:Props){return TermPage({...props,params:Promise.resolve({slug:"skill"})});}
export function generateMetadata(props:Props){return termMetadata({...props,params:Promise.resolve({slug:"skill"})});}
