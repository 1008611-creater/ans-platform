import type { AgriScoreDimensions } from "@/contracts/agri-rankings";
export const AGRI_DIMENSION_WEIGHTS={innovation:30,technical:25,completeness:20,problem:15,fit:10} as const;
type Ballot={judgeId:string;dimensions:AgriScoreDimensions};
export interface AgriScoreFraction {numerator:bigint;denominator:bigint}
function judgeNumerator(dimensions:AgriScoreDimensions):number {return (Object.keys(AGRI_DIMENSION_WEIGHTS) as Array<keyof AgriScoreDimensions>).reduce((sum,key)=>sum+Math.round(dimensions[key]*100)*AGRI_DIMENSION_WEIGHTS[key],0);}
export function agriJudgeTotal(dimensions:AgriScoreDimensions):number {return judgeNumerator(dimensions)/10000;}
function professionalFraction(stage:"PRELIMINARY"|"FINAL",scores:Ballot[]):AgriScoreFraction|null {
 const required=stage==="PRELIMINARY"?3:7;
 if(scores.length!==required||new Set(scores.map(s=>s.judgeId)).size!==required)return null;
 const totals=scores.map(s=>judgeNumerator(s.dimensions)).sort((a,b)=>a-b);
 const retained=stage==="FINAL"?totals.slice(1,-1):totals;
 return {numerator:BigInt(retained.reduce((sum,value)=>sum+value,0)),denominator:BigInt(retained.length*10000)};
}
export function agriProfessionalScore(stage:"PRELIMINARY"|"FINAL",scores:Ballot[]):number|null {const value=professionalFraction(stage,scores);return value?Number(value.numerator)/Number(value.denominator):null;}
export function agriPublicScore(votes:number,maxVotes:number):number{return maxVotes===0?0:100*votes/maxVotes;}
/** Exact rational comparisons prevent mathematically tied results splitting at floating-point precision. */
export function agriRankingFraction(stage:"PRELIMINARY"|"FINAL",scores:Ballot[],votes:number,maxVotes:number):AgriScoreFraction|null {
 const professional=professionalFraction(stage,scores);if(!professional)return null;if(stage==="FINAL")return professional;
 if(maxVotes===0)return {numerator:professional.numerator*BigInt(4),denominator:professional.denominator*BigInt(5)};
 return {numerator:professional.numerator*BigInt(4)*BigInt(maxVotes)+BigInt(votes)*BigInt(100)*professional.denominator,denominator:professional.denominator*BigInt(5)*BigInt(maxVotes)};
}
export function agriCompareFractions(a:AgriScoreFraction,b:AgriScoreFraction):number{const difference=a.numerator*b.denominator-b.numerator*a.denominator;return difference>BigInt(0)?1:difference<BigInt(0)?-1:0;}
/** Rank by exact values when provided. Equal results remain tied for organizer confirmation. */
export function agriRankTotals<T extends {totalScore:number|null}>(items:T[],compare?:(a:T,b:T)=>number):Array<T&{rank:number|null}> {
 const comparison=compare??((a:T,b:T)=>(a.totalScore??-1)-(b.totalScore??-1));
 const sorted=[...items].sort((a,b)=>comparison(b,a));
 return sorted.map(item=>({...item,rank:item.totalScore===null?null:1+sorted.filter(other=>other.totalScore!==null&&comparison(other,item)>0).length}));
}
/** An explicit order can resolve ties, but can never reverse a strictly higher result. */
export function agriValidateConfirmedOrder<T extends {entryStageId:string;totalScore:number|null}>(items:T[],orderedIds:string[],limit:number,compare?:(a:T,b:T)=>number):boolean {
 if(new Set(orderedIds).size!==orderedIds.length||orderedIds.length!==Math.min(limit,items.length))return false;
 const byId=new Map(items.map(item=>[item.entryStageId,item]));
 if(orderedIds.some(id=>!byId.has(id)||byId.get(id)!.totalScore===null))return false;
 const comparison=compare??((a:T,b:T)=>(a.totalScore??-1)-(b.totalScore??-1));
 const selected=orderedIds.map(id=>byId.get(id)!);
 if(selected.some((item,index)=>index>0&&comparison(item,selected[index-1])>0))return false;
 const omitted=items.filter(item=>!orderedIds.includes(item.entryStageId));
 const boundary=selected[selected.length-1];if(!boundary)return items.length===0;
 return !omitted.some(item=>item.totalScore===null||comparison(item,boundary)>0);
}
